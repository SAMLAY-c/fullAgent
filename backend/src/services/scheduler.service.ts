import schedule from 'node-schedule';
import cronParser from 'cron-parser';
import { PrismaClient } from '@prisma/client';
import chatService from './chat.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface ScheduledTask {
  id: string;
  botId: string;
  userId: string;
  conversationId?: string;
  cronExpression: string;
  message: string;
  enabled: boolean;
  job?: schedule.Job;
}

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();

  private parseCronExpression(expression: string) {
    const parser: any = cronParser as any;

    // cron-parser v4
    if (typeof parser.parseExpression === 'function') {
      return parser.parseExpression(expression);
    }

    // cron-parser default export parse() compatibility
    if (typeof parser.parse === 'function') {
      return parser.parse(expression);
    }

    // cron-parser v5
    const cronExpressionParser = parser.CronExpressionParser ?? parser.default?.CronExpressionParser;
    if (cronExpressionParser && typeof cronExpressionParser.parse === 'function') {
      return cronExpressionParser.parse(expression);
    }

    throw new Error('Unsupported cron-parser API');
  }

  async init() {
    console.log('📅 Initializing scheduler service...');
    try {
      await this.loadTasks();
      console.log(`📅 Scheduler loaded ${this.tasks.size} tasks`);
    } catch (error: any) {
      if (error?.message?.includes('Can\'t reach database') || error?.code === 'P1001') {
        console.warn('⚠️  Database not available - scheduler running without persistent tasks');
        console.warn('⚠️  Tasks will not persist across restarts');
      } else {
        console.error('❌ Failed to load tasks:', error?.message || error);
      }
    }
  }

  async loadTasks() {
    const scheduledTasks = await prisma.workflow.findMany({
      where: {
        enabled: true,
        triggers: {
          path: ['type'],
          equals: 'cron'
        }
      }
    });

    for (const task of scheduledTasks) {
      const triggers = task.triggers as any;
      const cronExpression = triggers?.expression;
      
      if (cronExpression) {
        const taskData: ScheduledTask = {
          id: task.workflow_id,
          botId: task.bot_id,
          userId: (triggers?.user_id as string) || '',
          conversationId: triggers?.conversation_id,
          cronExpression,
          message: triggers?.message || '',
          enabled: task.enabled
        };

        if (this.isValidCron(cronExpression)) {
          this.scheduleTask(taskData);
        }
      }
    }
  }

  private isValidCron(expression: string): boolean {
    try {
      this.parseCronExpression(expression);
      return true;
    } catch {
      return false;
    }
  }

  private scheduleTask(task: ScheduledTask) {
    if (task.job) {
      task.job.cancel();
    }

    const job = schedule.scheduleJob(task.cronExpression, async () => {
      await this.executeTask(task);
    });

    if (job) {
      task.job = job;
      this.tasks.set(task.id, task);
      console.log(`📅 Scheduled task ${task.id}: ${task.cronExpression} -> ${task.message.substring(0, 30)}...`);
    }
  }

  private async executeTask(task: ScheduledTask) {
    console.log(`📨 Executing scheduled task ${task.id}`);

    try {
      let conversationId = task.conversationId;

      if (!conversationId) {
        const conversation = await prisma.conversation.create({
          data: {
            conversation_id: `conv_scheduled_${randomUUID().slice(0, 8)}`,
            bot_id: task.botId,
            user_id: task.userId,
            title: `定时任务 - ${new Date().toLocaleString()}`
          }
        });
        conversationId = conversation.conversation_id;
      }

      try {
        await chatService.sendMessage(task.userId, conversationId, task.message);
      } catch (error: any) {
        // If bound conversation was soft-deleted, create a fresh scheduled conversation and retry once.
        if (error?.message === 'CONVERSATION_NOT_FOUND' && task.conversationId) {
          const fallbackConversation = await prisma.conversation.create({
            data: {
              conversation_id: `conv_scheduled_${randomUUID().slice(0, 8)}`,
              bot_id: task.botId,
              user_id: task.userId,
              title: `定时任务 - ${new Date().toLocaleString()}`
            }
          });
          conversationId = fallbackConversation.conversation_id;
          task.conversationId = conversationId;
          await chatService.sendMessage(task.userId, conversationId, task.message);
        } else {
          throw error;
        }
      }

      await prisma.workflowExecution.create({
        data: {
          execution_id: `exec_${randomUUID()}`,
          workflow_id: task.id,
          status: 'completed',
          trigger_time: new Date(),
          started_at: new Date(),
          completed_at: new Date(),
          result: { message: 'Task executed successfully' }
        }
      });

      console.log(`✅ Task ${task.id} executed successfully`);
    } catch (error: any) {
      console.error(`❌ Task ${task.id} failed:`, error.message);

      await prisma.workflowExecution.create({
        data: {
          execution_id: `exec_${randomUUID()}`,
          workflow_id: task.id,
          status: 'failed',
          trigger_time: new Date(),
          started_at: new Date(),
          completed_at: new Date(),
          error_message: error.message
        }
      });
    }
  }

  async createTask(data: {
    botId: string;
    userId: string;
    cronExpression: string;
    message: string;
    conversationId?: string;
    name?: string;
    description?: string;
  }) {
    console.log('Creating task with data:', data);
    
    if (!this.isValidCron(data.cronExpression)) {
      throw new Error('Invalid cron expression: ' + data.cronExpression);
    }

    const workflowId = `scheduled_${randomUUID().slice(0, 8)}`;

    const task: ScheduledTask = {
      id: workflowId,
      botId: data.botId,
      userId: data.userId,
      conversationId: data.conversationId,
      cronExpression: data.cronExpression,
      message: data.message,
      enabled: true
    };

    this.scheduleTask(task);

    console.log('Creating workflow in DB...');
    await prisma.workflow.create({
      data: {
        workflow_id: workflowId,
        bot_id: data.botId,
        name: data.name || '定时任务',
        description: data.description || '',
        triggers: {
          type: 'cron',
          expression: data.cronExpression,
          message: data.message,
          user_id: data.userId,
          conversation_id: data.conversationId
        },
        workflow_steps: [],
        enabled: true
      }
    });

    return {
      workflow_id: workflowId,
      id: task.id,
      botId: task.botId,
      userId: task.userId,
      conversationId: task.conversationId,
      cronExpression: task.cronExpression,
      message: task.message,
      enabled: task.enabled
    };
  }

  async deleteTask(workflowId: string) {
    const task = this.tasks.get(workflowId);
    if (task?.job) {
      task.job.cancel();
    }
    this.tasks.delete(workflowId);

    await prisma.workflow.delete({
      where: { workflow_id: workflowId }
    });

    return { success: true };
  }

  async toggleTask(workflowId: string, enabled: boolean) {
    const task = this.tasks.get(workflowId);
    
    if (enabled && task) {
      this.scheduleTask(task);
    } else if (task?.job) {
      task.job.cancel();
      task.job = undefined;
    }

    await prisma.workflow.update({
      where: { workflow_id: workflowId },
      data: { enabled }
    });

    if (task) {
      task.enabled = enabled;
      this.tasks.set(workflowId, task);
    }

    return { success: true, enabled };
  }

  async getTasks() {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      botId: task.botId,
      userId: task.userId,
      cronExpression: task.cronExpression,
      message: task.message,
      enabled: task.enabled,
      nextRun: task.job?.nextInvocation()?.toISOString()
    }));
  }

  async getTasksFromDb() {
    const workflows = await prisma.workflow.findMany({
      where: {
        triggers: {
          path: ['type'],
          equals: 'cron'
        }
      },
      select: {
        workflow_id: true,
        bot_id: true,
        name: true,
        description: true,
        triggers: true,
        enabled: true,
        created_at: true
      }
    });

    return workflows.map(w => ({
      id: w.workflow_id,
      botId: w.bot_id,
      name: w.name,
      description: w.description,
      cronExpression: (w.triggers as any)?.expression,
      message: (w.triggers as any)?.message,
      enabled: w.enabled,
      createdAt: w.created_at
    }));
  }
}

export default new SchedulerService();
