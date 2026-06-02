import { NextRequest, NextResponse } from 'next/server'
import { getCategories, saveCategories } from '@/lib/videosys/categories'
import { getAllVideos } from '@/lib/videosys/videos'

async function ensureSystemCategory(locale: string) {
  const categories = await getCategories(locale);
  const hasProductVideo = Object.values(categories).some(
    (cat: any) => cat.name === '产品视频' && cat.isSystem === true
  );
  if (!hasProductVideo) {
    const systemKey = 'product-video';
    const systemCategory = {
      name: '产品视频',
      slug: 'product-video',
      order: 0,
      commentStatus: 'allowed',
      isSystem: true,
      template: '',
      seo_keywords: '',
      seo_title: '',
      seo_description: '',
    };
    categories[systemKey] = systemCategory;
    await saveCategories(locale, categories);
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const key = searchParams.get('key');
  await ensureSystemCategory(locale);
  const categories = await getCategories(locale);
  if (key) {
    const category = categories[key];
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    return NextResponse.json({ ...category, key });
  }
  return NextResponse.json(categories);
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { locale, key, category } = body
  if (!locale || !key || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const categories = await getCategories(locale)
  const existing = categories[key];
  if (existing && existing.isSystem === true) {
    // 保护系统分类，但是允许修改名称、slug、seo等（可根据需求调整）
    category.isSystem = true;
  } else {
    category.isSystem = false;
  }
  // 确保 seo_* 字段存在
  categories[key] = {
    name: category.name,
    slug: category.slug,
    order: category.order,
    commentStatus: category.commentStatus,
    template: category.template,
    seo_keywords: category.seo_keywords || '',
    seo_title: category.seo_title || '',
    seo_description: category.seo_description || '',
    isSystem: category.isSystem,
  };
  await saveCategories(locale, categories)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const locale = searchParams.get('locale') || 'zh'
  const key = searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }
  const categories = await getCategories(locale);
  const targetCategory = categories[key];
  if (targetCategory?.isSystem === true) {
    return NextResponse.json({ error: '系统分类不可删除' }, { status: 400 });
  }
  const videos = await getAllVideos(locale)
  const used = videos.some(v => v.category === key)
  if (used) {
    return NextResponse.json({ error: '该分类下还有视频，无法删除' }, { status: 400 })
  }
  delete categories[key]
  await saveCategories(locale, categories)
  return NextResponse.json({ success: true })
}