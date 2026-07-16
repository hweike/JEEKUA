import { NextRequest, NextResponse } from 'next/server';
import { getPublicStorage } from '@/lib/storage/factory';
import { computeFileHash, getImageDimensions, generateStorageKey } from '@/lib/files/utils';
import { createMediaFile } from '@/lib/files/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'image/jpeg';
    const originalFileName = file.name || 'image.jpg';

    const fileHash = await computeFileHash(buffer);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safeFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = generateStorageKey(safeFileName, fileHash); // 生成相对路径

    const storage = getPublicStorage();
    await storage.write(storageKey, buffer, { contentType });

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

    await createMediaFile({
      storage_key: storageKey,
      display_name: originalFileName,
      mime_type: contentType,
      size: buffer.length,
      file_hash: fileHash,
      width,
      height,
      source_url: null,
    });

    // ✅ 关键修改：返回相对路径，而不是完整的 R2 URL
    return NextResponse.json({ url: storageKey });
  } catch (err: any) {
    console.error('上传失败:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}