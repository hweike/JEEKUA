import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveImage } from '@/lib/files/download';
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

    const buffer = Buffer.from(await file.arrayBuffer());

    // 调用公共函数上传图片（返回相对路径 storage_key）
    // 不传 referenceType/referenceId，只存储图片，不创建业务引用
    const storageKey = await downloadAndSaveImage(buffer);

    // 转换为完整 URL（保持原有返回格式）
    const storage = getPublicStorage();
    const fullUrl = storage.getPublicUrl(storageKey);

    return NextResponse.json({ url: fullUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}