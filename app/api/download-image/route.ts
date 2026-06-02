// app/api/download-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { downloadImage } from '@/lib/imageUtils';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '缺少图片 URL' }, { status: 400 });
    }

    const localUrl = await downloadImage(url);
    if (!localUrl) {
      return NextResponse.json({ error: '图片下载失败，请检查 URL 是否有效' }, { status: 500 });
    }

    return NextResponse.json({ url: localUrl });
  } catch (error) {
    console.error('下载图片 API 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}