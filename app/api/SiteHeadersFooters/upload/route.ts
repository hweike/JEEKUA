// app/api/SiteHeadersFooters/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPublicStorage } from '@/lib/storage/factory';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成唯一文件名
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}.${ext}`;
    // 在公开桶中的存储路径（与原 public/uploads/headers-footers 对应）
    const key = `uploads/headers-footers/${fileName}`;

    const storage = getPublicStorage();
    await storage.write(key, buffer, { contentType: file.type });

    // 获取公开访问 URL（优先使用自定义域名，否则使用 R2 默认域名）
    const publicUrl = storage.getPublicUrl(key);
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}