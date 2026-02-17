import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ChatService {
  async listConversations(userId: string, botId?: string) {
    const where: { user_id: string; bot_id?: string } = { user_id: userId };
    if (botId) where.bot_id = botId;

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

    return conversations;
  }

  async createConversation(userId: string, botId: string, title: string) {
    const bot = await prisma.bot.findUnique({ where: { bot_id: botId } });
    if (!bot) {
      throw new Error('BOT_NOT_FOUND');
    }

    const conversation = await prisma.conversation.create({
      data: {
        conversation_id: `conv_${randomUUID()}`,
        bot_id: botId,
        user_id: userId,
        title: title.trim()
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

    return conversation;
  }

  async listMessages(userId: string, conversationId: string, limit = 100) {
    await this.assertConversationOwner(userId, conversationId);

    return prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { timestamp: 'asc' },
      take: limit
    });
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.assertConversationOwner(userId, conversationId);
    const cleaned = content.trim();
    if (!cleaned) {
      throw new Error('EMPTY_MESSAGE');
    }

    const [userMessage, botMessage] = await prisma.$transaction(async (tx) => {
      const uMsg = await tx.message.create({
        data: {
          message_id: `msg_${randomUUID()}`,
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: userId,
          content: cleaned
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
          content: this.buildMockReply(conversation.bot.name, cleaned)
        }
      });

      await tx.conversation.update({
        where: { conversation_id: conversationId },
        data: { updated_at: new Date() }
      });

      return [uMsg, bMsg];
    });

    return { user_message: userMessage, bot_message: botMessage };
  }

  private async assertConversationOwner(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId
      },
      include: {
        bot: {
          select: {
            name: true
          }
        }
      }
    });

    if (!conversation) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }
    return conversation;
  }

  private buildMockReply(botName: string, userText: string) {
    return `${botName}已收到：${userText}\n\n这是已写入数据库的联动回复，后续可以替换为真实大模型调用。`;
  }
}

export default new ChatService();
