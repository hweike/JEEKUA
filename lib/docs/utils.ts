import fs from 'fs/promises';
import path from 'path';

export const DATA_ROOT = path.join(process.cwd(), 'data/docs');

// 确保目录存在
export async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 安全读取 JSON 文件
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 写入 JSON 文件（格式化）
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成文档库 ID (lib_xxxxxx)
export function generateLibId(): string {
  return `lib_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// 生成文档 ID (doc_xxxxxx)
export function generateDocId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 从路径中提取安全文件名（暂时未用，保留）
export function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}