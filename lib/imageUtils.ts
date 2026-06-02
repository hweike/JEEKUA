// lib/imageUtils.ts
import fs from 'fs/promises';
import path from 'path';

/**
 * 确保目录存在，如果不存在则创建（类似 mkdir -p）
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 下载远程图片并保存到本地
 * @param url 图片地址（支持 http/https 或本地路径）
 * @returns 图片存储后的本地访问路径，如果下载失败则返回空字符串
 */
export async function downloadImage(url: string): Promise<string> {
  // 如果 URL 为空，或已是本地路径，则直接返回
  if (!url || url.startsWith('/uploads') || url.startsWith('/')) {
    return url || '';
  }

  // 仅处理 http/https 开头的远程图片
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return '';
  }

  try {
    // 1. 发起请求获取图片数据
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`图片下载失败 (HTTP ${response.status}): ${url}`);
      return '';
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. 生成唯一文件名
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await ensureDir(uploadDir);
    const filePath = path.join(uploadDir, fileName);

    // 3. 保存图片到本地
    await fs.writeFile(filePath, buffer);

    // 4. 返回可公开访问的 URL
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error(`下载图片异常: ${url}`, error);
    return '';
  }
}