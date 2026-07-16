// app/api/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveImage } from '@/lib/files/download';

// 从环境变量读取 R2 公网 URL
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * 将相对路径转换为完整的公网 URL（R2 CDN 地址）
 * - 如果已经是完整 URL（http/https），直接返回
 * - 如果配置了 R2_PUBLIC_URL，拼接为完整 URL
 * - 否则返回相对路径（降级）
 */
function ensurePublicUrl(url: string): string {
  if (!url) return url;
  
  // 已经是完整 URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果没有配置 R2_PUBLIC_URL，无法拼接
  if (!R2_PUBLIC_URL) {
    console.warn('R2_PUBLIC_URL not set, returning relative path:', url);
    return url.startsWith('/') ? url : `/${url}`;
  }
  
  // 拼接完整 URL
  const base = R2_PUBLIC_URL.replace(/\/+$/, '');
  const relative = url.startsWith('/') ? url.slice(1) : url;
  return `${base}/${relative}`;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // 处理 multipart/form-data（本地上传）
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const referenceType = formData.get('referenceType') as string | null;
      const referenceIdRaw = formData.get('referenceId') as string | null;
      const referenceId = referenceIdRaw ? String(referenceIdRaw) : undefined;
      const folder = formData.get('folder') as string | null;

      if (!file) {
        return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: '只能上传图片文件' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const options: { referenceType?: string; referenceId?: string; folder?: string } = {
        referenceType: referenceType || undefined,
        referenceId,
      };
      if (folder) options.folder = folder;

      const storageKey = await downloadAndSaveImage(buffer, options);
      
      // ✅ 转换为完整的公网 URL
      const publicUrl = ensurePublicUrl(storageKey);

      return NextResponse.json({ success: true, url: publicUrl });
    }

    // 处理 application/json（URL 上传）
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { url, referenceType, referenceId, folder } = body;

      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: '缺少 URL 参数' }, { status: 400 });
      }

      const options: { referenceType?: string; referenceId?: string; folder?: string } = {
        referenceType: referenceType || undefined,
        referenceId: referenceId ? String(referenceId) : undefined,
      };
      if (folder) options.folder = folder;

      const storageKey = await downloadAndSaveImage(url, options);
      
      // ✅ 转换为完整的公网 URL
      const publicUrl = ensurePublicUrl(storageKey);

      return NextResponse.json({ success: true, url: publicUrl });
    }

    return NextResponse.json({ error: '不支持的 Content-Type' }, { status: 415 });
  } catch (error: any) {
    console.error('图片处理失败:', error);
    return NextResponse.json(
      { error: error.message || '图片处理失败' },
      { status: 500 }
    );
  }
}