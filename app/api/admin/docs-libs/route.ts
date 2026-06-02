import { NextResponse } from 'next/server';
import { getDocsLibs, createDocsLib, updateDocsLib, deleteDocsLib } from '@/lib/docs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  if (!locale) return NextResponse.json({ error: '缺少 locale' }, { status: 400 });
  const libs = await getDocsLibs(locale);
  return NextResponse.json(libs);
}

export async function POST(request: Request) {
  const { locale, name, description, templateId, slug, seo_title, seo_description, seo_keywords } = await request.json();
  if (!locale || !name) {
    return NextResponse.json({ error: '缺少 locale 或 name' }, { status: 400 });
  }
  const newLib = await createDocsLib(locale, name, description, templateId, slug, seo_title, seo_description, seo_keywords);
  return NextResponse.json(newLib);
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { locale, name, description, templateId, slug, seo_title, seo_description, seo_keywords } = await request.json();
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少 locale 或 id' }, { status: 400 });
  }
  await updateDocsLib(locale, id, { name, description, templateId, slug, seo_title, seo_description, seo_keywords });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const locale = searchParams.get('locale');
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少 locale 或 id' }, { status: 400 });
  }
  await deleteDocsLib(locale, id);
  return NextResponse.json({ success: true });
}