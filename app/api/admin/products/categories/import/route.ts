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
    const key = `uploads/imported/${locale}/${fileName}`;
    const publicStorage = getPublicStorage();
    await publicStorage.write(key, Buffer.from(buffer), { contentType });
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
    const categoryByName = new Map<string, any>();
    const seriesByParentAndName = new Map<string, Map<string, any>>();

    for (const cat of existingCategories) {
      if (cat.slug) existingSlugs.add(cat.slug);
      categoryByName.set(cat.name, cat);
      if (cat.series) {
        const seriesMap = new Map<string, any>();
        for (const series of cat.series) {
          if (series.slug) existingSlugs.add(series.slug);
          seriesMap.set(series.name, series);
        }
        seriesByParentAndName.set(cat.id, seriesMap);
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

    // 辅助函数：处理一级分类
    async function processCategory1(
      category1Name: string,
      productLineName: string,
      description: string,
      slugRaw: string,
      attrTemplateInput: string | null,
      coverImageUrl: string,   // 注意：这里已经是字符串，可能为空
      seoKeywords: string,
      seoTitle: string,
      seoDescription: string,
      rowNum: number
    ): Promise<any> {
      let productLineId = null;
      if (productLineName) {
        productLineId = findProductLineId(productLines, productLineName);
        if (!productLineId) {
          errors.push(`第 ${rowNum} 行: 产品线“${productLineName}”不存在，产品线ID将留空`);
        }
      }
      if (!productLineId && contextProductLineId) {
        productLineId = contextProductLineId;
      }

      let baseSlug = slugRaw || generateSlugFromText(category1Name);
      let finalSlug = ensureUniqueSlug(baseSlug, existingSlugs);

      let existingCat = categoryByName.get(category1Name);
      if (existingCat) {
        // ===== 覆盖 =====
        if (existingCat.slug !== finalSlug) {
          existingSlugs.delete(existingCat.slug);
          existingCat.slug = finalSlug;
          existingSlugs.add(finalSlug);
        }
        existingCat.productLineId = productLineId || existingCat.productLineId;
        existingCat.description = description;
        existingCat.seoTitle = seoTitle;
        existingCat.seoDescription = seoDescription;
        existingCat.seoKeywords = seoKeywords;
        existingCat.attributeTemplateId = findAttributeTemplateId(attributeTemplates, attrTemplateInput || null) || existingCat.attributeTemplateId;

        // 处理图片：若 coverImageUrl 为空字符串，则清空图片；否则根据是否http处理
        if (coverImageUrl === '') {
          existingCat.image = '';
        } else if (coverImageUrl.startsWith('http')) {
          imageTasks.push({ target: existingCat, field: 'image', url: coverImageUrl, locale });
        } else {
          existingCat.image = coverImageUrl;
        }

        currentCategory1 = existingCat;
        successCount++;
        return existingCat;
      } else {
        // ===== 新增 =====
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
          image: '', // 先置空，后面根据coverImageUrl设置
          description,
          seoTitle,
          seoDescription,
          seoKeywords,
          attributeTemplateId: attributeTemplateId || '',
          series: [],
        };

        if (coverImageUrl === '') {
          newCategory.image = '';
        } else if (coverImageUrl.startsWith('http')) {
          imageTasks.push({ target: newCategory, field: 'image', url: coverImageUrl, locale });
        } else {
          newCategory.image = coverImageUrl;
        }

        newCategories.push(newCategory);
        categoryByName.set(category1Name, newCategory);
        existingSlugs.add(finalSlug);
        currentCategory1 = newCategory;
        successCount++;
        return newCategory;
      }
    }

    // 辅助函数：处理二级分类
    async function processCategory2(
      parentCategory: any,
      category2Name: string,
      description: string,
      slugRaw: string,
      coverImageUrl: string,
      seoKeywords: string,
      seoTitle: string,
      seoDescription: string,
      rowNum: number
    ): Promise<void> {
      if (!parentCategory) {
        errors.push(`第 ${rowNum} 行: 二级分类“${category2Name}”没有对应的一级分类，跳过`);
        skipCount++;
        return;
      }

      let baseSlug = slugRaw || generateSlugFromText(category2Name);
      let finalSlug = ensureUniqueSlug(baseSlug, existingSlugs);

      let seriesMap = seriesByParentAndName.get(parentCategory.id);
      let existingSeries = seriesMap ? seriesMap.get(category2Name) : undefined;

      if (existingSeries) {
        // ===== 覆盖 =====
        if (existingSeries.slug !== finalSlug) {
          existingSlugs.delete(existingSeries.slug);
          existingSeries.slug = finalSlug;
          existingSlugs.add(finalSlug);
        }
        existingSeries.description = description;
        existingSeries.seoTitle = seoTitle;
        existingSeries.seoDescription = seoDescription;
        existingSeries.seoKeywords = seoKeywords;

        // 处理图片
        if (coverImageUrl === '') {
          existingSeries.image = '';
        } else if (coverImageUrl.startsWith('http')) {
          imageTasks.push({ target: existingSeries, field: 'image', url: coverImageUrl, locale });
        } else {
          existingSeries.image = coverImageUrl;
        }

        successCount++;
      } else {
        // ===== 新增 =====
        let seriesImage = '';
        if (coverImageUrl === '') {
          seriesImage = '';
        } else if (coverImageUrl.startsWith('http')) {
          // 图片稍后下载
        } else {
          seriesImage = coverImageUrl;
        }

        const newSeries = {
          id: generateCategoryId(),
          name: category2Name,
          slug: finalSlug,
          order: (parentCategory.series?.length || 0),
          image: seriesImage,
          description,
          seoTitle,
          seoDescription,
          seoKeywords,
        };

        if (coverImageUrl && coverImageUrl.startsWith('http')) {
          imageTasks.push({ target: newSeries, field: 'image', url: coverImageUrl, locale });
        }

        if (!parentCategory.series) parentCategory.series = [];
        parentCategory.series.push(newSeries);
        if (!seriesByParentAndName.has(parentCategory.id)) {
          seriesByParentAndName.set(parentCategory.id, new Map());
        }
        seriesByParentAndName.get(parentCategory.id)!.set(category2Name, newSeries);
        existingSlugs.add(finalSlug);
        successCount++;
      }
    }

    // 主循环
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const productLineName = row[col.productLineName]?.toString().trim() || '';
      const category1Name = row[col.category1Name]?.toString().trim() || '';
      const category2Name = row[col.category2Name]?.toString().trim() || '';
      const description = row[col.description]?.toString().trim() || '';
      const slugRaw = row[col.slug]?.toString().trim();
      const attrTemplateInput = row[col.attributeTemplate]?.toString().trim();
      // 关键：封面图片URL转为字符串，空值即为 ''
      const coverImageUrl = row[col.coverImage]?.toString().trim() || '';
      const seoKeywords = row[col.seoKeywords]?.toString().trim() || '';
      const seoTitle = row[col.seoTitle]?.toString().trim() || '';
      const seoDescription = row[col.seoDescription]?.toString().trim() || '';

      // 优先处理二级分类
      if (category2Name) {
        let parent: any = null;
        if (category1Name) {
          parent = categoryByName.get(category1Name);
          if (!parent) {
            errors.push(`第 ${i+1} 行: 二级分类“${category2Name}”指定的一级分类“${category1Name}”不存在，跳过`);
            skipCount++;
            continue;
          }
        } else {
          parent = currentCategory1;
          if (!parent) {
            errors.push(`第 ${i+1} 行: 二级分类“${category2Name}”没有关联的一级分类，且未指定一级分类名称，跳过`);
            skipCount++;
            continue;
          }
        }
        await processCategory2(parent, category2Name, description, slugRaw, coverImageUrl, seoKeywords, seoTitle, seoDescription, i+1);
      } 
      else if (category1Name) {
        await processCategory1(category1Name, productLineName, description, slugRaw, attrTemplateInput, coverImageUrl, seoKeywords, seoTitle, seoDescription, i+1);
      }
    }

    // 执行所有图片下载任务
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

    // 保存数据
    const finalData = { productLines, categories: newCategories };
    const privateStorage = getPrivateStorage();
    const key = `products/${locale}/categories.json`;
    await privateStorage.write(key, JSON.stringify(finalData, null, 2), { contentType: 'application/json' });

    const message = `导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条。${errors.length ? `错误详情: ${errors.join('; ')}` : ''}`;
    return NextResponse.json({ success: true, message, successCount, skipCount, errors });
  } catch (error: any) {
    console.error('导入分类失败:', error);
    return NextResponse.json({ error: '导入失败: ' + error.message }, { status: 500 });
  }
}