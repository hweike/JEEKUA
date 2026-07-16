// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveImage } from '@/lib/files/download';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const referenceType = formData.get('referenceType') as string | null;
    const referenceIdRaw = formData.get('referenceId') as string | null;
    const referenceId = referenceIdRaw ? String(referenceIdRaw) : undefined;

    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只能上传图片文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 调用公共函数：本地上传自动启用哈希去重（Buffer 输入默认 dedupByHash = true）
    // 若提供了引用信息，则自动创建 file_references 记录
    const storageKey = await downloadAndSaveImage(buffer, {
      referenceType: referenceType || undefined,
      referenceId,
    });

    // 返回相对路径（storage_key），前端使用 getImageUrl 拼接完整 URL
    return NextResponse.json({
      success: true,
      url: storageKey,
    });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传失败' },
      { status: 500 }
    );
  }
}