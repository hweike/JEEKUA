import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  // 验证登录（中间件已经确保 /admin 路径需要登录）
  const userPayload = await getCurrentUser(request);
  if (!userPayload) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  // 获取文件名参数
  const { searchParams } = new URL(request.url);
  let fileName = searchParams.get('file');
  if (!fileName) {
    return NextResponse.json({ error: '缺少文件参数' }, { status: 400 });
  }

  fileName = path.basename(fileName);
  if (!fileName.endsWith('.xlsx')) {
    return NextResponse.json({ error: '无效的文件类型' }, { status: 400 });
  }

  // 文件路径：private/template/产品分类导入模板.xlsx
  const filePath = path.join(process.cwd(), 'private/template', fileName);
  try {
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}