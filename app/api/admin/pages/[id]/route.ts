import { NextRequest, NextResponse } from 'next/server';
import { updatePage, deletePage } from '@/lib/pages/pageService';
import { readPage } from '@/lib/pages/storage';
import { PageData } from '@/types/page';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  const page = await readPage(locale, id);
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale');
    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }
    const body = await request.json();
    const updated = await updatePage(locale, id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    const message = error.message;
    try {
      const errors = JSON.parse(message);
      return NextResponse.json({ errors }, { status: 400 });
    } catch {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  try {
    await deletePage(locale, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}