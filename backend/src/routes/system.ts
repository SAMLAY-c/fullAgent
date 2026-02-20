import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { readJsonFile, writeJsonFile } from '../utils/json-store';

type SystemSettings = {
  app_name: string;
  default_model: string;
  message_retention_days: number;
  enable_registration: boolean;
  updated_at: string;
};

const router = Router();
const FILE_NAME = 'system-settings.json';

const DEFAULT_SETTINGS: SystemSettings = {
  app_name: 'Bot Agent',
  default_model: 'gpt-4o-mini',
  message_retention_days: 30,
  enable_registration: false,
  updated_at: new Date().toISOString()
};

router.use(authMiddleware);

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await readJsonFile<SystemSettings>(FILE_NAME, DEFAULT_SETTINGS);
    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load system settings',
        numeric_code: 500
      }
    });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const current = await readJsonFile<SystemSettings>(FILE_NAME, DEFAULT_SETTINGS);
    const next: SystemSettings = {
      app_name: typeof req.body?.app_name === 'string' ? req.body.app_name.trim() || current.app_name : current.app_name,
      default_model:
        typeof req.body?.default_model === 'string'
          ? req.body.default_model.trim() || current.default_model
          : current.default_model,
      message_retention_days:
        typeof req.body?.message_retention_days === 'number'
          ? Math.max(1, Math.min(3650, Math.floor(req.body.message_retention_days)))
          : current.message_retention_days,
      enable_registration:
        typeof req.body?.enable_registration === 'boolean'
          ? req.body.enable_registration
          : current.enable_registration,
      updated_at: new Date().toISOString()
    };

    await writeJsonFile(FILE_NAME, next);
    res.json(next);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update system settings',
        numeric_code: 500
      }
    });
  }
});

router.get('/info', (_req: Request, res: Response) => {
  res.json({
    backend_version: process.env.npm_package_version || '1.0.0',
    node_env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default router;
