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

function uniqueStringArray(value: unknown): string[] {
  return Array.from(new Set(toStringArray(value)));
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

function normalizeExtractItems(raw: any): Array<{ text: string; category: string }> {
  const candidates = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const seen = new Set<string>();
  const result: Array<{ text: string; category: string }> = [];

  for (const item of candidates) {
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!text) continue;

    const dedupeKey = text.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const categoryRaw = typeof item?.category === 'string' ? item.category.trim() : '';
    const category = (categoryRaw || 'other').slice(0, 50);
    result.push({ text: text.slice(0, 500), category });
    if (result.length >= 20) break;
  }

  return result;
}

function fallbackExtractItemsFromText(text: string): Array<{ text: string; category: string }> {
  if (!text) return [];

  const bulletLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => ({ text: line.slice(0, 500), category: 'other' }));

  if (bulletLines.length > 0) return bulletLines;
  return [{ text: text.trim().slice(0, 500), category: 'other' }];
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

async function generateExtractItemsDraft(params: {
  conversationTitle: string;
  selectedMessages: Array<{ sender_type: string; content: string }>;
  selectedArchiveMemories: Array<{ title: string | null; summary: string | null; insight: string | null }>;
  focusNote?: string | null;
  model?: string;
}) {
  const systemPrompt = [
    '你是一个记忆提炼助手，从对话中提取关于用户的新增、有价值的信息条目。',
    '请严格输出 JSON，不要输出 markdown，不要输出解释。',
    'JSON schema: {"items":[{"text":"string","category":"string"}]}',
    '要求：',
    '1) 只提炼本次对话中值得长期记住的信息，优先用户本人信息、目标、偏好、约束、状态变化',
    '2) 参考已选归档记忆，避免重复提取已知内容',
    '3) 若用户提供“补充重点”，优先围绕该重点提炼',
    '4) items 控制在 1-10 条',
    '5) category 使用简短英文分类，如 goal/preference/career/emotion/fact/constraint/plan/other'
  ].join('\n');

  const selectedTranscript = buildTranscript(params.selectedMessages);
  const archiveMemoryText = params.selectedArchiveMemories.length
    ? params.selectedArchiveMemories
        .map((m, idx) => {
          const parts = [
            `#${idx + 1}`,
            m.title ? `标题：${m.title}` : '',
            m.summary ? `摘要：${m.summary}` : '',
            m.insight ? `洞察：${m.insight}` : ''
          ].filter(Boolean);
          return parts.join('\n');
        })
        .join('\n\n')
    : '（未选择归档记忆）';

  const userPrompt = [
    `当前话题：${params.conversationTitle || '未命名话题'}`,
    '',
    '以下是用户主动选择的归档记忆（作为背景参考，避免重复提取）：',
    archiveMemoryText,
    '',
    '以下是本次对话中用户选择纳入分析的消息：',
    selectedTranscript || '（无有效消息）',
    '',
    `用户补充重点（优先考虑）：${params.focusNote?.trim() || '（未填写）'}`,
    '',
    '请输出 JSON。'
  ].join('\n');

  const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];
  const botConfig: BotConfig = {
    model: params.model || undefined,
    temperature: 0.2,
    max_tokens: 1200,
    enable_thinking: false,
    system_prompt: systemPrompt
  };

  const responseText = await aiService.generateSimpleResponse(messages, botConfig);
  const maybeJson = extractFirstJsonObject(responseText || '');
  if (!maybeJson) {
    return {
      items: fallbackExtractItemsFromText(responseText || ''),
      raw: responseText,
      parsed: false
    };
  }

  try {
    const parsed = JSON.parse(maybeJson);
    const items = normalizeExtractItems(parsed);
    return {
      items: items.length ? items : fallbackExtractItemsFromText(responseText || ''),
      raw: responseText,
      parsed: true
    };
  } catch {
    return {
      items: fallbackExtractItemsFromText(responseText || ''),
      raw: responseText,
      parsed: false
    };
  }
}

function buildArchiveMemoryScopeWhere(conversation: { bot_id: string; folder_id: string | null }, userId: string) {
  return {
    conversation: {
      user_id: userId,
      bot_id: conversation.bot_id,
      is_deleted: false
    },
    ...(conversation.folder_id ? { folder_id: conversation.folder_id } : {})
  };
}

async function getOwnedConversationForExtraction(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: {
      conversation_id: conversationId,
      user_id: userId,
      is_deleted: false
    },
    select: {
      conversation_id: true,
      bot_id: true,
      folder_id: true,
      title: true,
      archived_count: true
    }
  });
}

