import { Router, Request, Response } from 'express';
import groupService from '../services/group.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

function readInt(value: unknown, defaultValue: number): number {
  const raw = typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isNaN(raw) ? defaultValue : raw;
}

// GET /groups - 获取群组列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, readInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, readInt(req.query.page_size, 50)));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const result = await groupService.getGroups({ page, page_size: pageSize, search });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list groups',
        numeric_code: 500
      }
    });
  }
});

// GET /groups/:group_id - 获取群组详情
router.get('/:group_id', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray((Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id)) ? (Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id)[0] : (Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id);
    const group = await groupService.getGroupById(group_id);
    res.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取群组详情失败';
    const statusCode = message === '群组不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// POST /groups - 创建群组
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, description, routing_strategy, conversation_mode } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: '群组名称不能为空',
          numeric_code: 400
        }
      });
    }

    const group = await groupService.createGroup({
      name: name.trim(),
      type: type || 'personal',
      description: description || '',
      routing_strategy: routing_strategy || 'ai_judge',
      conversation_mode: conversation_mode || 'multi_turn',
      created_by: (req as any).user?.user_id || 'system'
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '创建群组失败',
        numeric_code: 500
      }
    });
  }
});

// PUT /groups/:group_id - 更新群组
router.put('/:group_id', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id;
    const { name, type, description, routing_strategy, conversation_mode } = req.body || {};

    const group = await groupService.updateGroup(group_id, {
      name: name || undefined,
      type: type || undefined,
      description: description || undefined,
      routing_strategy: routing_strategy || undefined,
      conversation_mode: conversation_mode || undefined
    });

    res.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新群组失败';
    const statusCode = message === '群组不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// DELETE /groups/:group_id - 删除群组
router.delete('/:group_id', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id;
    const result = await groupService.deleteGroup(group_id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除群组失败';
    const statusCode = message === '群组不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// GET /groups/:group_id/members - 获取群组成员列表
router.get('/:group_id/members', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id;
    const members = await groupService.getGroupMembers(group_id);
    res.json({ members });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '获取成员列表失败',
        numeric_code: 500
      }
    });
  }
});

// POST /groups/:group_id/members - 添加群组成员
router.post('/:group_id/members', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id;
    const { bot_id, role, permissions, trigger_keywords, priority } = req.body || {};

    if (!bot_id) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'bot_id 不能为空',
          numeric_code: 400
        }
      });
    }

    const member = await groupService.addMember(group_id, {
      bot_id,
      role: role || null,
      permissions: permissions || undefined,
      trigger_keywords: trigger_keywords || [],
      priority: priority || 0
    });

    res.status(201).json(member);
  } catch (error) {
    const message = error instanceof Error ? error.message : '添加成员失败';
    const statusCode = message === '群组不存在' || message === 'Bot不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// PUT /groups/:group_id/members/:member_id - 更新群组成员
router.put('/:group_id/members/:member_id', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id;
    const member_id = Array.isArray(req.params.member_id) ? req.params.member_id[0] : req.params.member_id;
    const { role, permissions, trigger_keywords, priority } = req.body || {};

    const member = await groupService.updateMember(group_id, member_id, {
      role: role || undefined,
      permissions: permissions || undefined,
      trigger_keywords: trigger_keywords !== undefined ? trigger_keywords : undefined,
      priority: priority !== undefined ? priority : undefined
    });

    res.json(member);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新成员失败';
    const statusCode = message === '群成员不存在' ? 404 : 500;

    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message,
        numeric_code: statusCode
      }
    });
  }
});

// DELETE /groups/:group_id/members/:member_id - 删除群组成员
router.delete('/:group_id/members/:member_id', async (req: Request, res: Response) => {
  try {
    const group_id = Array.isArray(req.params.group_id) ? req.params.group_id[0] : req.params.group_id;
    const member_id = Array.isArray(req.params.member_id) ? req.params.member_id[0] : req.params.member_id;
    const result = await groupService.removeMember(group_id, member_id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除成员失败';
    const statusCode = message === '群成员不存在' ? 404 : 500;

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
