import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LoginRequest {
  username: string;
  password: string;
}

interface TokenPayload {
  user_id: string;
  username: string;
  role: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    user_id: string;
    username: string;
    email: string;
    avatar: string | null;
    role: string;
  };
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('密码错误');
    }

    const tokens = await this.generateTokens({
      user_id: user.user_id,
      username: user.username,
      role: user.role
    });

    return {
      ...tokens,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      console.log('[refreshToken] 开始验证 refresh token');
      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as { user_id: string };
      console.log('[refreshToken] Token 验证成功, user_id:', payload.user_id);

      const user = await prisma.user.findUnique({
        where: { user_id: payload.user_id }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证 refresh token 是否在数据库中
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      console.log('[refreshToken] 数据库中的 token:', storedToken ? {
        token: storedToken.token.substring(0, 20) + '...',
        revoked_at: storedToken.revoked_at,
        expires_at: storedToken.expires_at
      } : 'NOT FOUND');

      if (!storedToken || storedToken.revoked_at || storedToken.expires_at < new Date()) {
        console.log('[refreshToken] Token 无效或已过期，抛出错误');
        throw new Error('Refresh Token 无效或已过期');
      }

      console.log('[refreshToken] Token 有效，准备撤销并生成新 token');
      // 先撤销旧的 refresh token（在生成新 token 之前）
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revoked_at: new Date() }
      });
      console.log('[refreshToken] 旧 token 已撤销');

      // 生成新 tokens（现在不会再撤销当前这个已撤销的 token）
      const tokens = await this.generateTokens({
        user_id: user.user_id,
        username: user.username,
        role: user.role
      });
      console.log('[refreshToken] 新 tokens 已生成');

      return {
        ...tokens,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error('Refresh Token 无效或已过期');
    }
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        created_at: true
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return user;
  }

  async generateTokens(payload: TokenPayload) {
    const access_token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    const refresh_token = jwt.sign(
      { user_id: payload.user_id },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    // 存储 refresh token 到数据库
    // 先撤销该用户所有未撤销的旧 refresh tokens，避免重复
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await prisma.refreshToken.updateMany({
      where: {
        user_id: payload.user_id,
        revoked_at: null
      },
      data: {
        revoked_at: new Date()
      }
    });

    await prisma.refreshToken.create({
      data: {
        token: refresh_token,
        user_id: payload.user_id,
        expires_at: expiresAt
      }
    });

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 15 * 60 // 15分钟，单位：秒
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Token 无效或已过期');
    }
  }

  async logout(refreshToken: string) {
    // 撤销 refresh token
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked_at: new Date() }
    });
  }
}

export default new AuthService();
