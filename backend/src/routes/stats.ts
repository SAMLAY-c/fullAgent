import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 所有统计路由都需要认证
router.use(authMiddleware);

// GET /stats/dashboard - 获取仪表盘统计数据
router.get('/dashboard', async (req: any, res: Response) => {
  try {
    // 并行查询所有统计数据
    const [
      totalBots,
      onlineBots,
      totalWorkflows,
      activeWorkflows,
      totalGroups,
      activeGroups,
      todayMessageCount,
      totalConversations
    ] = await Promise.all([
      // Bot 统计
      prisma.bot.count(),
      prisma.bot.count({ where: { status: 'online' } }),

      // Workflow 统计
      prisma.workflow.count(),
      prisma.workflow.count({ where: { enabled: true } }),

      // Group 统计
      prisma.group.count(),
      prisma.group.count({ where: { type: 'personal' } }),

      // 今日对话次数
      prisma.message.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // 总对话数
      prisma.conversation.count()
    ]);

    // 计算趋势百分比（模拟数据，实际应该对比历史数据）
    const botTrend = 12;
    const workflowTrend = 8;
    const groupTrend = 5;
    const messageTrend = 28;

    res.json({
      bots: {
        total: totalBots,
        active: onlineBots,
        trend: botTrend
      },
      workflows: {
        total: totalWorkflows,
        active: activeWorkflows,
        trend: workflowTrend
      },
      groups: {
        total: totalGroups,
        active: activeGroups,
        trend: groupTrend
      },
      messages: {
        today: todayMessageCount,
        total: totalConversations,
        trend: messageTrend
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '获取统计数据失败',
        numeric_code: 500
      }
    });
  }
});

// GET /stats/recent-activities - 获取最近活动记录
router.get('/recent-activities', async (req: any, res: Response) => {
  try {
    // 获取最近的工作流执行记录
    const recentExecutions = await prisma.workflowExecution.findMany({
      take: 5,
      orderBy: { trigger_time: 'desc' },
      include: {
        workflow: {
          select: {
            name: true,
            bot: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // 获取最近的消息
    const recentMessages = await prisma.message.findMany({
      take: 3,
      orderBy: { timestamp: 'desc' },
      include: {
        conversation: {
          select: {
            bot: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // 组装活动记录
    const activities = [];

    // 添加工作流执行记录
    for (const execution of recentExecutions) {
      activities.push({
        type: 'workflow',
        icon: '⏰',
        title: '提醒执行完成',
        description: `${execution.workflow.name} 已执行`,
        time: formatRelativeTime(execution.trigger_time),
        status: execution.status
      });
    }

    // 添加消息记录
    for (const message of recentMessages) {
      activities.push({
        type: 'message',
        icon: '💬',
        title: '新消息',
        description: `${message.conversation.bot.name} 收到新消息`,
        time: formatRelativeTime(message.timestamp),
        status: 'success'
      });
    }

    // 按时间排序
    activities.sort((a, b) => b.time.localeCompare(a.time));

    res.json({
      activities: activities.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '获取活动记录失败',
        numeric_code: 500
      }
    });
  }
});

// 辅助函数：格式化相对时间
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN');
}

export default router;
