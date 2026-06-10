// app/api/collect/link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
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
  const { data: credentialData } = await supabase
    .from('user_platform_credentials')
    .select('credential')
    .eq('user_id', user.id)
    .eq('platform', 'alibaba')
    .maybeSingle();
  const alibabaCookie = credentialData?.credential || '';

  try {
    // 1. 爬取商品数据
    const productData = await crawlProductByUrl(url, alibabaCookie);

    // 2. 获取租户和站点
    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    // 3. 插入数据库
    const { data, error } = await supabase
      .from('collected_products')
      .insert({
        tenant_id: tenantId,
        site_id: siteId,
        source_url: url,
        platform: productData.platform,
        title: productData.title,
        main_image_url: productData.images?.[0] || null,
        price: productData.price ? parseFloat(productData.price) : null,
        raw_data: productData,
        status: 'unclaimed',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('链接采集失败:', err);
    return NextResponse.json({ error: err.message || '采集失败' }, { status: 500 });
  }
}