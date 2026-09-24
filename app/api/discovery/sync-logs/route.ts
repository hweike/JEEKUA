// app/api/discovery/sync-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status');
  const sourceLocale = searchParams.get('sourceLocale');
  const targetLocale = searchParams.get('targetLocale');

  const conditions: any[] = [sql`site_id = ${SITE_ID}`];
  if (status) conditions.push(sql`status = ${status}`);
  if (sourceLocale) conditions.push(sql`source_locale = ${sourceLocale}`);
  if (targetLocale) conditions.push(sql`target_locale = ${targetLocale}`);

  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  try {
    const logs = await sql<any[]>`
      SELECT * FROM public.sync_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT 500
    `;
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('GET /api/discovery/sync-logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
  }
}