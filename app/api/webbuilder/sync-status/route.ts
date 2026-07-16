// app/api/webbuilder/sync-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/webbuilder/services/template.service';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
  }

  try {
    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      syncStatus: template.syncStatus || 'idle',
    });
  } catch (error) {
    console.error('GET /api/webbuilder/sync-status error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}