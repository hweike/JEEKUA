import { NextRequest, NextResponse } from 'next/server';
import { getResourcesByProduct } from '@/lib/products/resourceRelations';

// 辅助：根据资源类型和ID列表获取详情
async function enrichResources(
  resourceType: string,
  ids: { id: string; sortOrder: number }[],
  locale: string
) {
  if (ids.length === 0) return [];
  // 根据资源类型调用不同的详情查询
  // 示例：假设博客有表 `blogs`，文档有 `documents`，视频有 `videos`
  // 为避免复杂，这里返回基础信息，实际可分别实现
  // 此处只做示例，真实项目需对接各自的资源表
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  let results = [];
  try {
    if (resourceType === 'blog') {
      // 调用博客详情API（需要自行实现）
      const res = await fetch(`${baseUrl}/api/front/blogs?ids=${ids.map(i => i.id).join(',')}&locale=${locale}`);
      if (res.ok) results = await res.json();
    } else if (resourceType === 'document') {
      // 类似
    } else if (resourceType === 'video') {
      // 类似
    }
  } catch (err) {
    console.error(`Fetch ${resourceType} details error:`, err);
  }
  return results.map((r: any) => ({ ...r, sortOrder: ids.find(i => i.id === r.id)?.sortOrder }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const grouped = await getResourcesByProduct(productId);
    
    // 分别获取各类型资源的详情（此处简化，实际可以并行查询）
    const enriched = {
      blogs: await enrichResources('blog', grouped.blog, locale),
      documents: await enrichResources('document', grouped.document, locale),
      videos: await enrichResources('video', grouped.video, locale),
    };
    return NextResponse.json(enriched);
  } catch (error) {
    console.error('[Product Related Resources]', error);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}