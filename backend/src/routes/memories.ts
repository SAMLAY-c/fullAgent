import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import aiService, { type ChatMessage, type BotConfig } from '../services/ai.service';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function getUserId(req: Request): string | null {
  return req.user?.user_id || null;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v ? v : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildTranscript(messages: Array<{ sender_type: string; content: string }>): string {
  return messages
    .filter((m) => m.sender_type !== 'system')
    .map((m) => {
      const role = m.sender_type === 'user' ? '用户' : '助手';
      return `${role}: ${String(m.content || '').trim()}`;
    })
    .filter(Boolean)
    .join('\n');
}

function extractFirstJsonObject(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
}

function normalizeDraft(raw: any, fallbackTitle: string) {
  const title =
    typeof raw?.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : fallbackTitle;
  const summary =
    typeof raw?.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim()
      : '';
  const insight =
    typeof raw?.insight === 'string' && raw.insight.trim()
      ? raw.insight.trim()
      : '';
  const tags = toStringArray(raw?.tags).slice(0, 8);

  return { title, summary, insight, tags };
}

async function generateArchiveDraft(params: {
  conversationTitle: string;
  transcript: string;
  model?: string;
}) {
  const systemPrompt = [
    '你是一个对话归档助手，需要把对话整理成可复用的记忆草稿。',
    '请严格输出 JSON，不要输出 markdown，不要输出解释。',
    'JSON schema: {"title":"string","summary":"string","insight":"string","tags":["string"]}',
    '要求：',
    '1) summary 用中文，80-180字，概括事实与上下文',
    '2) insight 用中文，1-3条关键洞察合并成一段',
    '3) tags 为 2-6 个短标签',
    '4) title 简洁具体，适合后续检索'
  ].join('\n');

  const userPrompt = [
    `原始话题标题：${params.conversationTitle || '未命名话题'}`,
    '',
    '以下是对话记录：',
    params.transcript || '（无有效对话内容）'
  ].join('\n');

  const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];
  const botConfig: BotConfig = {
    model: params.model || undefined,
    temperature: 0.3,
    max_tokens: 800,
    enable_thinking: false,
    system_prompt: systemPrompt
  };

  const responseText = await aiService.generateSimpleResponse(messages, botConfig);
  const maybeJson = extractFirstJsonObject(responseText || '');
  if (!maybeJson) {
    return {
      ...normalizeDraft(
        {
          title: params.conversationTitle,
          summary: (params.transcript || '').slice(0, 160),
          insight: '',
          tags: []
        },
        params.conversationTitle || '未命名话题'
      ),
      raw: responseText,
      parsed: false
    };
  }

  try {
    const parsed = JSON.parse(maybeJson);
    return {
      ...normalizeDraft(parsed, params.conversationTitle || '未命名话题'),
      raw: responseText,
      parsed: true
    };
  } catch {
    return {
      ...normalizeDraft(
        {
          title: params.conversationTitle,
          summary: (params.transcript || '').slice(0, 160),
          insight: '',
          tags: []
        },
        params.conversationTitle || '未命名话题'
      ),
      raw: responseText,
      parsed: false
    };
  }
}

// POST /api/memories/preview
// Body: { conversation_id, model? }
// 用于归档前生成 AI 摘要/洞察/tags 草稿（支持前端指定模型）
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = trimOrNull(req.body?.conversation_id);
    const model = trimOrNull(req.body?.model) || undefined;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        is_deleted: false
      },
      select: {
        conversation_id: true,
        title: true,
        folder_id: true
      }
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { timestamp: 'asc' },
      take: 60,
      select: {
        sender_type: true,
        content: true,
        timestamp: true
      }
    });

    const transcript = buildTranscript(messages);
    const draft = await generateArchiveDraft({
      conversationTitle: conversation.title || '未命名话题',
      transcript,
      model
    });

    return res.json({
      success: true,
      draft: {
        title: draft.title,
        summary: draft.summary,
        insight: draft.insight,
        tags: draft.tags
      },
      meta: {
        conversation_id: conversation.conversation_id,
        folder_id: conversation.folder_id,
        message_count: messages.length,
        model: model || aiService.getCurrentModel(),
        parsed: draft.parsed
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate memory preview' });
  }
});

// POST /api/memories
// 归档（追加式）
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = trimOrNull(req.body?.conversation_id);
    const folderId = trimOrNull(req.body?.folder_id);
    const title = trimOrNull(req.body?.title);
    const summary = trimOrNull(req.body?.summary);
    const insight = trimOrNull(req.body?.insight);
    const tags = toStringArray(req.body?.tags);

    if (!conversationId || !folderId) {
      return res.status(400).json({ error: 'conversation_id and folder_id are required' });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        folder_id: folderId,
        user_id: userId,
        is_deleted: false
      },
      select: { folder_id: true }
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        is_deleted: false
      },
      select: {
        conversation_id: true,
        archived_count: true,
        folder_id: true
      }
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.folder_id && conversation.folder_id !== folderId) {
      return res.status(400).json({ error: 'conversation_id does not belong to folder_id' });
    }

    const archiveIndex = (conversation.archived_count || 0) + 1;

    const [memory] = await prisma.$transaction([
      prisma.conversationArchiveMemory.create({
        data: {
          folder_id: folderId,
          conversation_id: conversationId,
          title,
          summary,
          insight,
          tags,
          archive_index: archiveIndex
        }
      }),
      prisma.conversation.update({
        where: { conversation_id: conversationId },
        data: { archived_count: archiveIndex }
      })
    ]);

    return res.json({
      success: true,
      memory: {
        id: memory.memory_id,
        title: memory.title,
        summary: memory.summary,
        insight: memory.insight,
        tags: memory.tags,
        archiveIndex: memory.archive_index,
        archived_at: memory.created_at,
        conversation_id: memory.conversation_id
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to archive memory' });
  }
});

// GET /api/memories?folder_id=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const folderId = trimOrNull(req.query.folder_id);
    if (!folderId) {
      return res.status(400).json({ error: 'folder_id is required' });
    }

    const folder = await prisma.folder.findFirst({
      where: { folder_id: folderId, user_id: userId, is_deleted: false },
      select: { folder_id: true }
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const memories = await prisma.conversationArchiveMemory.findMany({
      where: { folder_id: folderId },
      orderBy: { created_at: 'desc' },
      select: {
        memory_id: true,
        title: true,
        summary: true,
        insight: true,
        tags: true,
        archive_index: true,
        created_at: true,
        conversation_id: true
      }
    });

    const result = memories.map((m) => ({
      id: m.memory_id,
      title: m.title,
      summary: m.summary,
      insight: m.insight,
      tags: m.tags,
      archiveIndex: m.archive_index,
      archived_at: m.created_at,
      conversation_id: m.conversation_id,
      summaryPreview: m.summary
        ? `${m.summary.slice(0, 50)}${m.summary.length > 50 ? '...' : ''}`
        : ''
    }));

    return res.json({ memories: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list memories' });
  }
});

export default router;
