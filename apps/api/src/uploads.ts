import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export const uploadsDir = path.resolve(__dirname, '../uploads');
export const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const EXT_ALLOW = new Set(Object.values(EXT_BY_MIME));

fs.mkdirSync(uploadsDir, { recursive: true });

function extFor(file: { mimetype: string; originalname: string }) {
  const fromMime = EXT_BY_MIME[file.mimetype];
  if (fromMime) return fromMime;
  const fromName = path.extname(file.originalname).toLowerCase();
  if (EXT_ALLOW.has(fromName) && (file.mimetype === 'application/octet-stream' || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/'))) {
    return fromName === '.jpeg' ? '.jpg' : fromName;
  }
  return null;
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = extFor(file) ?? '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (extFor(file)) cb(null, true);
    else cb(new Error('Upload an MP4, WebM, MOV, or an image (JPG, PNG, WebP, GIF).'));
  },
});

export function uploadSingle(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    const message = code === 'LIMIT_FILE_SIZE'
      ? 'That file is over 80 MB. Compress the video and try again.'
      : err instanceof Error
        ? err.message
        : 'Upload failed';
    res.status(400).json({ error: message });
  });
}
