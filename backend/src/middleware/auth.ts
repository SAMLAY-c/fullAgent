import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

// 扩展 Express Request 类型以包含 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        username: string;
        role: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    console.log('[authMiddleware] Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[authMiddleware] Missing or invalid Bearer token');
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少认证令牌',
          numeric_code: 401
        }
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    console.log('[authMiddleware] Token extracted:', token.substring(0, 20) + '...');

    try {
      const payload = authService.verifyAccessToken(token);
      console.log('[authMiddleware] Token verified, user:', payload);
      req.user = payload;
      next();
    } catch (error) {
      console.log('[authMiddleware] Token verification failed:', error);
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token 无效或已过期',
          numeric_code: 401
        }
      });
    }
  } catch (error) {
    console.log('[authMiddleware] Unexpected error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        numeric_code: 500
      }
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = authService.verifyAccessToken(token);
        req.user = payload;
      } catch {
        // Token 无效，继续但不设置用户
      }
    }
    next();
  } catch (error) {
    next();
  }
}
