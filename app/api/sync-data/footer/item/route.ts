// app/api/sync-data/footer/item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FOOTER_DIR = path.join(process.cwd(), 'data', 'SiteHeadersFooters', 'footer');

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const locale = request.nextUrl.searchParams.get('locale');
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  // 页脚是单例，id 固定为 'footer'，忽略 id 参数
  const filePath = path.join(FOOTER_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { id, locale, data } = await request.json();
  if (!locale || !data) {
    return NextResponse.json({ error: 'Missing locale or data' }, { status: 400 });
  }
  const dir = FOOTER_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true });
}