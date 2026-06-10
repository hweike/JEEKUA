import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, site_id')
    .eq('api_token', token)
    .maybeSingle();

  if (!admin) {
    console.error('❌ Invalid token');
    return addCORSHeaders(NextResponse.json({ error: 'Invalid token' }, { status: 401 }));
  }

  // 2. 获取租户 ID
  const { data: site } = await supabase
    .from('sites')
    .select('tenant_id')
    .eq('site_id', admin.site_id)
    .maybeSingle();

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
  const { data: inserted, error: insertError } = await supabase
    .from('collected_products')
    .insert({
      tenant_id: tenantId,
      site_id: siteId,
      source_url: product.source_url,
      platform: product.platform,
      title: product.title,
      main_image_url: product.images?.[0] || null,
      price: product.price ? parseFloat(product.price) : null,
      raw_data: product,
      status: 'unclaimed',
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert error:', insertError);
    return addCORSHeaders(NextResponse.json({ error: insertError.message }, { status: 500 }));
  }

  console.log('✅ Product saved, id:', inserted.id);
  return addCORSHeaders(NextResponse.json({ success: true, id: inserted.id }));
}