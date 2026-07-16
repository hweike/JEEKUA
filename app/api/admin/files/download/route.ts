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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 });
    }

    // 1. 下载图片
    let response;
    try {
      response = await fetch(url, { timeout: 30000 }); // 30秒超时
    } catch (fetchErr: any) {
      console.error('Fetch error:', fetchErr);
      return NextResponse.json({ error: `Failed to fetch image: ${fetchErr.message}` }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: `HTTP ${response.status}: ${response.statusText}` }, { status: 500 });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const displayName = url.split('/').pop() || 'downloaded-image';
    const mimeType = contentType;

    // 2. 计算哈希
    let fileHash;
    try {
      fileHash = await computeFileHash(buffer);
    } catch (hashErr: any) {
      console.error('Hash error:', hashErr);
      return NextResponse.json({ error: 'Failed to compute file hash' }, { status: 500 });
    }

    // 3. 查重
    let existingFile;
    try {
      existingFile = await findMediaFileByHash(fileHash);
    } catch (dbErr: any) {
      console.error('DB find error:', dbErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let mediaFileId: string;
    let storageKey: string;
    let isExisting = false;

    if (existingFile) {
      mediaFileId = existingFile.id;
      storageKey = existingFile.storage_key;
      isExisting = true;
    } else {
      // 4. 生成 key 并上传到 R2
      const storage = getPublicStorage();
      try {
        storageKey = generateStorageKey(displayName, fileHash);
        await storage.write(storageKey, buffer, { contentType: mimeType });
      } catch (uploadErr: any) {
        console.error('R2 upload error:', uploadErr);
        return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
      }

      // 5. 获取图片尺寸（可选，出错不影响上传）
      let width = null, height = null;
      if (mimeType.startsWith('image/')) {
        try {
          const dims = await getImageDimensions(buffer);
          if (dims) {
            width = dims.width;
            height = dims.height;
          }
        } catch (dimErr) {
          console.warn('Failed to get image dimensions:', dimErr);
          // 继续，不阻塞
        }
      }

      // 6. 写入数据库
      try {
        const newFile = await createMediaFile({
          storage_key: storageKey,
          display_name: displayName,
          mime_type: mimeType,
          size: buffer.length,
          file_hash: fileHash,
          width,
          height,
        });
        mediaFileId = newFile.id;
      } catch (dbInsertErr: any) {
        console.error('DB insert error:', dbInsertErr);
        // 如果数据库写入失败，应该删除已上传的 R2 文件保持一致性
        try {
          const storage = getPublicStorage();
          await storage.delete(storageKey);
        } catch (cleanErr) {
          console.error('Failed to clean up R2 after DB error:', cleanErr);
        }
        return NextResponse.json({ error: `Database insert failed: ${dbInsertErr.message}` }, { status: 500 });
      }
    }

    // 7. 获取公开 URL
    const storage = getPublicStorage();
    const publicUrl = storage.getPublicUrl(storageKey);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      id: mediaFileId,
      displayName: displayName,
      isExisting,
    });
  } catch (error: any) {
    console.error('Unhandled download error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}