import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'pages');

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const locale = request.nextUrl.searchParams.get('locale');
  if (!id || !locale) return NextResponse.json({ error: 'Missing id or locale' }, { status: 400 });
  const filePath = path.join(DATA_DIR, locale, `${id}.json`);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { locale, data, id } = await request.json();
  if (!locale || !data || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  const dir = path.join(DATA_DIR, locale);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true });
}