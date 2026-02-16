import { Router, Response } from 'express';
import botService from '../services/bot.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 所有 Bot 路由都需要认证
router.use(authMiddleware);

// GET /bots - 获取 Bot 列表
router.get('/', async (req, res: Response) => {
  try {
    const { type, status, scene, page, page_size } = req.query;

    const filters: any = {};
    if (type) filters.type = type as string;
    if (status) filters.status = status as string;
    if (scene) filters.scene = scene as string;
    if (page) filters.page = parseInt(page as string);
    if (page_size) filters.page_size = parseInt(page_size as string);

    const result = await botService.getBots(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '获取 Bot 列表失败',
        numeric_code: 500
      }
    });
  }
});

// GET /bots/:bot_id - 获取 Bot 详情
router.get('/:bot_id', async (req, res: Response) => {
  try {
    const { bot_id } = req.params;
    const bot = await botService.getBotById(bot_id);
    res.json(bot);
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取 Bot 详情失败';
    const statusCode = message === 'Bot 不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// POST /bots - 创建 Bot
router.post('/', async (req, res: Response) => {
  try {
    const bot = await botService.createBot(req.body);
    res.status(201).json(bot);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建 Bot 失败',
        numeric_code: 500
      }
    });
  }
});

// PUT /bots/:bot_id - 更新 Bot
router.put('/:bot_id', async (req, res: Response) => {
  try {
    const { bot_id } = req.params;
    const bot = await botService.updateBot(bot_id, req.body);
    res.json(bot);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新 Bot 失败';
    const statusCode = message === 'Bot 不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// DELETE /bots/:bot_id - 删除 Bot
router.delete('/:bot_id', async (req, res: Response) => {
  try {
    const { bot_id } = req.params;
    const result = await botService.deleteBot(bot_id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除 Bot 失败';
    const statusCode = message === 'Bot 不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// PUT /bots/:bot_id/status - 更新 Bot 状态
router.put('/:bot_id/status', async (req, res: Response) => {
  try {
    const { bot_id } = req.params;
    const { status } = req.body;

    if (!['online', 'offline', 'suspended'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: '无效的状态值',
          numeric_code: 400
        }
      });
    }

    const bot = await botService.updateBotStatus(bot_id, status);
    res.json(bot);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新 Bot 状态失败';
    const statusCode = message === 'Bot 不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// GET /bots/:bot_id/conversations - 获取 Bot 对话历史
router.get('/:bot_id/conversations', async (req, res: Response) => {
  try {
    const { bot_id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const conversations = await botService.getBotConversations(bot_id, limit);
    res.json(conversations);
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取对话历史失败';
    const statusCode = message === 'Bot 不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

export default router;
