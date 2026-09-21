// app/api/blog/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/blog/services/category.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  try {
    const categories = await getCategories(locale);

    // ✅ 只返回组件需要的字段
    const items = (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name || cat.title || '',
      slug: cat.slug || '',
      description: cat.description || '',
      order: cat.order ?? 0,
      parentId: cat.parentId ?? null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[api/blog/categories] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', items: [] },
      { status: 500 }
    );
  }
}