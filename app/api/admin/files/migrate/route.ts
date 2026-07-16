import { NextRequest, NextResponse } from 'next/server';
import { getPublicStorage } from '@/lib/storage/factory';
import {
  computeFileHash,
  getImageDimensions,
  generateStorageKey,
} from '@/lib/files/utils';
import {
  createMediaFile,
  findMediaFileByHash,
} from '@/lib/files/db';

/**
 * 从 URL 中提取原始文件名（不带路径）
 */
function extractOriginalFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const fileName = parts.pop() || 'image.jpg';
    return fileName;
  } catch {
    const parts = url.split('/');
    return parts.pop() || 'image.jpg';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '缺少有效的 URL' }, { status: 400 });
    }

    // 1. 下载图片
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    } catch (err: any) {
      console.error(`下载失败 [${url}]:`, err);
      return NextResponse.json({ error: `下载失败: ${err.message}` }, { status: 500 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: `下载失败 HTTP ${response.status}` }, { status: 500 });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL 不是有效的图片' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalFileName = extractOriginalFileName(url);
    const displayName = `MORNSUN-${originalFileName}`;

    // 2. 计算哈希
    const fileHash = await computeFileHash(buffer);

    // 3. 查重
    const existingFile = await findMediaFileByHash(fileHash);
    if (existingFile) {
      const storage = getPublicStorage();
      const publicUrl = storage.getPublicUrl(existingFile.storage_key);
      return NextResponse.json({
        success: true,
        url: publicUrl,
        displayName: existingFile.display_name,
        isExisting: true,
      });
    }

    // 4. 生成存储 key 并上传到 R2
    const storageKey = generateStorageKey(displayName, fileHash);
    const storage = getPublicStorage();
    // 修复：使用 contentType 而不是 mimeType
    await storage.write(storageKey, buffer, { contentType });

    // 5. 获取图片尺寸（可选）
    let width = null, height = null;
    if (contentType.startsWith('image/')) {
      try {
        const dims = await getImageDimensions(buffer);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
      } catch (dimErr) {
        console.warn('获取图片尺寸失败:', dimErr);
      }
    }

    // 6. 写入数据库
    await createMediaFile({
      storage_key: storageKey,
      display_name: displayName,
      mime_type: contentType,
      size: buffer.length,
      file_hash: fileHash,
      width,
      height,
    });

    const publicUrl = storage.getPublicUrl(storageKey);
    return NextResponse.json({
      success: true,
      url: publicUrl,
      displayName,
      isExisting: false,
    });
  } catch (error: any) {
    console.error('迁移图片错误:', error);
    return NextResponse.json({ error: error.message || '服务器内部错误' }, { status: 500 });
  }
}