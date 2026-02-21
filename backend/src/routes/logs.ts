import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import botMemoryArchiveService from '../services/bot-memory-archive.service';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function readInt(value: unknown, defaultValue: number): number {
  const raw = typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isNaN(raw) ? defaultValue : raw;
}

function parseDate(value: unknown, endOfDay = false): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  const iso = raw.length <= 10
    ? `${raw}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : raw;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.split('"').join('""')}"`;
}

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, readInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, readInt(req.query.page_size, 20)));
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id : undefined;
    const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const startDate = parseDate(req.query.start_date, false);
    const endDate = parseDate(req.query.end_date, true);

    const where: any = {};
    if (botId) where.bot_id = botId;
    if (topic) where.title = { contains: topic, mode: 'insensitive' };
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    if (startDate || endDate) {
      where.updated_at = {};
      if (startDate) where.updated_at.gte = startDate;
      if (endDate) where.updated_at.lte = endDate;
    }

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
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id : undefined;
    const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
    const content = typeof req.query.content === 'string' ? req.query.content.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const startDate = parseDate(req.query.start_date, false);
    const endDate = parseDate(req.query.end_date, true);

    const where: any = {};
    if (conversationId) where.conversation_id = conversationId;
    if (senderType) where.sender_type = senderType;
    if (botId || topic) {
      where.conversation = {};
      if (botId) where.conversation.bot_id = botId;
      if (topic) where.conversation.title = { contains: topic, mode: 'insensitive' };
    }
    const contentSearch = content || search;
    if (contentSearch) where.content = { contains: contentSearch, mode: 'insensitive' };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

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

router.get('/export/messages.csv', async (req: Request, res: Response) => {
  try {
    const conversationId =
      typeof req.query.conversation_id === 'string' ? req.query.conversation_id.trim() : '';
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id : undefined;
    const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
    const content = typeof req.query.content === 'string' ? req.query.content.trim() : '';
    const startDate = parseDate(req.query.start_date, false);
    const endDate = parseDate(req.query.end_date, true);

    const where: any = {};
    if (conversationId) {
      where.conversation_id = conversationId;
    }
    if (botId || topic) {
      where.conversation = {};
      if (botId) where.conversation.bot_id = botId;
      if (topic) where.conversation.title = { contains: topic, mode: 'insensitive' };
    }
    if (content) where.content = { contains: content, mode: 'insensitive' };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const items = await prisma.message.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 5000,
      include: {
        conversation: {
          select: {
            conversation_id: true,
            title: true,
            bot: { select: { bot_id: true, name: true } },
            user: { select: { user_id: true, username: true } }
          }
        }
      }
    });

    const header = [
      'timestamp',
      'bot_id',
      'bot_name',
      'conversation_id',
      'topic',
      'sender_type',
      'user',
      'content'
    ].join(',');

    const rows = items.map((item) => ([
      csvEscape(item.timestamp.toISOString()),
      csvEscape(item.conversation?.bot?.bot_id || ''),
      csvEscape(item.conversation?.bot?.name || ''),
      csvEscape(item.conversation_id),
      csvEscape(item.conversation?.title || ''),
      csvEscape(item.sender_type),
      csvEscape(item.conversation?.user?.username || ''),
      csvEscape(item.content)
    ].join(',')));

    const csv = [header, ...rows].join('\n');
    const fileName = `conversation-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export csv',
        numeric_code: 500
      }
    });
  }
});

router.get('/bot-memory', async (req: Request, res: Response) => {
  try {
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id.trim() : '';
    const limit = Math.max(1, Math.min(5000, readInt(req.query.limit, 200)));
    if (!botId) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'bot_id is required', numeric_code: 400 }
      });
    }

    const records = await botMemoryArchiveService.listByBot(botId, limit);
    return res.json({ bot_id: botId, total: records.length, records });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get bot memory logs',
        numeric_code: 500
      }
    });
  }
});

router.get('/bot-memory/export', async (req: Request, res: Response) => {
  try {
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id.trim() : '';
    if (!botId) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'bot_id is required', numeric_code: 400 }
      });
    }

    const payload = await botMemoryArchiveService.exportByBot(botId);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export bot memory logs',
        numeric_code: 500
      }
    });
  }
});

router.get('/bot-memory/analysis', async (req: Request, res: Response) => {
  try {
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id.trim() : '';
    if (!botId) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'bot_id is required', numeric_code: 400 }
      });
    }
    const result = await botMemoryArchiveService.analyzeByBot(botId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze bot memory logs',
        numeric_code: 500
      }
    });
  }
});

export default router;
