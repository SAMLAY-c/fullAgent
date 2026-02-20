import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/files', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size || 20)));
    const botId = typeof req.query.bot_id === 'string' ? req.query.bot_id : undefined;

    const where = botId ? { bot_id: botId } : {};
    const [items, total] = await Promise.all([
      prisma.knowledgeFile.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { _count: { select: { chunks: true } } }
      }),
      prisma.knowledgeFile.count({ where })
    ]);

    res.json({ items, total, page, page_size: pageSize });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load knowledge files',
        numeric_code: 500
      }
    });
  }
});

router.delete('/files/:file_id', async (req: Request, res: Response) => {
  try {
    const fileId = Array.isArray(req.params.file_id) ? req.params.file_id[0] : req.params.file_id;
    if (!fileId) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'file_id is required',
          numeric_code: 400
        }
      });
    }
    await prisma.knowledgeFile.delete({ where: { file_id: fileId } });
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete knowledge file';
    const statusCode = message.includes('Record to delete does not exist') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Knowledge file not found' : message,
        numeric_code: statusCode
      }
    });
  }
});

export default router;
