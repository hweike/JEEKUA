import { NextRequest, NextResponse } from 'next/server';
import { listPages, readPage, writePage, updateSlugMapping, updateHreflangEntry, getAllLocales } from '@/lib/pages/storage';
import { ensureUniqueSlug } from '@/lib/pages/pageService';

export async function POST(request: NextRequest) {
  try {
    const { sourceLocale, targetLocales } = await request.json();
    if (!sourceLocale || !targetLocales || !Array.isArray(targetLocales)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 获取源站点所有页面
    const pages = await listPages(sourceLocale);
    let successCount = 0;
    let failedCount = 0;

    for (const targetLocale of targetLocales) {
      for (const sourcePage of pages) {
        try {
          // 检查目标语言下slug是否冲突
          let targetSlug = sourcePage.slug;
          const existingPageId = await (async () => {
            // 临时引入 getPageIdBySlug（需从storage导出）
            const { getPageIdBySlug } = await import('@/lib/pages/storage');
            return getPageIdBySlug(targetLocale, targetSlug);
          })();
          if (existingPageId && existingPageId !== sourcePage.id) {
            targetSlug = await ensureUniqueSlug(targetLocale, targetSlug);
          }

          const targetPage = {
            ...sourcePage,
            slug: targetSlug,
            updatedAt: new Date().toISOString(),
          };
          await writePage(targetLocale, targetPage);
          await updateSlugMapping(targetLocale, targetSlug, sourcePage.id);
          const urlPath = `/${targetLocale}/${targetSlug}`;
          await updateHreflangEntry(sourcePage.id, targetLocale, urlPath);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync page ${sourcePage.id} to ${targetLocale}:`, error);
          failedCount++;
        }
      }
    }

    return NextResponse.json({ successCount, failedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}