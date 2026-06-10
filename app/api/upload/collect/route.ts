// app/api/upload/collect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

// 允许的文件类型
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 认证：仅登录用户可上传
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    // 文件类型校验
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型，仅支持: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // 文件大小校验
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop() || '';
    const safeName = `${randomUUID()}.${ext}`;
    // 存储到私有桶，路径按照用户隔离：collected_products/{userId}/{safeName}
    const key = `collected_products/${user.id}/${safeName}`;

    const storage = getPrivateStorage();
    await storage.write(key, buffer, { contentType: file.type });

    // 生成预签名 URL（有效期7天）或直接使用公共读（如果桶配置了公共读）
    // 方案1：使用预签名 URL（推荐）
    let fileUrl: string;
    if (typeof storage.getSignedUrl === 'function') {
      fileUrl = await storage.getSignedUrl(key, { expiresIn: 604800 }); // 7天
    } else {
      // 如果存储实现不支持预签名，则假设桶是公开读，构造 URL
      const publicUrlBase = process.env.R2_PUBLIC_URL || 'https://your-public-bucket.r2.dev';
      fileUrl = `${publicUrlBase}/${key}`;
    }

    return NextResponse.json({ success: true, url: fileUrl, key });
  } catch (error) {
    console.error('采集文件上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}