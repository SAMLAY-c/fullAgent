import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import aiService, { type ChatMessage, type BotConfig, type AIResult } from './ai.service';
import toolsService from './tools.service';
import { normalizeUtf8Value } from '../utils/encoding';
import botMemoryArchiveService from './bot-memory-archive.service';

const prisma = new PrismaClient();

class ChatService {
  async listConversations(userId: string, botId?: string, folderId?: string) {
    const where: { user_id: string; bot_id?: string; folder_id?: string; is_deleted: boolean } = {
      user_id: userId,
      is_deleted: false
    };
    if (botId) where.bot_id = botId;
    if (folderId) where.folder_id = folderId;

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      include: {
        bot: {
          select: {
            bot_id: true,
            name: true,
            avatar: true,
            scene: true,
            type: true
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    return conversations.map((conversation) => normalizeUtf8Value(conversation));
  }

  async createConversation(
    userId: string,
    botId: string,
    title?: string | null,
    folderId?: string | null,
    extraContext?: string | null
  ) {
    const bot = await prisma.bot.findUnique({ where: { bot_id: botId } });
    if (!bot) {
      throw new Error('BOT_NOT_FOUND');
    }

    let normalizedFolderId: string | null = null;
    if (folderId && String(folderId).trim()) {
      const folder = await prisma.folder.findFirst({
        where: {
          folder_id: String(folderId).trim(),
          user_id: userId,
          is_deleted: false
        },
        select: { folder_id: true }
      });
      if (!folder) {
        throw new Error('FOLDER_NOT_FOUND');
      }
      normalizedFolderId = folder.folder_id;
    }

    const normalizedTitle = String(normalizeUtf8Value(title || '')).trim();
    const normalizedExtraContext = String(normalizeUtf8Value(extraContext || '')).trim();

    const conversation = await prisma.conversation.create({
      data: {
        conversation_id: `conv_${randomUUID()}`,
        bot_id: botId,
        user_id: userId,
        folder_id: normalizedFolderId,
        title: normalizedTitle || null,
        extra_context: normalizedExtraContext || null
      },
      include: {
        bot: {
          select: {
            bot_id: true,
            name: true,
            avatar: true,
            scene: true,
            type: true
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    return normalizeUtf8Value(conversation);
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    payload: { title?: string | null; extra_context?: string | null }
  ) {
    await this.assertConversationOwner(userId, conversationId);

    const data: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
      const normalizedTitle = String(normalizeUtf8Value(payload.title || '')).trim();
      data.title = normalizedTitle || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'extra_context')) {
      const normalizedExtraContext = String(normalizeUtf8Value(payload.extra_context || '')).trim();
      data.extra_context = normalizedExtraContext || null;
    }

    if (!Object.keys(data).length) {
      throw new Error('NO_UPDATABLE_FIELDS');
    }

    const conversation = await prisma.conversation.update({
      where: { conversation_id: conversationId },
      data,
      include: {
        bot: {
          select: {
            bot_id: true,
            name: true,
            avatar: true,
            scene: true,
            type: true
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    return normalizeUtf8Value(conversation);
  }

  async listMessages(userId: string, conversationId: string, limit = 100) {
    await this.assertConversationOwner(userId, conversationId);

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { timestamp: 'asc' },
      take: limit
    });

    return messages.map((message) => normalizeUtf8Value(message));
  }

  /**
   * Send message with ReAct Agent support (Tool Calling)
   * Implements the ReAct loop: Thought → Action → Observation → Thought → ... → Answer
   */
  async sendMessage(userId: string, conversationId: string, content: string, memoryIds: string[] = []) {
    const conversation = await this.assertConversationOwner(userId, conversationId);
    const cleaned = String(normalizeUtf8Value(content)).trim();
    if (!cleaned) {
      throw new Error('EMPTY_MESSAGE');
    }

    // Fetch conversation history for context
    const messageHistory = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { timestamp: 'asc' },
      take: 20 // Last 20 messages for context
    });

    // Build initial chat messages for AI
    let messages: ChatMessage[] = messageHistory
      .filter(msg => msg.sender_type !== 'system')
      .map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

    // Add current user message
    messages.push({
      role: 'user',
      content: cleaned
    });

    // Get bot config and tools
    const botConfig = conversation.bot.config as BotConfig | null;
    let nextBotConfig: BotConfig | undefined = botConfig ? { ...botConfig } : undefined;
    const bot = await prisma.bot.findUnique({
      where: { bot_id: conversation.bot_id },
      select: { type: true, scene: true }
    });

    const shouldInjectConversationContext = messageHistory.filter((msg) => msg.sender_type !== 'system').length === 0;
    if (shouldInjectConversationContext) {
      const extraContext = String(normalizeUtf8Value((conversation as any).extra_context || '')).trim();
      if (extraContext) {
        nextBotConfig = {
          ...(nextBotConfig || {}),
          system_prompt: `${nextBotConfig?.system_prompt || ''}\n\n[Conversation Extra Context]\n${extraContext}`.trim()
        } as BotConfig;
      }
    }

    if (memoryIds.length > 0) {
      const memories = await prisma.conversationArchiveMemory.findMany({
        where: { memory_id: { in: memoryIds } },
        select: { title: true, summary: true, insight: true, archive_index: true }
      });

      const memoryContext = '\n\n===参考记忆===\n' + memories.map(m =>
        `【${m.title}·第${m.archive_index}次】\n摘要：${m.summary}\n洞察：${m.insight}`
      ).join('\n\n');

      nextBotConfig = {
        ...(nextBotConfig || {}),
        system_prompt: ((nextBotConfig?.system_prompt || '') + memoryContext)
      } as BotConfig;
    }

    // Get available tools for this bot type
    const tools = bot ? toolsService.getToolsForBot(bot.type, bot.scene) : [];

    // ===== ReAct Loop =====
    // Maximum iterations to prevent infinite loops
    const MAX_ITERATIONS = 8;
    let finalReply = '';
    const toolCallLog: any[] = []; // Track all tool calls for metadata
    let totalTokensUsed = 0;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      console.log(`🔄 ReAct iteration ${iteration + 1}/${MAX_ITERATIONS}`);

      // Call AI with current message history and available tools
      const result: AIResult = await aiService.generateResponse(
        messages,
        nextBotConfig,
        tools
      );

      if (result.tokensUsed) {
        totalTokensUsed += result.tokensUsed;
      }

      // Case 1: AI responds with text directly (final answer)
      if (result.type === 'text') {
        finalReply = result.content || '';
        console.log(`✅ ReAct completed with direct response (${iteration + 1} iterations)`);
        break;
      }

      // Case 2: AI wants to use tools
      if (result.type === 'tool_calls' && result.tool_calls) {
        // Add AI's tool_calls message to history (IMPORTANT!)
        messages.push({
          role: 'assistant',
          content: '',
          tool_calls: result.tool_calls
        });

        // Execute each tool call
        for (const toolCall of result.tool_calls) {
          console.log(`  🛠️  Executing tool: ${toolCall.function.name}`);
          console.log(`     Args: ${toolCall.function.arguments}`);

          const execResult = await toolsService.executeTool(
            toolCall,
            userId,
            conversation.bot_id
          );

          // Log tool execution
          const toolLog = {
            tool: toolCall.function.name,
            args: toolCall.function.arguments,
            success: execResult.success,
            result: execResult.result.substring(0, 200), // Truncate for storage
            error: execResult.error
          };
          toolCallLog.push(toolLog);

          // Add tool result message to history
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: execResult.success ? execResult.result : `Error: ${execResult.error}`
          });

          console.log(`     Result: ${execResult.success ? execResult.result.substring(0, 100) : execResult.error}`);
        }

        // Continue loop to let AI reason based on tool results
        continue;
      }

      // Should not reach here
      console.warn('⚠️  Unexpected AI result type, breaking loop');
      break;
    }

    // If no final reply after all iterations, use fallback
    if (!finalReply) {
      finalReply = '抱歉，我在处理你的请求时遇到了一些问题。请稍后再试。';
      console.warn('⚠️  ReAct loop exhausted without final reply');
    }

    // Save user message and AI response to database
    const [userMessage, botMessage] = await prisma.$transaction(async (tx) => {
      const uMsg = await tx.message.create({
        data: {
          message_id: `msg_${randomUUID()}`,
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: userId,
          content: String(normalizeUtf8Value(cleaned))
        }
      });

      // Current schema enforces sender_id -> User.user_id.
      // Keep sender_id as current user for bot messages to satisfy FK.
      const bMsg = await tx.message.create({
        data: {
          message_id: `msg_${randomUUID()}`,
          conversation_id: conversationId,
          sender_type: 'bot',
          sender_id: userId,
          content: String(normalizeUtf8Value(finalReply)),
          metadata: {
            model: botConfig?.model || 'deepseek-ai/DeepSeek-V3.2',
            generated_at: new Date().toISOString(),
            react_iterations: toolCallLog.length > 0 ? toolCallLog.length : 0,
            tool_calls: toolCallLog.length > 0 ? toolCallLog : undefined,
            tokens_used: totalTokensUsed
          }
        }
      });

      await tx.conversation.update({
        where: { conversation_id: conversationId },
        data: { updated_at: new Date() }
      });

      return [uMsg, bMsg];
    });

    try {
      await botMemoryArchiveService.appendRecord({
        bot_id: conversation.bot_id,
        conversation_id: conversationId,
        user_id: userId,
        user_message: cleaned,
        bot_message: finalReply
      });
    } catch (archiveError) {
      console.error('Failed to sync bot memory archive:', archiveError);
    }

    return { user_message: userMessage, bot_message: botMessage };
  }

  async sendMessageStream(
    userId: string,
    conversationId: string,
    content: string,
    memoryIds: string[] = [],
    hooks: {
      onStart: (messageId: string) => void;
      onDelta: (text: string) => void;
      onToolStart?: (tool: string) => void;
      onToolDone?: (tool: string) => void;
      onDone: (result: { user_message: any; bot_message: any }) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      const conversation = await this.assertConversationOwner(userId, conversationId);
      const cleaned = String(normalizeUtf8Value(content)).trim();
      if (!cleaned) {
        throw new Error('EMPTY_MESSAGE');
      }

      const messageHistory = await prisma.message.findMany({
        where: { conversation_id: conversationId },
        orderBy: { timestamp: 'asc' },
        take: 20
      });

      let messages: ChatMessage[] = messageHistory
        .filter(msg => msg.sender_type !== 'system')
        .map(msg => ({
          role: msg.sender_type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      messages.push({ role: 'user', content: cleaned });

      const botConfig = conversation.bot.config as BotConfig | null;
      let nextBotConfig: BotConfig | undefined = botConfig ? { ...botConfig } : undefined;

      const shouldInjectConversationContext = messageHistory.filter((msg) => msg.sender_type !== 'system').length === 0;
      if (shouldInjectConversationContext) {
        const extraContext = String(normalizeUtf8Value((conversation as any).extra_context || '')).trim();
        if (extraContext) {
          nextBotConfig = {
            ...(nextBotConfig || {}),
            system_prompt: `${nextBotConfig?.system_prompt || ''}\n\n[Conversation Extra Context]\n${extraContext}`.trim()
          } as BotConfig;
        }
      }

      if (memoryIds.length > 0) {
        hooks.onToolStart?.('memory_recall');
        const memories = await prisma.conversationArchiveMemory.findMany({
          where: { memory_id: { in: memoryIds } },
          select: { title: true, summary: true, insight: true, archive_index: true }
        });

        const memoryContext = '\n\n===参考记忆===\n' + memories.map(m =>
          `【${m.title || '未命名'}·第${m.archive_index}次】\n摘要：${m.summary || ''}\n洞察：${m.insight || ''}`
        ).join('\n\n');

        nextBotConfig = {
          ...(nextBotConfig || {}),
          system_prompt: ((nextBotConfig?.system_prompt || '') + memoryContext)
        } as BotConfig;
        hooks.onToolDone?.('memory_recall');
      }

      const userMessage = await prisma.message.create({
        data: {
          message_id: `msg_${randomUUID()}`,
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: userId,
          content: String(normalizeUtf8Value(cleaned))
        }
      });

      const botMessageId = `msg_${randomUUID()}`;
      hooks.onStart(botMessageId);

      let finalReply = await aiService.generateSimpleResponseStream(
        messages,
        nextBotConfig,
        (delta) => hooks.onDelta(delta)
      );

      if (!finalReply) {
        finalReply = await aiService.generateSimpleResponse(messages, nextBotConfig);
        if (finalReply) {
          hooks.onDelta(finalReply);
        }
      }

      const botMessage = await prisma.message.create({
        data: {
          message_id: botMessageId,
          conversation_id: conversationId,
          sender_type: 'bot',
          sender_id: userId,
          content: String(normalizeUtf8Value(finalReply)),
          metadata: {
            model: botConfig?.model || 'deepseek-ai/DeepSeek-V3.2',
            generated_at: new Date().toISOString(),
            stream: true
          }
        }
      });

      await prisma.conversation.update({
        where: { conversation_id: conversationId },
        data: { updated_at: new Date() }
      });

      try {
        await botMemoryArchiveService.appendRecord({
          bot_id: conversation.bot_id,
          conversation_id: conversationId,
          user_id: userId,
          user_message: cleaned,
          bot_message: finalReply
        });
      } catch (archiveError) {
        console.error('Failed to sync bot memory archive (stream):', archiveError);
      }

      hooks.onDone({ user_message: userMessage, bot_message: botMessage });
    } catch (error) {
      hooks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async assertConversationOwner(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        is_deleted: false
      },
      include: {
        bot: {
          select: {
            name: true,
            config: true
          }
        }
      }
    });

    if (!conversation) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }
    return conversation;
  }
}

export default new ChatService();
