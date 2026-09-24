// app/api/collect/plugin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

function addCORSHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCORSHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  console.log('🔍 Received token:', token);

  // 1. 验证 token
  let admin: { id: string; site_id: string } | undefined;
  try {
    const rows = await sql<{ id: string; site_id: string }[]>`
      SELECT id, site_id FROM public.admin_users
      WHERE api_token = ${token}
      LIMIT 1
    `;
    admin = rows[0];
  } catch (error) {
    console.error('❌ Token 查询失败:', error);
    return addCORSHeaders(NextResponse.json({ error: 'Invalid token' }, { status: 401 }));
  }

  if (!admin) {
    console.error('❌ Invalid token');
    return addCORSHeaders(NextResponse.json({ error: 'Invalid token' }, { status: 401 }));
  }

  // 2. 获取租户 ID
  let site: { tenant_id: string | null } | undefined;
  try {
    const rows = await sql<{ tenant_id: string | null }[]>`
      SELECT tenant_id FROM public.sites
      WHERE site_id = ${admin.site_id}
      LIMIT 1
    `;
    site = rows[0];
  } catch (error) {
    console.error('❌ Site 查询失败:', error);
    return addCORSHeaders(NextResponse.json({ error: 'Site configuration missing' }, { status: 500 }));
  }

  if (!site) {
    console.error('❌ Site not found for site_id:', admin.site_id);
    return addCORSHeaders(NextResponse.json({ error: 'Site configuration missing' }, { status: 500 }));
  }

  const tenantId = site.tenant_id;
  const siteId = admin.site_id;

  // 3. 解析商品数据
  const product = await req.json();
  if (!product.title || !product.source_url) {
    return addCORSHeaders(NextResponse.json({ error: 'Missing fields' }, { status: 400 }));
  }

  // 4. 存入数据库
  try {
    const insertData: any = {
      tenant_id: tenantId,
      site_id: siteId,
      source_url: product.source_url,
      platform: product.platform ?? null,
      title: product.title,
      main_image_url: product.images?.[0] || null,
      price: product.price ? parseFloat(product.price) : null,
      raw_data: product,
      status: 'unclaimed',
    };

    const inserted = await sql<{ id: number }[]>`
      INSERT INTO public.collected_products ${sql(insertData)}
      RETURNING id
    `;

    console.log('✅ Product saved, id:', inserted[0]?.id);
    return addCORSHeaders(NextResponse.json({ success: true, id: inserted[0]?.id }));
  } catch (error: any) {
    console.error('❌ Insert error:', error);
    return addCORSHeaders(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}