// app/api/admin/videosys-categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getCategories,
  saveCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  ensureSystemCategory,
  getCategoriesBatch,
  copyCategory,
  createCategoryWithKey, // 新增导入
} from '@/lib/videosys/services/category.service';
import { getAllVideos } from '@/lib/videosys/videos';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const key = searchParams.get('key');
  const localesParam = searchParams.get('locales');

  try {
    if (!localesParam) {
      await ensureSystemCategory(locale);
    }

    if (localesParam) {
      const locales = localesParam.split(',').filter(Boolean);
      if (locales.length === 0) {
        return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
      }
      const result = await getCategoriesBatch(locales);
      return NextResponse.json(result);
    }

    if (key) {
      const category = await getCategory(locale, key);
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      return NextResponse.json({ ...category, key });
    }

    const categories = await getCategories(locale);
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('GET /api/admin/videosys-categories error:', error);
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey') {
      return NextResponse.json({});
    }
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sourceLocale, targetLocale, key, locale, category } = body;

    // ---- 复制操作 ----
    if (action === 'copy') {
      if (!sourceLocale || !targetLocale || !key) {
        return NextResponse.json({ error: '缺少必要参数 (sourceLocale, targetLocale, key)' }, { status: 400 });
      }
      if (sourceLocale === targetLocale) {
        return NextResponse.json({ error: '源语言和目标语言不能相同' }, { status: 400 });
      }
      await copyCategory(sourceLocale, targetLocale, key);
      return NextResponse.json({ success: true });
    }

    // ---- 普通创建/更新 ----
    if (!locale || !key || !category) {
      return NextResponse.json({ error: '缺少必要字段 (locale, key, category)' }, { status: 400 });
    }

    // 检查分类是否存在
    const existing = await getCategory(locale, key);

    if (existing) {
      // ---- 更新 ----
      // 保留 isSystem 标志
      if (existing.isSystem === true) {
        category.isSystem = true;
      }
      await updateCategory(locale, key, {
        name: category.name,
        slug: category.slug,
        order: category.order,
        commentStatus: category.commentStatus,
        template: category.template,
        seo_keywords: category.seo_keywords || '',
        seo_title: category.seo_title || '',
        seo_description: category.seo_description || '',
        isSystem: category.isSystem,
      });
    } else {
      // ---- 新建（指定 key） ----
      await createCategoryWithKey(locale, key, {
        name: category.name || '',
        slug: category.slug || key,
        order: category.order ?? 0,
        commentStatus: category.commentStatus || 'allowed',
        template: category.template || '',
        seo_keywords: category.seo_keywords || '',
        seo_title: category.seo_title || '',
        seo_description: category.seo_description || '',
        isSystem: false, // 新建的非系统分类
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/admin/videosys-categories error:', error);
    return NextResponse.json({ error: error.message || '操作失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // 保留 PUT 兼容（与 POST 逻辑相同，但只处理更新，不处理新建）
  try {
    const body = await req.json();
    const { locale, key, category } = body;
    if (!locale || !key || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await getCategory(locale, key);
    if (!existing) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    if (existing.isSystem === true) {
      category.isSystem = true;
    } else {
      category.isSystem = false;
    }

    await updateCategory(locale, key, {
      name: category.name,
      slug: category.slug,
      order: category.order,
      commentStatus: category.commentStatus,
      template: category.template,
      seo_keywords: category.seo_keywords || '',
      seo_title: category.seo_title || '',
      seo_description: category.seo_description || '',
      isSystem: category.isSystem,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/admin/videosys-categories error:', error);
    return NextResponse.json({ error: error.message || '更新失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const videos = await getAllVideos(locale);
    const used = videos.some(v => v.category === key);
    if (used) {
      return NextResponse.json({ error: '该分类下还有视频，无法删除' }, { status: 400 });
    }

    await deleteCategory(locale, key);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/admin/videosys-categories error:', error);
    return NextResponse.json(
      { error: error.message || '删除失败' },
      { status: error.message.includes('系统分类') ? 400 : 500 }
    );
  }
}