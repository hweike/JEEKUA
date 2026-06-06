// app/api/admin/products/categories/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { getAllCategories } from '@/lib/products/categories';
import { toPinyin } from '@/lib/utils/pinyin';
import { getPrivateStorage, getPublicStorage } from '@/lib/storage/factory';

function generateCategoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function generateSlugFromText(text: string): string {
  if (!text) return '';
  const parts: string[] = [];
  let currentWord = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[a-zA-Z]/.test(ch)) {
      currentWord += ch;
    } else {
      if (currentWord) {
        parts.push(currentWord.toLowerCase());
        currentWord = '';
      }
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        const pinyin = toPinyin(ch);
        parts.push(pinyin);
      } else if (/[0-9]/.test(ch)) {
        parts.push(ch);
      } else if (ch === ' ' || ch === '_' || ch === '-') {
        continue;
      }
    }
  }
  if (currentWord) {
    parts.push(currentWord.toLowerCase());
  }
  let slug = parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) {
    slug = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return slug;
}

function ensureUniqueSlug(slug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(slug)) return slug;
  let counter = 1;
  let newSlug = `${slug}-${counter}`;
  while (existingSlugs.has(newSlug)) {
    counter++;
    newSlug = `${slug}-${counter}`;
  }
  return newSlug;
}

