import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
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

  // 测试模式用户（数据库不可用时使用）
  private readonly TEST_USERS = {
    admin: {
      user_id: 'test_admin_001',
      username: 'admin',
      email: 'admin@bot-agent.local',
      password: 'admin123',
      role: 'admin',
      avatar: null
    }
  };

  private isDatabaseError(error: any): boolean {
    const errorMsg = error?.message || '';
    return errorMsg.includes('Can\'t reach database') ||
           errorMsg.includes('ECONNREFUSED') ||
           error?.code === 'P1001';
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
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
    } catch (error: any) {
      // 数据库不可用时，尝试使用测试账号
      if (this.isDatabaseError(error)) {
        console.warn('⚠️  Database unavailable, using test mode');

        const testUser = this.TEST_USERS[data.username as keyof typeof this.TEST_USERS];
        if (testUser && testUser.password === data.password) {
          console.log(`✅ Test user login: ${testUser.username}`);

          const tokens = this.generateTokensWithoutDb({
            user_id: testUser.user_id,
            username: testUser.username,
            role: testUser.role
          });

          return {
            ...tokens,
            user: {
              user_id: testUser.user_id,
              username: testUser.username,
              email: testUser.email,
              avatar: testUser.avatar,
              role: testUser.role
            }
          };
        }

        throw new Error('用户名或密码错误（测试模式：使用 admin/admin123）');
      }

      throw error;
    }
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
    } catch (error: any) {
      // 数据库不可用时，检查是否是测试用户
      if (this.isDatabaseError(error)) {
        console.warn('⚠️  Database unavailable, using test mode for refresh');

        try {
          const payload = jwt.verify(refreshToken, this.JWT_SECRET) as TokenPayload;

          // 检查是否是测试用户
          const testUser = Object.values(this.TEST_USERS).find(u => u.user_id === payload.user_id);
          if (testUser) {
            const tokens = this.generateTokensWithoutDb(payload);
            return {
              ...tokens,
              user: {
                user_id: testUser.user_id,
                username: testUser.username,
                email: testUser.email,
                avatar: testUser.avatar,
                role: testUser.role
              }
            };
          }
        } catch (jwtError) {
          // JWT 验证失败
        }

        throw new Error('Refresh Token 无效或已过期');
      }

      throw new Error('Refresh Token 无效或已过期');
    }
  }

  async getCurrentUser(userId: string) {
    try {
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
    } catch (error: any) {
      // 数据库不可用时，检查是否是测试用户
      if (this.isDatabaseError(error)) {
        const testUser = Object.values(this.TEST_USERS).find(u => u.user_id === userId);
        if (testUser) {
          return {
            user_id: testUser.user_id,
            username: testUser.username,
            email: testUser.email,
            avatar: testUser.avatar,
            role: testUser.role,
            created_at: new Date()
          };
        }
      }

      throw new Error('用户不存在');
    }
  }

  async generateTokens(payload: TokenPayload) {
    const access_token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    const refresh_token = jwt.sign(
      {
        user_id: payload.user_id,
        jti: randomUUID()
      },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    // 存储 refresh token 到数据库
    try {
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
    } catch (error) {
      console.warn('⚠️  Failed to store refresh token in database (test mode)');
    }

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 15 * 60 // 15分钟，单位：秒
    };
  }

  // 测试模式：生成 token 但不存储到数据库
  generateTokensWithoutDb(payload: TokenPayload) {
    const access_token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    const refresh_token = jwt.sign(
      {
        user_id: payload.user_id,
        jti: randomUUID()
      },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 15 * 60
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
    try {
      // 撤销 refresh token
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked_at: new Date() }
      });
    } catch (error: any) {
      // 数据库不可用时忽略错误（测试模式）
      if (this.isDatabaseError(error)) {
        console.warn('⚠️  Database unavailable, logout in test mode');
        return;
      }
      throw error;
    }
  }
}

export default new AuthService();
