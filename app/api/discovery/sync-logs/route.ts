import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status');
  const sourceLocale = searchParams.get('sourceLocale');
  const targetLocale = searchParams.get('targetLocale');

  let query = supabase
    .from('sync_logs')
    .select('*')
    .eq('site_id', SITE_ID)
    .order('created_at', { ascending: false })
    .limit(500);

  if (status) {
    query = query.eq('status', status);
  }
  if (sourceLocale) {
    query = query.eq('source_locale', sourceLocale);
  }
  if (targetLocale) {
    query = query.eq('target_locale', targetLocale);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error('GET /api/discovery/sync-logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
  }

  return NextResponse.json(logs || []);
}