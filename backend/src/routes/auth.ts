import { Router, Request, Response } from 'express';
import authService from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /auth/login - 用户登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: '用户名和密码不能为空',
          numeric_code: 400
        }
      });
    }

    const result = await authService.login({ username, password });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败';
    const statusCode = message === '用户不存在' || message === '密码错误' ? 401 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// POST /auth/refresh - 刷新 Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'refresh_token 不能为空',
          numeric_code: 400
        }
      });
    }

    const result = await authService.refreshToken(refresh_token);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Refresh Token 无效',
        numeric_code: 401
      }
    });
  }
});

// GET /auth/me - 获取当前用户信息
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    // authMiddleware 确保 req.user 存在
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权',
          numeric_code: 401
        }
      });
    }

    const user = await authService.getCurrentUser(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '获取用户信息失败',
        numeric_code: 500
      }
    });
  }
});

// POST /auth/logout - 退出登录
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      await authService.logout(refresh_token);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '退出登录失败',
        numeric_code: 500
      }
    });
  }
});

export default router;