// 下载图片并保存到公开桶，返回公开 URL
async function downloadAndSaveImage(url: string, locale: string): Promise<string> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`下载失败: ${res.status}`);
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const fileName = `import_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    const key = `uploads/imported/${locale}/${fileName}`; // 公开桶中的路径
    const publicStorage = getPublicStorage();
    await publicStorage.write(key, Buffer.from(buffer), { contentType });
    // 返回公开访问 URL（优先使用自定义域名）
    return publicStorage.getPublicUrl(key);
  } catch (err) {
    console.error(`图片下载失败: ${url}`, err);
    return url;
  }
}

function findProductLineId(productLines: any[], name: string): string | null {
  if (!name) return null;
  const line = productLines.find(pl => pl.name === name);
  return line ? line.id : null;
}

function findAttributeTemplateId(templates: any[], input: string | null): string | null {
  if (!input) return null;
  const tpl = templates.find(t => t.id === input || t.name === input);
  return tpl ? tpl.id : null;
}

let cachedAttributeTemplates: any[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

async function getAttributeTemplates(locale: string): Promise<any[]> {
  const now = Date.now();
  if (cachedAttributeTemplates.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedAttributeTemplates;
  }
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/admin/products/settings?locale=${locale}`);
    const productSettings = await res.json();
    cachedAttributeTemplates = productSettings.attributeTemplates || [];
  } catch (err) {
    console.error('获取属性模板失败', err);
    cachedAttributeTemplates = [];
  }
  cacheTimestamp = now;
  return cachedAttributeTemplates;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const locale = (formData.get('locale') as string) || 'zh';
    const contextProductLineId = (formData.get('productLineId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: '文件内容为空' }, { status: 400 });
    }

    const col = {
      productLineName: 0,
      category1Name: 1,
      category2Name: 2,
      description: 3,
      slug: 4,
      attributeTemplate: 5,
      coverImage: 6,
      seoKeywords: 7,
      seoTitle: 8,
      seoDescription: 9,
    };

    const { productLines, categories: existingCategories } = await getAllCategories(locale);
    const attributeTemplates = await getAttributeTemplates(locale);

    const existingSlugs = new Set<string>();
    const existingCategoryByName = new Map<string, any>();
    for (const cat of existingCategories) {
      if (cat.slug) existingSlugs.add(cat.slug);
      existingCategoryByName.set(cat.name, cat);
      if (cat.series) {
        for (const series of cat.series) {
          if (series.slug) existingSlugs.add(series.slug);
        }
      }
    }

    const productLineOrderMap = new Map<string, number>();
    for (const cat of existingCategories) {
      const plId = cat.productLineId;
      if (plId) {
        const currentMax = productLineOrderMap.get(plId) || 0;
        productLineOrderMap.set(plId, Math.max(currentMax, cat.order + 1));
      }
    }

    let successCount = 0, skipCount = 0;
    const errors: string[] = [];
    const newCategories = [...existingCategories];
    let currentCategory1: any = null;

    type ImageTask = {
      target: any;
      field: string;
      url: string;
      locale: string;
    };
    const imageTasks: ImageTask[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const productLineName = row[col.productLineName]?.toString().trim();
      const category1Name = row[col.category1Name]?.toString().trim();
      const category2Name = row[col.category2Name]?.toString().trim();
      const description = row[col.description]?.toString().trim() || '';
      const slugRaw = row[col.slug]?.toString().trim();
      const attrTemplateInput = row[col.attributeTemplate]?.toString().trim();
      const coverImageUrl = row[col.coverImage]?.toString().trim();
      const seoKeywords = row[col.seoKeywords]?.toString().trim() || '';
      const seoTitle = row[col.seoTitle]?.toString().trim() || '';
      const seoDescription = row[col.seoDescription]?.toString().trim() || '';

      if (category1Name) {
        let productLineId = null;
        if (productLineName) {
          productLineId = findProductLineId(productLines, productLineName);
          if (!productLineId) {
            errors.push(`第 ${i+1} 行: 产品线“${productLineName}”不存在，产品线ID将留空`);
          }
        }
        if (!productLineId && contextProductLineId) {
          productLineId = contextProductLineId;
        }

        let baseSlug = slugRaw || generateSlugFromText(category1Name);
        let finalSlug = ensureUniqueSlug(baseSlug, existingSlugs);
        const existingCat = existingCategoryByName.get(category1Name) || newCategories.find(c => c.slug === finalSlug);
        if (existingCat) {
          errors.push(`第 ${i+1} 行: 一级分类“${category1Name}”已存在，跳过`);
          skipCount++;
          currentCategory1 = null;
          continue;
        }

        const attributeTemplateId = findAttributeTemplateId(attributeTemplates, attrTemplateInput || null);
        const order = productLineOrderMap.get(productLineId) || 0;
        productLineOrderMap.set(productLineId, order + 1);

        const newCategory = {
          id: generateCategoryId(),
          name: category1Name,
          slug: finalSlug,
          order,
          productLineId: productLineId || '',
          templateId: 'default_product_category_published',
          image: coverImageUrl && coverImageUrl.startsWith('http') ? '' : (coverImageUrl || ''),
          description,
          seoTitle,
          seoDescription,
          seoKeywords,
          attributeTemplateId: attributeTemplateId || '',
          series: [],
        };

        if (coverImageUrl && coverImageUrl.startsWith('http')) {
          imageTasks.push({
            target: newCategory,
            field: 'image',
            url: coverImageUrl,
            locale,
          });
        }

        newCategories.push(newCategory);
        currentCategory1 = newCategory;
        existingSlugs.add(finalSlug);
        successCount++;
      } else if (category2Name && currentCategory1) {
        let baseSlug = slugRaw || generateSlugFromText(category2Name);
        let finalSlug = ensureUniqueSlug(baseSlug, existingSlugs);
        const seriesExists = (currentCategory1.series || []).some((s: any) => s.slug === finalSlug || s.name === category2Name);
        if (seriesExists) {
          errors.push(`第 ${i+1} 行: 二级分类“${category2Name}”已存在，跳过`);
          skipCount++;
          continue;
        }

        let seriesImage = '';
        if (coverImageUrl && coverImageUrl.startsWith('http')) {
          seriesImage = '';
        } else if (coverImageUrl) {
          seriesImage = coverImageUrl;
        }

        const newSeries = {
          id: generateCategoryId(),
          name: category2Name,
          slug: finalSlug,
          order: (currentCategory1.series?.length || 0),
          image: seriesImage,
          description,
          seoTitle,
          seoDescription,
          seoKeywords,
        };

        if (coverImageUrl && coverImageUrl.startsWith('http')) {
          imageTasks.push({
            target: newSeries,
            field: 'image',
            url: coverImageUrl,
            locale,
          });
        }

        if (!currentCategory1.series) currentCategory1.series = [];
        currentCategory1.series.push(newSeries);
        existingSlugs.add(finalSlug);
        successCount++;
      } else if (category2Name && !currentCategory1) {
        errors.push(`第 ${i+1} 行: 二级分类“${category2Name}”没有对应的一级分类，跳过`);
        skipCount++;
      }
    }

    if (imageTasks.length > 0) {
      await Promise.all(imageTasks.map(async (task) => {
        try {
          const localPath = await downloadAndSaveImage(task.url, task.locale);
          task.target[task.field] = localPath;
        } catch (err) {
          console.error(`下载图片失败: ${task.url}`, err);
          task.target[task.field] = task.url;
        }
      }));
    }

    // 保存最终数据到私有桶
    const finalData = { productLines, categories: newCategories };
    const privateStorage = getPrivateStorage();
    const key = `products/${locale}/categories.json`; // 无 data/ 前缀
    await privateStorage.write(key, JSON.stringify(finalData, null, 2), { contentType: 'application/json' });

    const message = `导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条。${errors.length ? `错误详情: ${errors.join('; ')}` : ''}`;
    return NextResponse.json({ success: true, message, successCount, skipCount, errors });
  } catch (error: any) {
    console.error('导入分类失败:', error);
    return NextResponse.json({ error: '导入失败: ' + error.message }, { status: 500 });
  }
}