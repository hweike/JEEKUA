// app/api/admin/videosys-categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCategories, saveCategories } from '@/lib/videosys/categories'
import { getAllVideos } from '@/lib/videosys/videos'

async function ensureSystemCategory(locale: string) {
  try {
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
  } catch (error) {
    console.error('ensureSystemCategory error:', error);
    // 不抛出，让后续逻辑继续
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const key = searchParams.get('key');
  
  try {
    await ensureSystemCategory(locale);
    const categories = await getCategories(locale);
    if (key) {
      const category = categories[key];
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      return NextResponse.json({ ...category, key });
    }
    return NextResponse.json(categories);
  } catch (error: any) {
    // 如果底层 NoSuchKey 仍然抛出，捕获并返回空对象
    console.error('GET /api/admin/videosys-categories error:', error);
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey') {
      return NextResponse.json({});
    }
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { locale, key, category } = body
    if (!locale || !key || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const categories = await getCategories(locale)
    const existing = categories[key];
    if (existing && existing.isSystem === true) {
      category.isSystem = true;
    } else {
      category.isSystem = false;
    }
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
  } catch (error: any) {
    console.error('PUT /api/admin/videosys-categories error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('DELETE /api/admin/videosys-categories error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}