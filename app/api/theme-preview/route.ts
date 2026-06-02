// app/api/theme-preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imagePath = searchParams.get('path');
  if (!imagePath) {
    return new NextResponse('Missing path', { status: 400 });
  }
  // 安全限制：只允许访问 data/themes 目录下的文件
  const fullPath = path.resolve(imagePath);
  const themesDir = path.resolve(process.cwd(), 'data', 'themes');
  if (!fullPath.startsWith(themesDir)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(fullPath)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const imageBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'application/octet-stream';
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}