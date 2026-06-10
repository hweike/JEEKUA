import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

async function getUserTenantAndSite(userId: string) {
  const { data: user, error: userError } = await supabase
    .from('admin_users')
    .select('site_id')
    .eq('id', userId)
    .single();
  if (userError || !user?.site_id) {
    console.error('获取用户 site_id 失败:', userError);
    console.warn('使用默认站点 000001，租户 tenant_000001');
    return { tenantId: 'tenant_000001', siteId: '000001' };
  }
  const siteId = user.site_id;

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('tenant_id')
    .eq('site_id', siteId)
    .single();
  if (siteError || !site?.tenant_id) {
    console.error('获取站点 tenant_id 失败:', siteError);
    console.warn(`站点 ${siteId} 未找到租户，使用默认 tenant_000001`);
    return { tenantId: 'tenant_000001', siteId };
  }
  return { tenantId: site.tenant_id, siteId };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;

    let query = supabase
      .from('collected_products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('site_id', siteId);
    if (status !== 'all') query = query.eq('status', status);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const { data: allData } = await supabase
      .from('collected_products')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('site_id', siteId);
    const summary = {
      all: allData?.length || 0,
      unclaimed: allData?.filter(i => i.status === 'unclaimed').length || 0,
      claimed: allData?.filter(i => i.status === 'claimed').length || 0,
    };

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      summary,
      page,
      limit,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ items: [], total: 0, summary: { all: 0, unclaimed: 0, claimed: 0 } });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    const { id, status, title, price, main_image_url, documents } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (price !== undefined) updateData.price = price;
    if (main_image_url !== undefined) updateData.main_image_url = main_image_url;
    if (documents !== undefined) updateData.documents = documents;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('collected_products')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('site_id', siteId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PUT error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const { error } = await supabase
      .from('collected_products')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('site_id', siteId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}