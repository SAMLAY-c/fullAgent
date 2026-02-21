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

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, readInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, readInt(req.query.page_size, 50)));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updated_at: 'desc' },
        include: {
          members: {
            include: {
              bot: {
                select: {
                  bot_id: true,
                  name: true,
                  avatar: true,
                  scene: true,
                  status: true
                }
              }
            },
            orderBy: { priority: 'desc' }
          },
          _count: {
            select: {
              members: true,
              messages: true
            }
          }
        }
      }),
      prisma.group.count({ where })
    ]);

    res.json({ items, total, page, page_size: pageSize });
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

export default router;
