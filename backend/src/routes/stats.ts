import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function percentTrend(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

router.get('/dashboard', async (_req: any, res: Response) => {
  try {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);

    const startThisWeek = new Date(startToday);
    startThisWeek.setDate(startThisWeek.getDate() - 7);

    const startLastWeek = new Date(startThisWeek);
    startLastWeek.setDate(startLastWeek.getDate() - 7);

    const [
      totalBots,
      onlineBots,
      totalWorkflows,
      activeWorkflows,
      totalGroups,
      activeGroups,
      todayMessageCount,
      totalConversations,
      botsCreatedThisWeek,
      botsCreatedLastWeek,
      workflowsCreatedThisWeek,
      workflowsCreatedLastWeek,
      groupsCreatedThisWeek,
      groupsCreatedLastWeek,
      yesterdayMessageCount
    ] = await Promise.all([
      prisma.bot.count(),
      prisma.bot.count({ where: { status: 'online' } }),
      prisma.workflow.count(),
      prisma.workflow.count({ where: { enabled: true } }),
      prisma.group.count(),
      prisma.group.count({ where: { type: 'personal' } }),
      prisma.message.count({
        where: {
          timestamp: {
            gte: startToday
          }
        }
      }),
      prisma.conversation.count(),
      prisma.bot.count({
        where: { created_at: { gte: startThisWeek, lt: now } }
      }),
      prisma.bot.count({
        where: { created_at: { gte: startLastWeek, lt: startThisWeek } }
      }),
      prisma.workflow.count({
        where: { created_at: { gte: startThisWeek, lt: now } }
      }),
      prisma.workflow.count({
        where: { created_at: { gte: startLastWeek, lt: startThisWeek } }
      }),
      prisma.group.count({
        where: { created_at: { gte: startThisWeek, lt: now } }
      }),
      prisma.group.count({
        where: { created_at: { gte: startLastWeek, lt: startThisWeek } }
      }),
      prisma.message.count({
        where: {
          timestamp: {
            gte: startYesterday,
            lt: startToday
          }
        }
      })
    ]);

    const botTrend = percentTrend(botsCreatedThisWeek, botsCreatedLastWeek);
    const workflowTrend = percentTrend(workflowsCreatedThisWeek, workflowsCreatedLastWeek);
    const groupTrend = percentTrend(groupsCreatedThisWeek, groupsCreatedLastWeek);
    const messageTrend = percentTrend(todayMessageCount, yesterdayMessageCount);

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

router.get('/recent-activities', async (_req: any, res: Response) => {
  try {
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

    const activities: Array<{
      type: string;
      icon: string;
      title: string;
      description: string;
      time: string;
      status: string;
    }> = [];

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
