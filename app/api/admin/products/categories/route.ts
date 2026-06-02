// app/api/admin/products/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function getDataPath(locale: string) {
  return path.join(process.cwd(), 'data/products', locale, 'categories.json');
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
  templateId: string;               // ✅ 替换原有的 pageTemplate
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  attributeTemplateId: string;
  series: Series[];
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
    templateId: String(raw.templateId || ''),    // ✅ 使用 templateId
    image: String(raw.image || ''),
    description: String(raw.description || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
    attributeTemplateId: String(raw.attributeTemplateId || ''),
    series: (raw.series || []).map(normalizeSeries),
  };
}

function normalizeProductLine(raw: any) {
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
    const filePath = getDataPath(locale);
    let rawData;
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      rawData = JSON.parse(content);
    } catch {
      rawData = { productLines: [], categories: [] };
    }
    const productLines = (rawData.productLines || []).map(normalizeProductLine);
    const categories = (rawData.categories || []).map(normalizeCategory);
    productLines.sort((a, b) => a.order - b.order);
    categories.sort((a, b) => a.order - b.order);
    for (const cat of categories) {
      cat.series.sort((a, b) => a.order - b.order);
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
    const filePath = getDataPath(locale);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(cleanData, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}