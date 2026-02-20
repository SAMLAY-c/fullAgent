import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { readJsonFile, writeJsonFile } from '../utils/json-store';

type SceneTemplate = {
  template_id: string;
  name: string;
  scene: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const router = Router();
const FILE_NAME = 'scene-templates.json';

router.use(authMiddleware);

function isValidScene(value: unknown): value is string {
  return ['work', 'life', 'love', 'group', 'sop'].includes(String(value || ''));
}

async function loadTemplates(): Promise<SceneTemplate[]> {
  return readJsonFile<SceneTemplate[]>(FILE_NAME, []);
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await loadTemplates();
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load templates',
        numeric_code: 500
      }
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const scene = typeof req.body?.scene === 'string' ? req.body.scene.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!name || !content || !isValidScene(scene)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'name, scene, content are required',
          numeric_code: 400
        }
      });
    }

    const now = new Date().toISOString();
    const items = await loadTemplates();
    const next: SceneTemplate = {
      template_id: `tpl_${crypto.randomUUID()}`,
      name,
      scene,
      content,
      created_at: now,
      updated_at: now
    };

    const updated = [next, ...items];
    await writeJsonFile(FILE_NAME, updated);
    res.status(201).json(next);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create template',
        numeric_code: 500
      }
    });
  }
});

router.put('/:template_id', async (req: Request, res: Response) => {
  try {
    const templateId = req.params.template_id;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const scene = typeof req.body?.scene === 'string' ? req.body.scene.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!name || !content || !isValidScene(scene)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'name, scene, content are required',
          numeric_code: 400
        }
      });
    }

    const items = await loadTemplates();
    const target = items.find((item) => item.template_id === templateId);
    if (!target) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          numeric_code: 404
        }
      });
    }

    target.name = name;
    target.scene = scene;
    target.content = content;
    target.updated_at = new Date().toISOString();
    await writeJsonFile(FILE_NAME, items);
    res.json(target);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update template',
        numeric_code: 500
      }
    });
  }
});

router.delete('/:template_id', async (req: Request, res: Response) => {
  try {
    const templateId = req.params.template_id;
    const items = await loadTemplates();
    const next = items.filter((item) => item.template_id !== templateId);
    if (next.length === items.length) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          numeric_code: 404
        }
      });
    }

    await writeJsonFile(FILE_NAME, next);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete template',
        numeric_code: 500
      }
    });
  }
});

export default router;
