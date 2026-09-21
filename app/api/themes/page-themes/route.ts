// app/api/themes/page-themes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

const DATA_KEY = 'themes/page-themes.json';

// ----- 数据访问层（使用云存储） -----
async function readPageThemes() {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(DATA_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch {
    return { pages: [] };
  }
}

async function writePageThemes(data: any) {
  const storage = getPrivateStorage();
  await storage.write(DATA_KEY, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// ----- GET: 查询指定路径的页面主题 -----
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const pagePath = searchParams.get('path');

  if (!pagePath) {
    return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 });
  }

  const data = await readPageThemes();
  const page = data.pages.find((p: any) => p.pagePath === pagePath);
  return NextResponse.json({
    pagePath,
    theme: page?.theme || {},
  });
}

// ----- POST: 创建或更新页面主题 -----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pagePath, theme } = body;

    if (!pagePath) {
      return NextResponse.json({ error: '缺少 pagePath' }, { status: 400 });
    }

    const data = await readPageThemes();
    const existing = data.pages.find((p: any) => p.pagePath === pagePath);

    if (existing) {
      existing.theme = theme || {};
    } else {
      data.pages.push({ pagePath, theme: theme || {} });
    }

    await writePageThemes(data);
    return NextResponse.json({ success: true, pagePath, theme });
  } catch (error) {
    console.error('POST /api/themes/page-themes 失败:', error);
    return NextResponse.json({ error: '保存页面主题失败' }, { status: 500 });
  }
}

// ----- DELETE: 删除页面主题 -----
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const pagePath = searchParams.get('path');

    if (!pagePath) {
      return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 });
    }

    const data = await readPageThemes();
    data.pages = data.pages.filter((p: any) => p.pagePath !== pagePath);
    await writePageThemes(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/themes/page-themes 失败:', error);
    return NextResponse.json({ error: '删除页面主题失败' }, { status: 500 });
  }
}