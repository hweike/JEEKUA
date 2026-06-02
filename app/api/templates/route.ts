import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/webbuilder/template-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
  }

  try {
    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    // 只返回必要字段
    return NextResponse.json({
      id: template.id,
      name: template.name,
      category: template.category,
    });
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}