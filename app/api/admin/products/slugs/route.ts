// app/api/admin/products/slugs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const idsParam = searchParams.get('ids');

    let data: { productId: string; slug: string }[];

    if (idsParam) {
      // ✅ 支持按 ids 过滤（用于订单列表等批量场景）
      const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ pages: [], slugs: [] });
      }

      data = await sql<{ productId: string; slug: string }[]>`
        SELECT "productId", slug FROM public.products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND "productId" IN ${sql(ids)}
          AND slug IS NOT NULL
          AND slug != ''
      `;
    } else {
      // 默认：返回指定 locale 的所有产品 slug
      data = await sql<{ productId: string; slug: string }[]>`
        SELECT "productId", slug FROM public.products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
          AND slug IS NOT NULL
          AND slug != ''
      `;
    }

    return NextResponse.json({
      pages: data.map(item => ({
        id: item.productId,
        slug: item.slug,
      })),
      slugs: data.map(item => item.slug).filter(Boolean),
    });
  } catch (error: any) {
    console.error('获取产品 slug 列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}