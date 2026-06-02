import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status');
  const sourceLocale = searchParams.get('sourceLocale');
  const targetLocale = searchParams.get('targetLocale');
  const db = getDb();
  let query = `SELECT * FROM sync_logs WHERE site_id = ?`;
  const params: any[] = [SITE_ID];
  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (sourceLocale) {
    query += ` AND source_locale = ?`;
    params.push(sourceLocale);
  }
  if (targetLocale) {
    query += ` AND target_locale = ?`;
    params.push(targetLocale);
  }
  query += ` ORDER BY created_at DESC LIMIT 500`;
  const logs = db.prepare(query).all(...params);
  return NextResponse.json(logs);
}