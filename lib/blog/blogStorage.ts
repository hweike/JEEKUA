// lib/blogStorage.ts
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const CONTENT_DIR = path.join(process.cwd(), 'data/blog');

// 确保语言目录存在
async function ensureLocaleDir(locale: string) {
  const dir = path.join(CONTENT_DIR, locale);
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
}

// 保存 Markdown 内容
export async function saveMarkdownContent(locale: string, id: string, content: string): Promise<void> {
  const dir = await ensureLocaleDir(locale);
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, 'utf-8');
}

// 读取 Markdown 内容
export async function readMarkdownContent(locale: string, id: string): Promise<string | null> {
  const filePath = path.join(CONTENT_DIR, locale, `${id}.md`);
  if (!existsSync(filePath)) return null;
  return await fs.readFile(filePath, 'utf-8');
}

// 删除 Markdown 文件
export async function deleteMarkdownContent(locale: string, id: string): Promise<void> {
  const filePath = path.join(CONTENT_DIR, locale, `${id}.md`);
  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  }
}