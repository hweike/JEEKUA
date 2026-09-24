// app/api/collect/link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import sql from '@/lib/db/admin';
import { crawlProductByUrl } from '@/lib/crawler/link-collector';
import { getUserTenantAndSite } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: '缺少 URL' }, { status: 400 });
  }

  // 获取用户存储的阿里 Cookie
  let alibabaCookie = '';
  try {
    const rows = await sql<{ credential: string | null }[]>`
      SELECT credential FROM public.user_platform_credentials
      WHERE user_id = ${user.id}
        AND platform = 'alibaba'
      LIMIT 1
    `;
    alibabaCookie = rows[0]?.credential || '';
  } catch {}

  try {
    // 1. 爬取商品数据
    const productData = await crawlProductByUrl(url, alibabaCookie);

    // 2. 获取租户和站点
    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    // 3. 插入数据库
    let data: any;
    try {
      const rows = await sql<any[]>`
        INSERT INTO public.collected_products (
          tenant_id, site_id, source_url, platform, title,
          main_image_url, price, raw_data, status
        ) VALUES (
          ${tenantId}, ${siteId}, ${url}, ${productData.platform},
          ${productData.title}, ${productData.images?.[0] || null},
          ${productData.price ? parseFloat(productData.price) : null},
          ${sql.json(productData)}, 'unclaimed'
        )
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
      throw error;
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('链接采集失败:', err);
    return NextResponse.json({ error: err.message || '采集失败' }, { status: 500 });
  }
}