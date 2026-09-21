import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/products/services/category.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  try {
    const categories = await getCategories(locale);

    // ✅ 只返回组件需要的字段
    const items = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      order: cat.order,
      series: (cat.series || []).map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        image: s.image || '',
        order: s.order,
      })),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[api/front/products/categories] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', items: [] },
      { status: 500 }
    );
  }
}