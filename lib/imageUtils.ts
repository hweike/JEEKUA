// lib/imageUtils.ts
import { getPublicStorage } from '@/lib/storage/factory';

/**
 * 确保目录存在（云存储无需实际创建，保留空函数以兼容调用）
 */
export async function ensureDir(dir: string): Promise<void> {
  // 云存储不需要创建目录
}

/**
 * 下载远程图片并保存到公开桶
 * @param url 图片地址（支持 http/https 或本地路径）
 * @returns 图片存储后的公开访问 URL，如果下载失败则返回空字符串
 */
export async function downloadImage(url: string): Promise<string> {
  // 如果 URL 为空，或已是公开桶路径（以 /uploads 开头），则直接返回
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
    const ext = (() => {
      try {
        const pathname = new URL(url).pathname;
        const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
        return match ? `.${match[1]}` : '.jpg';
      } catch {
        return '.jpg';
      }
    })();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
    const key = `uploads/${fileName}`; // 公开桶中的 Key

    // 3. 上传图片到公开桶
    const storage = getPublicStorage();
    await storage.write(key, buffer, { contentType: `image/${ext.slice(1)}` });

    // 4. 返回公开访问 URL（优先使用自定义域名，否则使用 R2 默认域名）
    const publicUrl = storage.getPublicUrl(key);
    return publicUrl;
  } catch (error) {
    console.error(`下载图片异常: ${url}`, error);
    return '';
  }
}