// app/api/admin/products/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getCategories,
  getProductLines,
  saveCategories,
  saveProductLines,
} from '@/lib/products/services';

// ========== 内存缓存 ==========
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 分钟（可根据需要调整）

/**
 * GET /api/admin/products/categories?locale=zh
 * 返回该语言的所有产品线和分类数据（已排序），带缓存
 */
export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale') || 'zh';
    const cacheKey = `categories_${locale}`;

    // 1. 检查缓存
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // 2. 并行获取数据
    const [productLines, categories] = await Promise.all([
      getProductLines(locale),
      getCategories(locale),
    ]);

    const data = { productLines, categories };

    // 3. 写入缓存
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products/categories?locale=zh
 * 完全替换该语言的产品线和分类数据，并更新图片引用
 * 请求体格式：{ productLines: [...], categories: [...] }
 */
export async function PUT(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale') || 'zh';
    const body = await request.json();

    if (!body.productLines || !body.categories) {
      return NextResponse.json(
        { error: '缺少 productLines 或 categories 字段' },
        { status: 400 }
      );
    }

    await saveProductLines(locale, body.productLines);
    await saveCategories(locale, body.categories);

    // 🔄 保存成功后清除该语言的缓存，确保下次读取最新数据
    const cacheKey = `categories_${locale}`;
    cache.delete(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json(
      { error: '保存失败' },
      { status: 500 }
    );
  }
}