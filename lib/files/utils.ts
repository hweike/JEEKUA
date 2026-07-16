// lib/files/utils.ts
import crypto from 'crypto';
import sharp from 'sharp'; // npm install sharp

export async function computeFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width || 0, height: metadata.height || 0 };
  } catch {
    return null;
  }
}

export function generateStorageKey(originalFilename: string, fileHash: string): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hashPrefix = fileHash.substring(0, 8);
  const ext = originalFilename.split('.').pop() || '';
  const safeName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  return `uploads/${yyyy}/${mm}/${hashPrefix}_${Date.now()}_${safeName}`;
}