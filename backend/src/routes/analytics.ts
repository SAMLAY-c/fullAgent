import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import aiService, { type ChatMessage } from '../services/ai.service';

const router = Router();
const prisma = new PrismaClient();
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.2';

router.use(authMiddleware);

function parseDate(value: unknown, endOfDay = false): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  const iso = raw.length <= 10
    ? `${raw}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : raw;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function inferKnowledgeType(filename: string): 'text' | 'pdf' | 'image' | 'drawing' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return 'image';
  if (lower.endsWith('.svg') || lower.endsWith('.psd') || lower.endsWith('.ai')) return 'drawing';
  return 'text';
}

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

router.post('/ai-analysis', async (req, res: Response) => {
  try {
    const botId = typeof req.body?.bot_id === 'string' ? req.body.bot_id.trim() : '';
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const startDate = parseDate(req.body?.start_date, false);
    const endDate = parseDate(req.body?.end_date, true);
    const model = typeof req.body?.model === 'string' && req.body.model.trim()
      ? req.body.model.trim()
      : DEFAULT_MODEL;
    const systemPrompt = typeof req.body?.system_prompt === 'string' && req.body.system_prompt.trim()
      ? req.body.system_prompt.trim()
      : '你是运营分析助手。请基于给定对话与知识信息，输出中文分析：总体结论、主要主题、风险点、优化建议。';
    const customPrompt = typeof req.body?.analysis_prompt === 'string' ? req.body.analysis_prompt.trim() : '';
    const knowledgeTypesRaw = Array.isArray(req.body?.knowledge_types) ? req.body.knowledge_types : [];
    const knowledgeTypes = new Set(
      knowledgeTypesRaw
        .filter((x: unknown) => typeof x === 'string')
        .map((x: string) => x.trim().toLowerCase())
        .filter((x: string) => ['text', 'pdf', 'image', 'drawing'].includes(x))
    );

    const conversationWhere: any = {};
    if (botId) conversationWhere.bot_id = botId;
    if (topic) conversationWhere.title = { contains: topic, mode: 'insensitive' };
    if (startDate || endDate) {
      conversationWhere.updated_at = {};
      if (startDate) conversationWhere.updated_at.gte = startDate;
      if (endDate) conversationWhere.updated_at.lte = endDate;
    }

    const conversations = await prisma.conversation.findMany({
      where: conversationWhere,
      orderBy: { updated_at: 'desc' },
      take: 200,
      include: { bot: { select: { bot_id: true, name: true } } }
    });

    const conversationIds = conversations.map((x) => x.conversation_id);
    const messageWhere: any = {};
    if (conversationIds.length > 0) {
      messageWhere.conversation_id = { in: conversationIds };
    } else {
      messageWhere.conversation_id = { in: ['__none__'] };
    }
    if (content) {
      messageWhere.content = { contains: content, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      messageWhere.timestamp = {};
      if (startDate) messageWhere.timestamp.gte = startDate;
      if (endDate) messageWhere.timestamp.lte = endDate;
    }

    const messages = await prisma.message.findMany({
      where: messageWhere,
      orderBy: { timestamp: 'desc' },
      take: 300,
      include: { conversation: { select: { title: true, conversation_id: true } } }
    });

    const knowledgeFiles = await prisma.knowledgeFile.findMany({
      where: { status: 'ready' },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    const pickedKnowledgeFiles = knowledgeFiles.filter((file) => {
      if (knowledgeTypes.size === 0) return true;
      return knowledgeTypes.has(inferKnowledgeType(file.filename));
    });

    const fileIds = pickedKnowledgeFiles.map((f) => f.file_id);
    const knowledgeChunks = fileIds.length
      ? await prisma.knowledgeChunk.findMany({
          where: { file_id: { in: fileIds } },
          orderBy: { created_at: 'desc' },
          take: 120
        })
      : [];

    const messageLines = messages
      .slice(0, 200)
      .map((m) => `[${m.timestamp.toISOString()}][${m.sender_type}][${m.conversation?.title || '未命名'}] ${m.content}`)
      .join('\n');

    const knowledgeLines = pickedKnowledgeFiles
      .map((file) => {
        const type = inferKnowledgeType(file.filename);
        const chunks = knowledgeChunks.filter((c) => c.file_id === file.file_id).slice(0, 2);
        const chunkText = chunks.map((c) => c.content).join('\n').slice(0, 1200);
        return `文件: ${file.filename} | 类型: ${type}\n${chunkText || '[该文件暂无可解析文本，可能是图片/绘画/PDF未抽取文本]'}`;
      })
      .join('\n\n');

    const prompt = [
      '请基于以下数据分析并给出明确结论：',
      `筛选条件: bot_id=${botId || '全部'}, topic=${topic || '全部'}, content=${content || '全部'}, date=${startDate?.toISOString() || '-'}~${endDate?.toISOString() || '-'}`,
      customPrompt ? `用户补充要求: ${customPrompt}` : '',
      '',
      '对话数据:',
      messageLines || '无',
      '',
      '知识库信息（文本/图片/绘画/PDF）:',
      knowledgeLines || '无'
    ].filter(Boolean).join('\n');

    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const summary = await aiService.generateSimpleResponse(aiMessages, {
      model,
      temperature: 0.3,
      max_tokens: 1800
    });

    return res.json({
      model,
      filters: {
        bot_id: botId || null,
        topic: topic || null,
        content: content || null,
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
        knowledge_types: Array.from(knowledgeTypes)
      },
      stats: {
        conversations: conversations.length,
        messages: messages.length,
        knowledge_files: pickedKnowledgeFiles.length,
        knowledge_chunks: knowledgeChunks.length
      },
      summary
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to run AI analysis',
        numeric_code: 500
      }
    });
  }
});

export default router;
