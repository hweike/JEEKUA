// app/api/theme-preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imagePath = searchParams.get('path');
  if (!imagePath) {
    return new NextResponse('Missing path', { status: 400 });
  }

  // 安全限制：只允许访问 themes/ 下的文件（R2 中的路径）
  const normalized = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (!normalized.startsWith('themes/')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const storage = getPrivateStorage();
  const key = normalized; // R2 中实际的 key（如 themes/presets/Blue/Facebook.webp）
  try {
    const imageBuffer = await storage.read(key, 'binary');
    const ext = path.extname(key).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';

    return new NextResponse(imageBuffer as Buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error(`读取图片失败: ${key}`, err);
    if (err?.Code === 'NoSuchKey' || err?.code === 'NoSuchKey' || err?.message?.includes('NoSuchKey')) {
      return new NextResponse('Not found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}