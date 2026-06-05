import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = '000001'; // 与原代码保持一致

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const textIds = searchParams.get('textIds')?.split(',') || [];
  const locale = searchParams.get('locale') || 'zh';
  const siteId = searchParams.get('siteId') || DEFAULT_SITE_ID;

  if (textIds.length === 0) {
    return NextResponse.json({});
  }

  const { data, error } = await supabase
    .from('component_texts')
    .select('text_id, text')
    .eq('site_id', siteId)
    .eq('locale', locale)
    .in('text_id', textIds);

  if (error) {
    console.error('GET /api/component-texts error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  const result: Record<string, string> = {};
  (data || []).forEach(row => { result[row.text_id] = row.text; });
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId = DEFAULT_SITE_ID, textId, locale, text } = body;
    if (!textId || !locale) {
      return NextResponse.json({ error: 'Missing textId or locale' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('component_texts')
      .upsert({
        site_id: siteId,
        text_id: textId,
        locale,
        text,
        created_at: now,
        updated_at: now,
      }, {
        onConflict: 'site_id, text_id, locale',
      });

    if (error) {
      console.error('PUT /api/component-texts error:', error);
      return NextResponse.json({ error: 'Upsert failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const textId = searchParams.get('textId');
  const siteId = searchParams.get('siteId') || DEFAULT_SITE_ID;
  if (!textId) {
    return NextResponse.json({ error: 'Missing textId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('component_texts')
    .delete()
    .eq('site_id', siteId)
    .eq('text_id', textId);

  if (error) {
    console.error('DELETE /api/component-texts error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}