// GET /api/memories/extract/context?conversation_id=xxx
router.get('/extract/context', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = trimOrNull(req.query.conversation_id);
    if (!conversationId) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    const conversation = await getOwnedConversationForExtraction(userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const [messages, archiveMemories] = await Promise.all([
      prisma.message.findMany({
        where: { conversation_id: conversationId },
        orderBy: { timestamp: 'asc' },
        select: {
          message_id: true,
          sender_type: true,
          content: true,
          timestamp: true
        }
      }),
      prisma.conversationArchiveMemory.findMany({
        where: buildArchiveMemoryScopeWhere(conversation, userId),
        orderBy: { created_at: 'desc' },
        take: 50,
        select: {
          memory_id: true,
          title: true,
          summary: true,
          insight: true,
          archive_index: true,
          created_at: true,
          conversation_id: true
        }
      })
    ]);

    return res.json({
      messages: messages
        .filter((m) => m.sender_type !== 'system')
        .map((m) => ({
          id: m.message_id,
          role: m.sender_type === 'user' ? 'user' : 'assistant',
          content: m.content,
          created_at: m.timestamp
        })),
      archive_memories: archiveMemories.map((m) => ({
        id: m.memory_id,
        title: m.title,
        summary: m.summary,
        insight: m.insight,
        archiveIndex: m.archive_index,
        archived_at: m.created_at,
        conversation_id: m.conversation_id
      })),
      meta: {
        conversation_id: conversation.conversation_id,
        folder_id: conversation.folder_id,
        bot_id: conversation.bot_id
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load extract context' });
  }
});

// POST /api/memories/extract/preview
router.post('/extract/preview', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = trimOrNull(req.body?.conversation_id);
    const model = trimOrNull(req.body?.model) || undefined;
    const focusNote = trimOrNull(req.body?.focus_note);
    const selectedMessageIds = uniqueStringArray(req.body?.selected_message_ids);
    const selectedArchiveMemoryIds = uniqueStringArray(req.body?.selected_archive_memory_ids ?? req.body?.selected_memory_ids);

    if (!conversationId) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }
    if (selectedMessageIds.length === 0) {
      return res.status(400).json({ error: 'selected_message_ids must contain at least one item' });
    }

    const conversation = await getOwnedConversationForExtraction(userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const selectedMessages = await prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        message_id: { in: selectedMessageIds }
      },
      orderBy: { timestamp: 'asc' },
      select: {
        message_id: true,
        sender_type: true,
        content: true,
        timestamp: true
      }
    });

    if (selectedMessages.length !== selectedMessageIds.length) {
      return res.status(400).json({ error: 'selected_message_ids contains invalid message ids' });
    }

    const selectedArchiveMemories = selectedArchiveMemoryIds.length
      ? await prisma.conversationArchiveMemory.findMany({
          where: {
            memory_id: { in: selectedArchiveMemoryIds },
            ...buildArchiveMemoryScopeWhere(conversation, userId)
          },
          select: {
            memory_id: true,
            title: true,
            summary: true,
            insight: true,
            archive_index: true,
            created_at: true
          }
        })
      : [];

    if (selectedArchiveMemories.length !== selectedArchiveMemoryIds.length) {
      return res.status(400).json({ error: 'selected_archive_memory_ids contains invalid memory ids' });
    }

    const draft = await generateExtractItemsDraft({
      conversationTitle: conversation.title || '未命名话题',
      selectedMessages,
      selectedArchiveMemories,
      focusNote,
      model
    });

    return res.json({
      success: true,
      items: draft.items,
      meta: {
        conversation_id: conversation.conversation_id,
        selected_message_count: selectedMessages.length,
        selected_archive_memory_count: selectedArchiveMemories.length,
        model: model || aiService.getCurrentModel(),
        parsed: draft.parsed
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate extract preview' });
  }
});

// POST /api/memories/extract/commit
router.post('/extract/commit', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = trimOrNull(req.body?.conversation_id);
    const folderId = trimOrNull(req.body?.folder_id);
    const focusNote = trimOrNull(req.body?.focus_note);
    const selectedMessageIds = uniqueStringArray(req.body?.selected_message_ids);
    const selectedArchiveMemoryIds = uniqueStringArray(req.body?.selected_archive_memory_ids ?? req.body?.selected_memory_ids);
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const items = normalizeExtractItems({ items: rawItems });

    if (!conversationId || !folderId) {
      return res.status(400).json({ error: 'conversation_id and folder_id are required' });
    }
    if (items.length === 0) {
      return res.status(400).json({ error: 'items must contain at least one valid item' });
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

    const conversation = await getOwnedConversationForExtraction(userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.folder_id && conversation.folder_id !== folderId) {
      return res.status(400).json({ error: 'conversation_id does not belong to folder_id' });
    }

    if (selectedMessageIds.length > 0) {
      const messageCount = await prisma.message.count({
        where: {
          conversation_id: conversationId,
          message_id: { in: selectedMessageIds }
        }
      });
      if (messageCount !== selectedMessageIds.length) {
        return res.status(400).json({ error: 'selected_message_ids contains invalid message ids' });
      }
    }

    if (selectedArchiveMemoryIds.length > 0) {
      const archiveCount = await prisma.conversationArchiveMemory.count({
        where: {
          memory_id: { in: selectedArchiveMemoryIds },
          ...buildArchiveMemoryScopeWhere(conversation, userId)
        }
      });
      if (archiveCount !== selectedArchiveMemoryIds.length) {
        return res.status(400).json({ error: 'selected_archive_memory_ids contains invalid memory ids' });
      }
    }

    const now = new Date();
    const archiveIndex = (conversation.archived_count || 0) + 1;

    const createdRows = await prisma.$transaction(async (tx) => {
      const rows = await Promise.all(
        items.map((item) =>
          tx.conversationArchiveMemory.create({
            data: {
              folder_id: folderId,
              conversation_id: conversationId,
              title: item.category,
              summary: item.text,
              insight: null,
              tags: {
                source_message_ids: selectedMessageIds,
                source_archive_memory_ids: selectedArchiveMemoryIds,
                focus_note: focusNote || '',
                extract_version: 1
              } as any,
              archive_index: archiveIndex
            }
          })
        )
      );

      await tx.conversation.update({
        where: { conversation_id: conversationId },
        data: {
          archived_count: archiveIndex,
          last_memory_archived_at: now
        } as any
      });

      return rows;
    });

    return res.json({
      success: true,
      archive_index: archiveIndex,
      saved_count: createdRows.length,
      archived_at: now,
      memories: createdRows.map((m) => ({
        id: m.memory_id,
        title: m.title,
        summary: m.summary,
        archiveIndex: m.archive_index,
        archived_at: m.created_at,
        conversation_id: m.conversation_id
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to commit extracted memories' });
  }
});

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
