// lib/docs/utils.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 云存储中的基础前缀（对应原 data/docs 目录）
export const DATA_ROOT = 'data/docs';

/**
 * 确保目录存在（云存储无需实际创建目录，保留函数以兼容调用）
 */
export async function ensureDir(dir: string): Promise<void> {
  // 云存储不需要创建目录，此函数为保持兼容性而保留
  return;
}

/**
 * 安全读取 JSON 文件（从私有桶）
 * @param filePath 文件路径，可相对于 DATA_ROOT 或包含完整前缀
 * @returns 解析后的 JSON 对象，如果文件不存在则返回 null
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const storage = getPrivateStorage();
  // 自动补全路径前缀（兼容原有调用方式）
  let key = filePath;
  if (!key.startsWith(DATA_ROOT) && !key.startsWith('data/docs')) {
    key = `${DATA_ROOT}/${filePath}`;
  }
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 写入 JSON 文件到私有桶（格式化）
 * @param filePath 文件路径，可相对于 DATA_ROOT 或包含完整前缀
 * @param data 要写入的数据
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  let key = filePath;
  if (!key.startsWith(DATA_ROOT) && !key.startsWith('data/docs')) {
    key = `${DATA_ROOT}/${filePath}`;
  }
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// 以下函数不涉及文件操作，保持不变
export function generateLibId(): string {
  return `lib_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateDocId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}