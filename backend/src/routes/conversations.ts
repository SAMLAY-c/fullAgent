import { Router, Request, Response } from 'express';
import chatService from '../services/chat.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const botId = firstString(req.query.bot_id);
    const folderIdRaw = firstString(req.query.folder_id);
    const folderId = folderIdRaw && folderIdRaw.trim() ? folderIdRaw.trim() : undefined;

    const conversations = await chatService.listConversations(userId, botId, folderId);
    return res.json({ conversations });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list conversations',
        numeric_code: 500
      }
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const botId = String(req.body?.bot_id || '').trim();
    const folderId = String(req.body?.folder_id || '').trim() || undefined;
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const extraContext = typeof req.body?.extra_context === 'string' ? req.body.extra_context : '';

    if (!botId) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'bot_id is required', numeric_code: 400 }
      });
    }

    const conversation = await chatService.createConversation(userId, botId, title, folderId, extraContext);
    return res.status(201).json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    const statusCode = message === 'BOT_NOT_FOUND' || message === 'FOLDER_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message:
          statusCode === 404
            ? (message === 'FOLDER_NOT_FOUND' ? 'Folder not found' : 'Bot not found')
            : message,
        numeric_code: statusCode
      }
    });
  }
});

router.patch('/:conversation_id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const conversationId = firstString(req.params.conversation_id) || '';
    const payload: { title?: string; extra_context?: string } = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'title')) {
      payload.title = typeof req.body.title === 'string' ? req.body.title : '';
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'extra_context')) {
      payload.extra_context = typeof req.body.extra_context === 'string' ? req.body.extra_context : '';
    }

    const conversation = await chatService.updateConversation(userId, conversationId, payload);
    return res.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update conversation';
    const statusCode =
      message === 'CONVERSATION_NOT_FOUND' ? 404 : message === 'NO_UPDATABLE_FIELDS' ? 400 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
        message:
          statusCode === 404
            ? 'Conversation not found'
            : statusCode === 400
              ? 'No updatable fields provided'
              : message,
        numeric_code: statusCode
      }
    });
  }
});

export default router;
