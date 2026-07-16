import { NextResponse } from 'next/server';
import { getDocsLibs, createDocsLib, updateDocsLib, deleteDocsLib } from '@/lib/docs';

export async function GET() {
  try {
    const libs = await getDocsLibs();
    return NextResponse.json(libs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, templateId, slug, seo_title, seo_description, seo_keywords } = await request.json();
    if (!name) {
      return NextResponse.json({ error: '缺少 name' }, { status: 400 });
    }
    const newLib = await createDocsLib(name, description, templateId, slug, seo_title, seo_description, seo_keywords);
    return NextResponse.json(newLib);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { name, description, templateId, slug, seo_title, seo_description, seo_keywords } = await request.json();
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }
    await updateDocsLib(id, { name, description, templateId, slug, seo_title, seo_description, seo_keywords });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }
    await deleteDocsLib(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}