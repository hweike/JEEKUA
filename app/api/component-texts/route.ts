import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const textIds = searchParams.get('textIds')?.split(',') || [];
  const locale = searchParams.get('locale') || 'zh';
  const siteId = searchParams.get('siteId') || '100001';

  if (textIds.length === 0) {
    return NextResponse.json({});
  }

  const db = getDb();
  const placeholders = textIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT text_id, text FROM component_texts
    WHERE site_id = ? AND locale = ? AND text_id IN (${placeholders})
  `).all(siteId, locale, ...textIds) as { text_id: string; text: string }[];

  const result: Record<string, string> = {};
  rows.forEach(row => { result[row.text_id] = row.text; });
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId = '100001', textId, locale, text } = body;
    if (!textId || !locale) {
      return NextResponse.json({ error: 'Missing textId or locale' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO component_texts (site_id, text_id, locale, text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(site_id, text_id, locale) DO UPDATE SET text = ?, updated_at = ?
    `).run(siteId, textId, locale, text, now, now, text, now);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const textId = searchParams.get('textId');
  const siteId = searchParams.get('siteId') || '100001';
  if (!textId) {
    return NextResponse.json({ error: 'Missing textId' }, { status: 400 });
  }
  const db = getDb();
  db.prepare(`DELETE FROM component_texts WHERE site_id = ? AND text_id = ?`).run(siteId, textId);
  return NextResponse.json({ success: true });
}