import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
export const BOT_ID_RANDOM_SLICE_LENGTH = 8;
export const BOT_NAME_DUPLICATE_ERROR = 'Bot name already exists';

export function generateBotId(type: string, timestamp: number = Date.now()): string {
  return `bot_${type}_${timestamp}_${randomUUID().slice(0, BOT_ID_RANDOM_SLICE_LENGTH)}`;
}

interface GetBotsFilters {
  type?: string;
  status?: string;
  scene?: string;
  page?: number;
  page_size?: number;
}

interface BotStats {
  conversation_count: number;
  response_rate: string;
  avg_response_time: string;
}

interface BotWithStats {
  bot_id: string;
  name: string;
  avatar: string | null;
  type: string;
  scene: string;
  status: string;
  description: string | null;
  config: any;
  stats: BotStats;
  created_at: Date;
  updated_at: Date;
}

interface GetBotsResponse {
  bots: BotWithStats[];
  total: number;
  page: number;
  page_size: number;
}

class BotService {
  async getBots(filters: GetBotsFilters): Promise<GetBotsResponse> {
    const { type, status, scene, page = 1, page_size = 20 } = filters;

    // 构建查询条件
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (scene) where.scene = scene;

    // 查询 bots
    const [bots, total] = await Promise.all([
      prisma.bot.findMany({
        where,
        skip: (page - 1) * page_size,
        take: page_size,
        orderBy: { created_at: 'desc' }
      }),
      prisma.bot.count({ where })
    ]);

    // 获取每个 Bot 的统计数据
    const botsWithStats = await Promise.all(
      bots.map(async (bot) => {
        const stats = await this.getBotStats(bot.bot_id);
        return {
          ...bot,
          stats
        };
      })
    );

    return {
      bots: botsWithStats,
      total,
      page,
      page_size
    };
  }

  async getBotById(botId: string) {
    const bot = await prisma.bot.findUnique({
      where: { bot_id: botId }
    });

    if (!bot) {
      throw new Error('Bot 不存在');
    }

    const stats = await this.getBotStats(botId);

    return {
      ...bot,
      stats
    };
  }

  async createBot(data: {
    name: string;
    avatar?: string;
    type: string;
    scene: string;
    description?: string;
    config?: any;
  }) {
    const existing = await prisma.bot.findFirst({
      where: { name: data.name }
    });
    if (existing) {
      throw new Error(BOT_NAME_DUPLICATE_ERROR);
    }

    const bot_id = generateBotId(data.type);

    return await prisma.bot.create({
      data: {
        bot_id,
        name: data.name,
        avatar: data.avatar || null,
        type: data.type,
        scene: data.scene,
        status: 'offline',
        description: data.description || null,
        config: data.config || null
      }
    });
  }

  async updateBot(botId: string, data: Partial<{
    name: string;
    avatar: string;
    type: string;
    scene: string;
    status: string;
    description: string;
    config: any;
  }>) {
    const bot = await prisma.bot.findUnique({
      where: { bot_id: botId }
    });

    if (!bot) {
      throw new Error('Bot 不存在');
    }

    return await prisma.bot.update({
      where: { bot_id: botId },
      data
    });
  }

  async deleteBot(botId: string) {
    const bot = await prisma.bot.findUnique({
      where: { bot_id: botId }
    });

    if (!bot) {
      throw new Error('Bot 不存在');
    }

    await prisma.bot.delete({
      where: { bot_id: botId }
    });

    return { success: true };
  }

  async updateBotStatus(botId: string, status: 'online' | 'offline' | 'suspended') {
    const bot = await prisma.bot.findUnique({
      where: { bot_id: botId }
    });

    if (!bot) {
      throw new Error('Bot 不存在');
    }

    return await prisma.bot.update({
      where: { bot_id: botId },
      data: { status }
    });
  }

  async getBotStats(botId: string): Promise<BotStats> {
    // 计算对话数量
    const conversationCount = await prisma.conversation.count({
      where: { bot_id: botId }
    });

    // 计算响应率（简化计算，实际应基于消息统计）
    const messageCount = await prisma.message.count({
      where: {
        conversation: { bot_id: botId },
        sender_type: 'bot'
      }
    });

    const userMessageCount = await prisma.message.count({
      where: {
        conversation: { bot_id: botId },
        sender_type: 'user'
      }
    });

    const responseRate = userMessageCount > 0
      ? Math.round((messageCount / userMessageCount) * 100) + '%'
      : '0%';

    // 平均响应时间（简化，返回固定值）
    const avgResponseTime = '2.3s';

    return {
      conversation_count: conversationCount,
      response_rate: responseRate,
      avg_response_time: avgResponseTime
    };
  }

  async getBotConversations(botId: string, limit = 50) {
    const bot = await prisma.bot.findUnique({
      where: { bot_id: botId }
    });

    if (!bot) {
      throw new Error('Bot 不存在');
    }

    return await prisma.conversation.findMany({
      where: { bot_id: botId },
      take: limit,
      orderBy: { updated_at: 'desc' },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            avatar: true
          }
        }
      }
    });
  }
}

export default new BotService();
