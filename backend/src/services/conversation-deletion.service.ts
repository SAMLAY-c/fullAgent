import { PrismaClient } from '@prisma/client';
import botMemoryArchiveService from './bot-memory-archive.service';

const prisma = new PrismaClient();

class ConversationDeletionService {
  async softDeleteConversation(userId: string, conversationId: string, reason = 'user_deleted') {
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId
      },
      include: {
        _count: { select: { messages: true } }
      }
    });

    if (!conversation || conversation.is_deleted) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    await prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        delete_reason: reason,
        updated_at: new Date()
      }
    });

    try {
      await botMemoryArchiveService.markDeletedByConversationId(conversationId, reason);
    } catch (error) {
      console.error('Failed to mark bot memory archive deleted:', error);
    }

    return {
      success: true,
      conversation_id: conversationId,
      deleted_at: new Date().toISOString(),
      message_count: conversation._count.messages
    };
  }

  async restoreConversation(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId
      }
    });

    if (!conversation || !conversation.is_deleted) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    await prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: {
        is_deleted: false,
        deleted_at: null,
        delete_reason: null,
        updated_at: new Date()
      }
    });

    try {
      await botMemoryArchiveService.restoreByConversationId(conversationId);
    } catch (error) {
      console.error('Failed to restore bot memory archive:', error);
    }

    return {
      success: true,
      conversation_id: conversationId,
      restored_at: new Date().toISOString()
    };
  }

  async hardDeleteConversation(userId: string, conversationId: string, isAdmin = false) {
    const where = isAdmin
      ? { conversation_id: conversationId }
      : { conversation_id: conversationId, user_id: userId };

    const conversation = await prisma.conversation.findFirst({ where });

    if (!conversation || !conversation.is_deleted) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    await prisma.conversation.delete({
      where: { conversation_id: conversationId }
    });

    try {
      await botMemoryArchiveService.purgeByConversationId(conversationId);
    } catch (error) {
      console.error('Failed to purge bot memory archive:', error);
    }

    return {
      success: true,
      conversation_id: conversationId,
      purged_at: new Date().toISOString()
    };
  }

  async listDeletedConversations(userId: string, botId?: string) {
    return prisma.conversation.findMany({
      where: {
        user_id: userId,
        is_deleted: true,
        ...(botId ? { bot_id: botId } : {})
      },
      orderBy: { deleted_at: 'desc' },
      include: {
        bot: {
          select: { bot_id: true, name: true, scene: true, type: true }
        },
        _count: { select: { messages: true } }
      }
    });
  }
}

export default new ConversationDeletionService();
