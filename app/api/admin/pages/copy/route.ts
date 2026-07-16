import { NextRequest, NextResponse } from 'next/server';
import { ensureUniqueSlug } from '@/lib/pages/pageService';
import { readPage, writePage, getPageIdBySlug } from '@/lib/pages/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceLocale, targetLocale, pageId } = body;

    if (!sourceLocale || !targetLocale || !pageId) {
      return NextResponse.json(
        { error: '缺少必要参数 (sourceLocale, targetLocale, pageId)' },
        { status: 400 }
      );
    }
    if (sourceLocale === targetLocale) {
      return NextResponse.json(
        { error: '源语言和目标语言不能相同' },
        { status: 400 }
      );
    }

    // 读取源页面
    const sourcePage = await readPage(sourceLocale, pageId);
    if (!sourcePage) {
      return NextResponse.json({ error: '源页面不存在' }, { status: 404 });
    }

    // 检查目标语言下 slug 是否冲突
    let targetSlug = sourcePage.slug;
    const existingPageId = await getPageIdBySlug(targetLocale, targetSlug);
    if (existingPageId && existingPageId !== pageId) {
      targetSlug = await ensureUniqueSlug(targetLocale, targetSlug);
    }

    // 构造目标页面（保留 id、type、preset）
    const targetPage = {
      ...sourcePage,
      slug: targetSlug,
      updatedAt: new Date().toISOString(),
    };

    // 写入目标语言（使用相同的 pageId）
    await writePage(targetLocale, targetPage);

    // 注意：hreflang 已由站点地图处理，不再维护

    return NextResponse.json({ success: true, page: targetPage });
  } catch (error) {
    console.error('复制页面失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '复制失败' },
      { status: 500 }
    );
  }
}