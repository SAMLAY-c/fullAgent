import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

let multerLib: any = null;
let sharpLib: any = null;
try {
  multerLib = require('multer');
  sharpLib = require('sharp');
} catch (error) {
  console.warn('[folders] Optional upload deps not available (multer/sharp):', error instanceof Error ? error.message : error);
}

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const FOLDER_ICON_DIR = path.join(UPLOAD_ROOT, 'folder-icons');

if (!fs.existsSync(FOLDER_ICON_DIR)) {
  fs.mkdirSync(FOLDER_ICON_DIR, { recursive: true });
}

const upload = multerLib
  ? multerLib({
      storage: multerLib.memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req: Request, file: { mimetype?: string }, cb: (err: any, accept?: boolean) => void) => {
        const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
        cb(null, allowed.has(String(file?.mimetype || '')));
      }
    })
  : null;

const uploadSingleIcon = upload ? upload.single('icon') : (_req: Request, _res: Response, next: Function) => next();

const ICON_COLORS = [
  { bg: '#EF4444', text: '#FFFFFF' },
  { bg: '#F59E0B', text: '#FFFFFF' },
  { bg: '#10B981', text: '#FFFFFF' },
  { bg: '#3B82F6', text: '#FFFFFF' },
  { bg: '#6366F1', text: '#FFFFFF' },
  { bg: '#8B5CF6', text: '#FFFFFF' },
  { bg: '#EC4899', text: '#FFFFFF' },
  { bg: '#14B8A6', text: '#FFFFFF' }
] as const;

type IconConfig = { bg: string; text: string; letter: string };

type FolderRow = {
  folder_id: string;
  name: string;
  color: string;
  icon_type: string;
  icon_url: string | null;
  icon_data: unknown;
  created_at: Date;
  updated_at: Date;
};

function generateIconConfig(name: string): IconConfig {
  const source = String(name || 'Folder');
  const hash = source.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const picked = ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
  return {
    bg: picked.bg,
    text: picked.text,
    letter: source.trim().charAt(0).toUpperCase() || 'F'
  };
}

function getUserId(req: Request): string | null {
  return req.user?.user_id || null;
}

function toFolderResponse(folder: FolderRow) {
  return {
    folder_id: folder.folder_id,
    name: folder.name,
    color: folder.color,
    icon_type: folder.icon_type,
    icon_url: folder.icon_url,
    icon_config: folder.icon_data,
    created_at: folder.created_at,
    updated_at: folder.updated_at
  };
}

function folderIconPathFromUrl(iconUrl: string): string | null {
  if (!iconUrl.startsWith('/uploads/folder-icons/')) return null;
  return path.join(FOLDER_ICON_DIR, path.basename(iconUrl));
}

function safeDeleteFile(absPath: string | null) {
  if (!absPath) return;
  try {
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch (error) {
    console.warn('[folders] Failed to remove file:', absPath, error);
  }
}

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const folders = await prisma.folder.findMany({
      where: { user_id: userId, is_deleted: false },
      orderBy: { created_at: 'desc' }
    });

    return res.json({ success: true, folders: folders.map((f) => toFolderResponse(f as unknown as FolderRow)) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list folders' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const rawName = String(req.body?.name || '').trim();
    if (!rawName) return res.status(400).json({ error: 'Folder name is required' });
    if (rawName.length > 50) return res.status(400).json({ error: 'Folder name must be <= 50 chars' });

    const iconConfig = generateIconConfig(rawName);
    const folder = await prisma.folder.create({
      data: {
        user_id: userId,
        name: rawName,
        color: iconConfig.bg,
        icon_type: 'random',
        icon_data: iconConfig
      }
    });

    return res.status(201).json({ success: true, folder: toFolderResponse(folder as unknown as FolderRow) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create folder' });
  }
});

router.post('/:folder_id/icon/random', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const folderId = String(req.params.folder_id || '');
    const folder = await prisma.folder.findFirst({
      where: { folder_id: folderId, user_id: userId, is_deleted: false }
    });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (folder.icon_type === 'upload' && folder.icon_url) {
      safeDeleteFile(folderIconPathFromUrl(folder.icon_url));
    }

    const iconConfig = generateIconConfig(`${folder.name}-${Date.now()}`);
    const updated = await prisma.folder.update({
      where: { folder_id: folder.folder_id },
      data: {
        icon_type: 'random',
        color: iconConfig.bg,
        icon_data: iconConfig,
        icon_url: null
      }
    });

    return res.json({ success: true, folder: toFolderResponse(updated as unknown as FolderRow) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to randomize icon' });
  }
});

router.post('/:folder_id/icon/upload', uploadSingleIcon, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    if (!multerLib || !sharpLib) {
      return res.status(503).json({ error: 'Upload feature unavailable: install multer and sharp' });
    }

    const file = (req as Request & { file?: { buffer: Buffer } }).file;
    if (!file) return res.status(400).json({ error: 'Upload an image file (jpg/png/webp/gif)' });

    const folderId = String(req.params.folder_id || '');
    const folder = await prisma.folder.findFirst({
      where: { folder_id: folderId, user_id: userId, is_deleted: false }
    });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const filename = `folder-${folder.folder_id}-${Date.now()}.webp`;
    const absPath = path.join(FOLDER_ICON_DIR, filename);

    try {
      await sharpLib(file.buffer)
        .rotate()
        .resize(128, 128, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(absPath);
    } catch {
      return res.status(400).json({ error: 'Invalid image file' });
    }

    if (folder.icon_type === 'upload' && folder.icon_url) {
      safeDeleteFile(folderIconPathFromUrl(folder.icon_url));
    }

    const updated = await prisma.folder.update({
      where: { folder_id: folder.folder_id },
      data: {
        icon_type: 'upload',
        icon_url: `/uploads/folder-icons/${filename}`,
        icon_data: Prisma.JsonNull
      }
    });

    return res.json({ success: true, folder: toFolderResponse(updated as unknown as FolderRow) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload icon' });
  }
});

router.delete('/:folder_id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const folderId = String(req.params.folder_id || '');
    const folder = await prisma.folder.findFirst({
      where: { folder_id: folderId, user_id: userId, is_deleted: false }
    });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const updated = await prisma.folder.update({
      where: { folder_id: folder.folder_id },
      data: { is_deleted: true, deleted_at: new Date() }
    });

    return res.json({ success: true, folder: toFolderResponse(updated as unknown as FolderRow) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete folder' });
  }
});

export default router;
