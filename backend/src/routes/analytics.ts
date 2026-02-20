import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/overview', async (_req, res: Response) => {
  try {
    const [botsTotal, botsOnline, conversationsTotal, messagesTotal, workflowsEnabled, groupsTotal] =
      await Promise.all([
        prisma.bot.count(),
        prisma.bot.count({ where: { status: 'online' } }),
        prisma.conversation.count(),
        prisma.message.count(),
        prisma.workflow.count({ where: { enabled: true } }),
        prisma.group.count()
      ]);

    res.json({
      bots: { total: botsTotal, online: botsOnline },
      conversations: { total: conversationsTotal },
      messages: { total: messagesTotal },
      workflows: { enabled: workflowsEnabled },
      groups: { total: groupsTotal },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load analytics overview',
        numeric_code: 500
      }
    });
  }
});

router.get('/trends', async (_req, res: Response) => {
  try {
    const days = 7;
    const today = new Date();
    const buckets: Array<{ date: string; conversations: number; messages: number }> = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [conversations, messages] = await Promise.all([
        prisma.conversation.count({
          where: { created_at: { gte: start, lt: end } }
        }),
        prisma.message.count({
          where: { timestamp: { gte: start, lt: end } }
        })
      ]);

      buckets.push({
        date: start.toISOString().slice(0, 10),
        conversations,
        messages
      });
    }

    res.json({ days, buckets, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load analytics trends',
        numeric_code: 500
      }
    });
  }
});

export default router;
