import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function readInt(value: unknown, defaultValue: number): number {
  const raw = typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isNaN(raw) ? defaultValue : raw;
}

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, readInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, readInt(req.query.page_size, 20)));
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: any = {};
    if (botId) where.bot_id = botId;
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }];

    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updated_at: 'desc' },
        include: {
          bot: { select: { bot_id: true, name: true, scene: true } },
          user: { select: { user_id: true, username: true } },
          _count: { select: { messages: true } }
        }
      }),
      prisma.conversation.count({ where })
    ]);

    res.json({ items, total, page, page_size: pageSize });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list conversation logs',
        numeric_code: 500
      }
    });
  }
});

router.get('/messages', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, readInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, readInt(req.query.page_size, 50)));
    const conversationId =
      typeof req.query.conversation_id === 'string' ? req.query.conversation_id : undefined;
    const senderType =
      typeof req.query.sender_type === 'string' ? req.query.sender_type : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: any = {};
    if (conversationId) where.conversation_id = conversationId;
    if (senderType) where.sender_type = senderType;
    if (search) where.content = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          conversation: {
            select: { conversation_id: true, title: true, bot: { select: { name: true } } }
          }
        }
      }),
      prisma.message.count({ where })
    ]);

    res.json({ items, total, page, page_size: pageSize });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list message logs',
        numeric_code: 500
      }
    });
  }
});

export default router;
