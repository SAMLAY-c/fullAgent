import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import aiService, { type ChatMessage, type BotConfig, type AIResult } from './ai.service';
import toolsService from './tools.service';
import { normalizeUtf8Value } from '../utils/encoding';
import botMemoryArchiveService from './bot-memory-archive.service';

const prisma = new PrismaClient();

class ChatService {
  private buildDefaultFolderNameForConversation(title?: string | null, botName?: string | null) {
    const fromTitle = String(normalizeUtf8Value(title || '')).trim();
    if (fromTitle) return fromTitle.slice(0, 50);
    const fromBot = String(normalizeUtf8Value(botName || '')).trim();
    if (fromBot) return `${fromBot}`.slice(0, 50);
    return '默认主题';
  }

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

    const requestedFolderId = folderId && String(folderId).trim() ? String(folderId).trim() : null;
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
        // Frontend theme chips may still send bot_id as pseudo folder_id; treat it as "no real folder".
        if (requestedFolderId !== botId) {
          throw new Error('FOLDER_NOT_FOUND');
        }
      } else {
        normalizedFolderId = folder.folder_id;
      }
    }

    const normalizedTitle = String(normalizeUtf8Value(title || '')).trim();
    const normalizedExtraContext = String(normalizeUtf8Value(extraContext || '')).trim();

    const conversationId = `conv_${randomUUID()}`;
    const conversation = await prisma.$transaction(async (tx) => {
      let resolvedFolderId = normalizedFolderId;
      if (!resolvedFolderId) {
        const createdFolder = await tx.folder.create({
          data: {
            user_id: userId,
            name: this.buildDefaultFolderNameForConversation(normalizedTitle || null, bot.name)
          },
          select: { folder_id: true }
        });
        resolvedFolderId = createdFolder.folder_id;
      }

      return tx.conversation.create({
        data: {
          conversation_id: conversationId,
          bot_id: botId,
          user_id: userId,
          folder_id: resolvedFolderId,
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
      where: { conversation_id: conversationId, is_deleted: false },
      orderBy: { timestamp: 'asc' },
      take: limit
    });

    return messages.map((message) => normalizeUtf8Value(message));
  }

  async editMessage(
    userId: string,
    messageId: string,
    payload: { content: string; regenerate?: boolean }
  ) {
    const cleaned = String(normalizeUtf8Value(payload.content || '')).trim();
    if (!cleaned) {
      throw new Error('EMPTY_MESSAGE');
    }

    const target = await prisma.message.findFirst({
      where: {
        message_id: messageId,
        is_deleted: false,
        conversation: {
          is: {
            user_id: userId,
            is_deleted: false
          }
        }
      },
      select: {
        message_id: true,
        conversation_id: true,
        sender_type: true,
        sender_id: true,
        content: true,
        metadata: true,
        parent_id: true,
        version: true,
        feedback: true,
        feedback_reason: true,
        reference_id: true,
        checkpoint_id: true,
        timestamp: true
      }
    });

    if (!target) {
      throw new Error('MESSAGE_NOT_FOUND');
    }
    if (target.sender_type === 'system') {
      throw new Error('MESSAGE_NOT_EDITABLE');
    }
    if (payload.regenerate && target.sender_type !== 'user') {
      throw new Error('REGENERATE_REQUIRES_USER_MESSAGE');
    }

    const conversation = await this.assertConversationOwner(userId, target.conversation_id);

    const chainRootId = target.parent_id || target.message_id;
    const latestChainVersion = await prisma.message.findFirst({
      where: {
        conversation_id: target.conversation_id,
        OR: [
          { message_id: chainRootId },
          { parent_id: chainRootId }
        ]
      },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    const nextVersion = Math.max(target.version || 1, latestChainVersion?.version || 1) + 1;
    const editTime = new Date();
    const regenerate = Boolean(payload.regenerate);

    const result = await prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: { message_id: target.message_id },
        data: {
          is_deleted: true,
          edited_at: editTime
        }
      });

      let prunedCount = 0;
      let prunedMessages: Array<{
        message_id: string;
        parent_id: string | null;
        version: number;
        sender_type: string;
        timestamp: Date;
      }> = [];
      if (regenerate) {
        prunedMessages = await tx.message.findMany({
          where: {
            conversation_id: target.conversation_id,
            is_deleted: false,
            timestamp: { gt: target.timestamp }
          },
          orderBy: [{ timestamp: 'asc' }, { message_id: 'asc' }],
          select: {
            message_id: true,
            parent_id: true,
            version: true,
            sender_type: true,
            timestamp: true
          }
        });

        const pruned = await tx.message.updateMany({
          where: {
            conversation_id: target.conversation_id,
            is_deleted: false,
            timestamp: { gt: target.timestamp }
          },
          data: {
            is_deleted: true,
            edited_at: editTime
          }
        });
        prunedCount = pruned.count;
      }

      const newMessage = await tx.message.create({
        data: {
          message_id: `msg_${randomUUID()}`,
          conversation_id: target.conversation_id,
          sender_type: target.sender_type,
          sender_id: target.sender_id,
          content: cleaned,
          metadata: target.metadata ?? undefined,
          parent_id: chainRootId,
          version: nextVersion,
          edited_at: editTime,
          feedback: target.feedback ?? undefined,
          feedback_reason: target.feedback_reason ?? undefined,
          reference_id: target.reference_id ?? undefined,
          checkpoint_id: target.checkpoint_id ?? undefined,
          timestamp: target.timestamp
        }
      });

      await tx.conversation.update({
        where: { conversation_id: target.conversation_id },
        data: { updated_at: editTime }
      });

      return {
        newMessage,
        prunedCount,
        prunedMessages
      };
    });

    const regeneratedMessages: any[] = [];

    if (regenerate && result.newMessage.sender_type === 'user') {
      const messageHistory = await prisma.message.findMany({
        where: {
          conversation_id: target.conversation_id,
          is_deleted: false
        },
        orderBy: [{ timestamp: 'asc' }, { message_id: 'asc' }]
      });

      let messages: ChatMessage[] = messageHistory
        .filter(msg => msg.sender_type !== 'system')
        .map(msg => ({
          role: msg.sender_type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      const botConfig = conversation.bot.config as BotConfig | null;
      let nextBotConfig: BotConfig | undefined = botConfig ? { ...botConfig } : undefined;

      const shouldInjectConversationContext = messageHistory.filter((msg) => msg.sender_type !== 'system').length <= 1;
      if (shouldInjectConversationContext) {
        const extraContext = String(normalizeUtf8Value((conversation as any).extra_context || '')).trim();
        if (extraContext) {
          nextBotConfig = {
            ...(nextBotConfig || {}),
            system_prompt: `${nextBotConfig?.system_prompt || ''}\n\n[Conversation Extra Context]\n${extraContext}`.trim()
          } as BotConfig;
        }
      }

      const regeneratedText = await aiService.generateSimpleResponse(messages, nextBotConfig);
      const firstPrunedBot = result.prunedMessages.find((msg) => msg.sender_type === 'bot');
      let regeneratedParentId: string | undefined;
      let regeneratedVersion = 1;

      if (firstPrunedBot) {
        const botChainRootId = firstPrunedBot.parent_id || firstPrunedBot.message_id;
        regeneratedParentId = botChainRootId;
        const latestBotChainVersion = await prisma.message.findFirst({
          where: {
            conversation_id: target.conversation_id,
            OR: [{ message_id: botChainRootId }, { parent_id: botChainRootId }]
          },
          orderBy: { version: 'desc' },
          select: { version: true }
        });
        regeneratedVersion = Math.max(firstPrunedBot.version || 1, latestBotChainVersion?.version || 1) + 1;
      }

      const regeneratedMessage = await prisma.message.create({
        data: {
          message_id: `msg_${randomUUID()}`,
          conversation_id: target.conversation_id,
          sender_type: 'bot',
          sender_id: userId,
          content: String(normalizeUtf8Value(regeneratedText)),
          parent_id: regeneratedParentId,
          version: regeneratedVersion,
          edited_at: editTime,
          timestamp: firstPrunedBot?.timestamp,
          metadata: {
            model: botConfig?.model || 'deepseek-ai/DeepSeek-V3.2',
            generated_at: new Date().toISOString(),
            regenerated: true,
            regenerated_from_message_id: result.newMessage.message_id,
            replaced_message_id: firstPrunedBot?.message_id || null
          }
        }
      });

      await prisma.conversation.update({
        where: { conversation_id: target.conversation_id },
        data: { updated_at: new Date() }
      });

      regeneratedMessages.push(normalizeUtf8Value(regeneratedMessage));
    }

    return {
      new_message: normalizeUtf8Value(result.newMessage),
      regenerated_messages: regeneratedMessages,
      pruned_messages_count: result.prunedCount
    };
  }

  async regenerateMessage(userId: string, messageId: string) {
    const target = await prisma.message.findFirst({
      where: {
        message_id: messageId,
        is_deleted: false,
        sender_type: 'user',
        conversation: {
          is: {
            user_id: userId,
            is_deleted: false
          }
        }
      },
      select: {
        message_id: true,
        conversation_id: true,
        sender_type: true,
        timestamp: true
      }
    });

    if (!target) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    const conversation = await this.assertConversationOwner(userId, target.conversation_id);
    const opTime = new Date();

    const prunedResult = await prisma.$transaction(async (tx) => {
      const prunedMessages = await tx.message.findMany({
        where: {
          conversation_id: target.conversation_id,
          is_deleted: false,
          timestamp: { gt: target.timestamp }
        },
        orderBy: [{ timestamp: 'asc' }, { message_id: 'asc' }],
        select: {
          message_id: true,
          parent_id: true,
          version: true,
          sender_type: true,
          timestamp: true
        }
      });

      const pruned = await tx.message.updateMany({
        where: {
          conversation_id: target.conversation_id,
          is_deleted: false,
          timestamp: { gt: target.timestamp }
        },
        data: {
          is_deleted: true,
          edited_at: opTime
        }
      });

      return {
        prunedMessages,
        prunedCount: pruned.count
      };
    });

    const messageHistory = await prisma.message.findMany({
      where: {
        conversation_id: target.conversation_id,
        is_deleted: false
      },
      orderBy: [{ timestamp: 'asc' }, { message_id: 'asc' }]
    });

    const messages: ChatMessage[] = messageHistory
      .filter(msg => msg.sender_type !== 'system')
      .map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

    const botConfig = conversation.bot.config as BotConfig | null;
    let nextBotConfig: BotConfig | undefined = botConfig ? { ...botConfig } : undefined;

    const shouldInjectConversationContext = messageHistory.filter((msg) => msg.sender_type !== 'system').length <= 1;
    if (shouldInjectConversationContext) {
      const extraContext = String(normalizeUtf8Value((conversation as any).extra_context || '')).trim();
      if (extraContext) {
        nextBotConfig = {
          ...(nextBotConfig || {}),
          system_prompt: `${nextBotConfig?.system_prompt || ''}\n\n[Conversation Extra Context]\n${extraContext}`.trim()
        } as BotConfig;
      }
    }

    const regeneratedText = await aiService.generateSimpleResponse(messages, nextBotConfig);
    const firstPrunedBot = prunedResult.prunedMessages.find((msg) => msg.sender_type === 'bot');
    let regeneratedParentId: string | undefined;
    let regeneratedVersion = 1;

    if (firstPrunedBot) {
      const botChainRootId = firstPrunedBot.parent_id || firstPrunedBot.message_id;
      regeneratedParentId = botChainRootId;
      const latestBotChainVersion = await prisma.message.findFirst({
        where: {
          conversation_id: target.conversation_id,
          OR: [{ message_id: botChainRootId }, { parent_id: botChainRootId }]
        },
        orderBy: { version: 'desc' },
        select: { version: true }
      });
      regeneratedVersion = Math.max(firstPrunedBot.version || 1, latestBotChainVersion?.version || 1) + 1;
    }

    const regeneratedMessage = await prisma.message.create({
      data: {
        message_id: `msg_${randomUUID()}`,
        conversation_id: target.conversation_id,
        sender_type: 'bot',
        sender_id: userId,
        content: String(normalizeUtf8Value(regeneratedText)),
        parent_id: regeneratedParentId,
        version: regeneratedVersion,
        edited_at: opTime,
        timestamp: firstPrunedBot?.timestamp,
        metadata: {
          model: botConfig?.model || 'deepseek-ai/DeepSeek-V3.2',
          generated_at: new Date().toISOString(),
          regenerated: true,
          regenerated_from_message_id: target.message_id,
          replaced_message_id: firstPrunedBot?.message_id || null
        }
      }
    });

    await prisma.conversation.update({
      where: { conversation_id: target.conversation_id },
      data: { updated_at: new Date() }
    });

    return {
      regenerated_messages: [normalizeUtf8Value(regeneratedMessage)],
      pruned_messages_count: prunedResult.prunedCount
    };
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
      where: { conversation_id: conversationId, is_deleted: false },
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
        where: { conversation_id: conversationId, is_deleted: false },
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
