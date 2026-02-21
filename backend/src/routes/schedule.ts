import { Router } from 'express';
import cronParser from 'cron-parser';
import schedulerService from '../services/scheduler.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

function parseCronExpression(expression: string) {
  const parser: any = cronParser as any;

  if (typeof parser.parseExpression === 'function') {
    return parser.parseExpression(expression);
  }

  if (typeof parser.parse === 'function') {
    return parser.parse(expression);
  }

  const cronExpressionParser = parser.CronExpressionParser ?? parser.default?.CronExpressionParser;
  if (cronExpressionParser && typeof cronExpressionParser.parse === 'function') {
    return cronExpressionParser.parse(expression);
  }

  throw new Error('Unsupported cron-parser API');
}

router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await schedulerService.getTasksFromDb();
    res.json({ tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const { bot_id, user_id, cron_expression, message, conversation_id, name, description } = req.body;

    if (!bot_id || !user_id || !cron_expression || !message) {
      return res.status(400).json({ error: 'Missing required fields: bot_id, user_id, cron_expression, message' });
    }

    const task = await schedulerService.createTask({
      botId: bot_id,
      userId: user_id,
      cronExpression: cron_expression,
      message,
      conversationId: conversation_id,
      name,
      description
    });

    res.status(201).json(task);
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await schedulerService.deleteTask(id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/tasks/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const result = await schedulerService.toggleTask(id, enabled);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/cron/validate', async (req, res) => {
  const { expression } = req.query;
  
  if (!expression || typeof expression !== 'string') {
    return res.status(400).json({ valid: false, error: 'Missing cron expression' });
  }

  try {
    const interval = parseCronExpression(expression);
    res.json({
      valid: true,
      next: interval.next().toDate().toISOString(),
      prev: interval.prev().toDate().toISOString()
    });
  } catch (error: any) {
    res.json({ valid: false, error: error.message });
  }
});

export default router;
