// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPublicStorage } from '@/lib/storage/factory';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只能上传图片文件' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成唯一文件名（保留原扩展名）
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `upload_${timestamp}.${ext}`;
    const key = `uploads/${filename}`; // 公开桶中的路径

    // 上传到公开桶
    const storage = getPublicStorage();
    await storage.write(key, buffer, { contentType: file.type });

    // 获取公开访问 URL（优先使用自定义域名，否则使用 R2.dev 子域）
    const url = storage.getPublicUrl(key);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}