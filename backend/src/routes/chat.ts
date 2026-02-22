import { Router, Request, Response } from 'express';
import chatService from '../services/chat.service';
import conversationDeletionService from '../services/conversation-deletion.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

router.use(authMiddleware);

router.get('/conversations', async (req: Request, res: Response) => {
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

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const botId = (req.body.bot_id || '').toString().trim();
    const folderIdRaw = typeof req.body.folder_id === 'string' ? req.body.folder_id : '';
    const folderId = folderIdRaw.trim() || undefined;
    const title = typeof req.body.title === 'string' ? req.body.title : '';
    const extraContext = typeof req.body.extra_context === 'string' ? req.body.extra_context : '';
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

router.patch('/conversations/:conversation_id', async (req: Request, res: Response) => {
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

router.get('/conversations/deleted', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const botId = firstString(req.query.bot_id);
    const conversations = await conversationDeletionService.listDeletedConversations(userId, botId);
    return res.json({ conversations });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list deleted conversations',
        numeric_code: 500
      }
    });
  }
});

router.delete('/conversations/:conversation_id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const conversationId = firstString(req.params.conversation_id) || '';
    const reason = (req.body?.reason || 'user_deleted').toString().trim() || 'user_deleted';
    const result = await conversationDeletionService.softDeleteConversation(userId, conversationId, reason);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    const statusCode = message === 'CONVERSATION_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Conversation not found' : message,
        numeric_code: statusCode
      }
    });
  }
});

router.post('/conversations/:conversation_id/restore', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const conversationId = firstString(req.params.conversation_id) || '';
    const result = await conversationDeletionService.restoreConversation(userId, conversationId);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore conversation';
    const statusCode = message === 'CONVERSATION_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Conversation not found' : message,
        numeric_code: statusCode
      }
    });
  }
});

router.delete('/conversations/:conversation_id/permanent', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const isAdmin = req.user?.role === 'admin';
    const conversationId = firstString(req.params.conversation_id) || '';
    const result = await conversationDeletionService.hardDeleteConversation(userId, conversationId, isAdmin);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to permanently delete conversation';
    const statusCode = message === 'CONVERSATION_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Conversation not found' : message,
        numeric_code: statusCode
      }
    });
  }
});

router.get('/conversations/:conversation_id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const conversationId = firstString(req.params.conversation_id) || '';
    const limitRaw = firstString(req.query.limit);
    const limit = limitRaw ? parseInt(limitRaw, 10) : 100;
    const messages = await chatService.listMessages(userId, conversationId, Number.isNaN(limit) ? 100 : limit);
    return res.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list messages';
    const statusCode = message === 'CONVERSATION_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Conversation not found' : message,
        numeric_code: statusCode
      }
    });
  }
});

router.post('/conversations/:conversation_id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const conversationId = firstString(req.params.conversation_id) || '';
    const content = (req.body.content || '').toString();
    const memory_ids = Array.isArray(req.body.memory_ids)
      ? req.body.memory_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (!content.trim()) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'content is required', numeric_code: 400 }
      });
    }

    const result = await chatService.sendMessage(userId, conversationId, content, memory_ids);
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    const statusCode = message === 'CONVERSATION_NOT_FOUND' ? 404 : message === 'EMPTY_MESSAGE' ? 400 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Conversation not found' : statusCode === 400 ? 'content is required' : message,
        numeric_code: statusCode
      }
    });
  }
});

export default router;
