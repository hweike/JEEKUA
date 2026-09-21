// lib/files/utils.ts - 兼容版
import crypto from 'crypto';
import sharp from 'sharp';

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

/**
 * 🔥 提取原始扩展名（保留完整格式，如 .jpg_.webp）
 */
function extractExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  // 如果文件名以 . 开头，跳过第一个
  const startIndex = filename.startsWith('.') ? 1 : 0;
  const extParts = parts.slice(startIndex + 1);
  if (extParts.length === 0) return '';
  // 保留完整扩展名
  return '.' + extParts.join('.');
}

/**
 * 🔥 生成存储键（兼容老代码，仅修复扩展名提取）
 */
export function generateStorageKey(originalFilename: string, fileHash: string): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hashPrefix = fileHash.substring(0, 8);
  
  // 🔥 保持与老代码相同的 safeName 生成逻辑
  const safeName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  
  // 🔥 修复：提取原始扩展名（保留完整格式）
  const ext = extractExtension(originalFilename);
  
  // 🔥 如果 safeName 为空，使用 hash
  const finalName = safeName || hashPrefix;
  
  // 🔥 返回存储路径（结构与老代码一致，只是 ext 更准确）
  return `uploads/${yyyy}/${mm}/${hashPrefix}_${Date.now()}_${finalName}${ext}`;
}