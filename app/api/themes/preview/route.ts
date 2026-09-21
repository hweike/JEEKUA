// app/api/themes/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 });
  }

  try {
    const storage = getPrivateStorage();
    const buffer = await storage.read(path, 'binary');

    // 根据扩展名设置 Content-Type
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
      webp: 'image/webp',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    return new NextResponse(buffer as Buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey') {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }
    console.error('读取图片失败:', path, error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}