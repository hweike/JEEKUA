// app/api/admin/products/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中存储路径（无 data/ 前缀）
function getStorageKey(locale: string): string {
  return `products/${locale}/categories.json`;
}

interface Series {
  id: string;
  name: string;
  slug: string;
  order: number;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  productLineId: string;
  templateId: string;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  attributeTemplateId: string;
  series: Series[];
}

interface ProductLine {
  id: string;
  name: string;
  order: number;
  templateId: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

function normalizeSeries(raw: any): Series {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    slug: String(raw.slug || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    image: String(raw.image || ''),
    description: String(raw.description || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
  };
}

function normalizeCategory(raw: any): Category {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    slug: String(raw.slug || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    productLineId: String(raw.productLineId || ''),
    templateId: String(raw.templateId || ''),
    image: String(raw.image || ''),
    description: String(raw.description || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
    attributeTemplateId: String(raw.attributeTemplateId || ''),
    series: (raw.series || []).map(normalizeSeries),
  };
}

function normalizeProductLine(raw: any): ProductLine {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    templateId: String(raw.templateId || ''),
    slug: String(raw.slug || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
  };
}

export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale') || 'zh';
    const storage = getPrivateStorage();
    const key = getStorageKey(locale);
    let rawData: any = { productLines: [], categories: [] };
    try {
      const content = await storage.read(key, 'utf8');
      rawData = JSON.parse(content as string);
    } catch (error: any) {
      // 文件不存在时使用默认空结构（兼容 AWS SDK 错误）
      if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
        rawData = { productLines: [], categories: [] };
      } else {
        throw error;
      }
    }
    const productLines = (rawData.productLines || []).map(normalizeProductLine);
    const categories = (rawData.categories || []).map(normalizeCategory);
    productLines.sort((a: ProductLine, b: ProductLine) => a.order - b.order);
    categories.sort((a: Category, b: Category) => a.order - b.order);
    for (const cat of categories) {
      cat.series.sort((a: Series, b: Series) => a.order - b.order);
    }
    return NextResponse.json({ productLines, categories });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale') || 'zh';
    const body = await request.json();
    if (!body.productLines || !body.categories) {
      return NextResponse.json({ error: '缺少 productLines 或 categories 字段' }, { status: 400 });
    }
    const cleanedProductLines = (body.productLines || []).map(normalizeProductLine);
    const cleanedCategories = (body.categories || []).map(normalizeCategory);
    const cleanData = { productLines: cleanedProductLines, categories: cleanedCategories };
    const storage = getPrivateStorage();
    const key = getStorageKey(locale);
    await storage.write(key, JSON.stringify(cleanData, null, 2), { contentType: 'application/json' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}