// app/api/admin/pages/slugs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listPages } from '@/lib/pages/storage';

/**
 * GET /api/admin/pages/slugs?locale=zh
 *
 * 获取指定语言下所有已存在的 slug 列表
 * 用于前端在生成 slug 时判断唯一性
 *
 * 返回：
 * - pages: [{ id, slug }]  ← 编辑模式下用于排除自身
 * - slugs: string[]        ← 兼容旧代码
 * - count: number
 * - locale: string
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');

  if (!locale) {
    return NextResponse.json(
      { error: 'Missing locale' },
      { status: 400 }
    );
  }

  try {
    console.log(`[api/admin/pages/slugs] 获取 ${locale} 语言下的 slug 列表`);
    const pages = await listPages(locale);

    // ✅ 构建 pages 列表（带 id），用于编辑模式排除自身
    // 过滤空 slug，只返回有效值
    const pagesWithId = pages
      .filter(p => typeof p.slug === 'string' && p.slug.trim() !== '')
      .map(p => ({ id: p.id, slug: p.slug }));

    // ✅ 保留 slugs 数组，兼容旧代码
    const slugs = pagesWithId.map(p => p.slug);

    console.log(`[api/admin/pages/slugs] 返回 ${slugs.length} 个 slug`);

    return NextResponse.json({
      pages: pagesWithId,   // ← 新增：带 id 的列表
      slugs,                // ← 兼容旧代码
      count: slugs.length,
      locale,
    });
  } catch (error: any) {
    console.error(`[api/admin/pages/slugs] 获取失败 (${locale}):`, error?.message);
    // 降级：返回空数组，不阻塞前端
    return NextResponse.json({
      pages: [],
      slugs: [],
      count: 0,
      locale,
      warning: '获取 slug 列表失败，已降级返回空数组',
    });
  }
}