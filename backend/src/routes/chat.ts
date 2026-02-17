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

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', numeric_code: 401 }
      });
    }

    const botId = firstString(req.query.bot_id);
    const conversations = await chatService.listConversations(userId, botId);
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
    const title = (req.body.title || '').toString().trim();
    if (!botId || !title) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'bot_id and title are required', numeric_code: 400 }
      });
    }

    const conversation = await chatService.createConversation(userId, botId, title);
    return res.status(201).json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    const statusCode = message === 'BOT_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: statusCode === 404 ? 'Bot not found' : message,
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
    if (!content.trim()) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'content is required', numeric_code: 400 }
      });
    }

    const result = await chatService.sendMessage(userId, conversationId, content);
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
