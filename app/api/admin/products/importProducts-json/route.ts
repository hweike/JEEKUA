// app/api/admin/products/importProducts-json/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getProductSettings } from '@/lib/products/productSettings';
import {
  getProductLineIdFromCategory,
  getProductIndex,
  upsertProductIndex,
  getAllProductIds,
} from '@/lib/products/indexDb';
import { writeProduct, readProduct } from '@/lib/products/mdParser';
import { generateSlug, generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { getPrivateStorage } from '@/lib/storage/factory';
import { supabase } from '@/lib/supabase/client';
import { downloadAndSaveImage } from '@/lib/files/download';

const DEFAULT_SITE_ID = '000001';

interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

// 批次内缓存和并发控制
const imageCache = new Map<string, string>();
const pendingDownloads = new Map<string, Promise<string>>();

// ==================== 辅助函数 ====================
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    const parts = pathname.split('/');
    let filename = parts[parts.length - 1];
    const queryIndex = filename.indexOf('?');
    if (queryIndex !== -1) filename = filename.slice(0, queryIndex);
    return filename;
  } catch {
    const parts = url.split('/');
    let filename = parts[parts.length - 1];
    const queryIndex = filename.indexOf('?');
    if (queryIndex !== -1) filename = filename.slice(0, queryIndex);
    return filename;
  }
}

function sanitizeBrandForFilename(brand: string): string {
  return brand.replace(/[^\p{L}\p{N}-]/gu, '').trim();
}

async function getSiteName(): Promise<string> {
  const storage = getPrivateStorage();
  const key = 'settings.json';
  try {
    const content = await storage.read(key, 'utf8');
    const settings = JSON.parse(content as string);
    return settings.site_name || '我的网站';
  } catch {
    return '我的网站';
  }
}

let categoriesCache: any[] | null = null;
async function loadCategories(locale: string): Promise<any[]> {
  if (categoriesCache) return categoriesCache;
  const storage = getPrivateStorage();
  const key = `products/${locale}/categories.json`;
  try {
    const content = await storage.read(key, 'utf8');
    const data = JSON.parse(content as string);
    categoriesCache = data.categories || [];
    return categoriesCache;
  } catch {
    categoriesCache = [];
    return [];
  }
}

async function getTopLevelCategoryName(locale: string, categoryId: string): Promise<string> {
  if (!categoryId || categoryId === '__UNCATEGORIZED__') return '';
  const categories = await loadCategories(locale);
  const cat = categories.find((c: any) => c.id === categoryId);
  if (cat) {
    if (!cat.parentId) return cat.name;
    const parent = categories.find((c: any) => c.id === cat.parentId);
    return parent ? parent.name : cat.name;
  }
  return '';
}

async function getProductType(locale: string, categoryId: string, seriesId?: string): Promise<string> {
  if (!categoryId || categoryId === '__UNCATEGORIZED__') return '';
  const categories = await loadCategories(locale);
  const cat = categories.find((c: any) => c.id === categoryId);
  if (!cat) return '';
  let type = cat.name;
  if (seriesId && cat.series) {
    const series = cat.series.find((s: any) => s.id === seriesId);
    if (series) type = `${cat.name} > ${series.name}`;
  }
  return type;
}

function processMpn(defaultMpn: string, sku: string): string {
  if (!defaultMpn) return '';
  return defaultMpn.replace(/\{SKU\}/g, sku);
}

function generateSkuFromRule(rule: string): string {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return rule.replace(/\{timestamp\}/g, randomNum.toString());
}

function getCertificationBadge(value: string): string {
  const lowerVal = value.toLowerCase();
  if (lowerVal.includes('ce')) return '<span class="badge-ce">CE</span>';
  if (lowerVal.includes('cb')) return '<span class="badge-cb">CB</span>';
  if (lowerVal.includes('ccc')) return '<span class="badge-ccc">CCC</span>';
  if (lowerVal.includes('ul')) return '<span class="badge-ul">UL</span>';
  if (lowerVal.includes('rohs')) return '<span class="badge-rohs">RoHS</span>';
  return value;
}

function attributesToHtml(attrs: Record<string, string>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return '';
  const htmlParts = entries.map(([key, value]) => {
    let processedValue = value;
    if (key === '技术手册') {
      const urlMatch = value.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[0];
        processedValue = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="pdf-link">📄 技术手册</a>`;
      }
    } else if (key === '认证/标准') {
      processedValue = getCertificationBadge(value);
    } else if (key === '资料下载(3D/PCB封装库/原理图库)') {
      const urlMatch = value.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[0];
        processedValue = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="download-link">📎 下载资料</a>`;
      }
    }
    return `<p><strong>${key}:</strong> ${processedValue}</p>`;
  });
  return htmlParts.join('');
}

async function findCategoryByName(locale: string, categoryName: string): Promise<{ categoryId: string; seriesId: string } | null> {
  const categories = await loadCategories(locale);
  const category = categories.find((c: any) => c.name === categoryName);
  if (category) {
    return { categoryId: category.id, seriesId: '' };
  }
  for (const cat of categories) {
    const series = cat.series?.find((s: any) => s.name === categoryName);
    if (series) {
      return { categoryId: cat.id, seriesId: series.id };
    }
  }
  return null;
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  let index = 0;
  const enqueue = async () => {
    if (index >= tasks.length) return;
    const taskIndex = index++;
    const task = tasks[taskIndex];
    const result = await task();
    results[taskIndex] = result;
    await enqueue();
  };
  for (let i = 0; i < Math.min(limit, tasks.length); i++) {
    executing.push(enqueue());
  }
  await Promise.all(executing);
  return results;
}

// ==================== 核心处理函数 ====================
async function processProductItem(
  item: any,
  locale: string,
  defaultSettings: any,
  siteName: string,
  skuRule: string,
  generateUniqueId: () => string
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const rawData = item.rawData;
  if (!rawData) {
    return { success: false, error: '缺少 rawData 字段' };
  }

  const { categoryName, brand, parent_product_name, parent_product_sku, parent_product_imageUrl, attributes, variants } = rawData;
  if (!categoryName || !brand || !parent_product_name || !parent_product_sku) {
    return { success: false, error: 'JSON 缺少必要字段 (categoryName, brand, parent_product_name, parent_product_sku)' };
  }

  const categoryInfo = await findCategoryByName(locale, categoryName);
  if (!categoryInfo) {
    return { success: false, error: `分类 "${categoryName}" 不存在` };
  }
  const { categoryId, seriesId } = categoryInfo;

  // 修改：父产品名称 = 品牌 + 产品名称（不再加一级分类名）
  const productName = `${brand} ${parent_product_name}`.trim();

  let productLineId = '';
  if (categoryId) {
    productLineId = await getProductLineIdFromCategory(locale, categoryId);
  }

  let sku = parent_product_sku?.trim();
  if (!sku) sku = generateSkuFromRule(skuRule);
  else sku = sku.trim();

  const { data: existingProduct, error: queryError } = await supabase
    .from('products')
    .select('productId, createdAt')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('sku', sku)
    .is('parent_product_id', null)
    .maybeSingle();

  if (queryError) {
    return { success: false, error: `数据库查询失败: ${queryError.message}` };
  }

  const isUpdate = !!existingProduct;
  const productId = isUpdate ? existingProduct.productId : generateUniqueId();

  // 处理主图
  const mainImageKey = parent_product_imageUrl
    ? await downloadAndSaveImage(parent_product_imageUrl, {
        referenceType: 'product',
        referenceId: productId,
        cache: imageCache,
        pending: pendingDownloads,
      })
    : '';

  // 处理变体图片
  const variantsWithImages = await Promise.all((variants || []).map(async (variant: any) => {
    let variantImageKey = '';
    if (variant.product_imageUrl) {
      variantImageKey = await downloadAndSaveImage(variant.product_imageUrl, {
        referenceType: 'product',
        referenceId: productId,
        cache: imageCache,
        pending: pendingDownloads,
      });
    }
    return {
      ...variant,
      localImageKey: variantImageKey,
    };
  }));

  const description = attributesToHtml(attributes);
  const shortDescription = '';

  const priceTiers: PriceTier[] = [{ min_qty: 10, max_qty: null, price: 0 }];
  const minOrderQuantity = 10;
  const extractedPrice = 0;

  const slug = generateSlug(productName);
  let seoTitle = generateSeoTitle(
    productName, brand, minOrderQuantity, siteName,
    defaultSettings.auto_seo_title_template || ''
  );
  let seoDescription = generateSeoDescription(
    description, priceTiers, '',
    defaultSettings.auto_seo_desc_template || '',
    defaultSettings.default_currency || 'USD'
  );

  let mpn = '';
  if (defaultSettings.default_mpn) {
    mpn = processMpn(defaultSettings.default_mpn, sku);
  }

  const product_type = await getProductType(locale, categoryId, seriesId);

  let productData: any = {
    id: productId,
    product_name: productName,
    brand,
    sku,
    mpn,
    gtin: '',
    price_tiers: priceTiers,
    currency: defaultSettings.default_currency || 'USD',
    identifier_exists: false,
    price: extractedPrice,
    spec_text: '',
    availability: defaultSettings.default_availability || 'in_stock',
    min_order_quantity: minOrderQuantity,
    main_image_url: mainImageKey,
    additional_images: [],
    description,
    short_description: shortDescription,
    attributes: attributes || {},
    product_type,
    google_product_category: 0,
    seo_title: seoTitle,
    seo_description: seoDescription,
    seo_keywords: '',
    slug,
    shipping_cost: defaultSettings.default_shipping_cost ?? 0,
    return_policy_days: defaultSettings.default_return_days ?? 30,
    aggregate_rating: null,
    categoryId,
    seriesId: seriesId || '',
    parent_product_id: '',
    variants: [],
    templateId: 'default_product_published',
  };

  if (isUpdate) {
    const existingMd = await readProduct(locale, productId);
    productData.variants = existingMd?.variants || [];
  }

  const now = new Date().toISOString();
  await upsertProductIndex({
    productId,
    locale,
    productLineId: productLineId || '',
    categoryId,
    seriesId: seriesId || '',
    parent_product_id: null,
    sku,
    product_name: productName,
    brand,
    price_tiers: priceTiers,
    currency: defaultSettings.default_currency || 'USD',
    availability: defaultSettings.default_availability || 'in_stock',
    min_order_quantity: minOrderQuantity,
    main_image_url: mainImageKey,
    attributes: attributes || {},
    slug,
    status: 'published',
    updatedAt: now,
    createdAt: isUpdate ? existingProduct.createdAt : now,
  });
  await writeProduct(locale, productId, productData, '');

  // 处理变体
  const variantItems: any[] = [];
  for (const variant of variantsWithImages) {
    let variantSku = variant.product_sku?.trim();
    if (!variantSku) variantSku = generateSkuFromRule(skuRule);
    else variantSku = variantSku.trim();

    const { data: existingVariant, error: variantQueryError } = await supabase
      .from('products')
      .select('productId, createdAt')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .eq('sku', variantSku)
      .not('parent_product_id', 'is', null)
      .maybeSingle();

    if (variantQueryError) {
      console.error(`查询变体失败 (SKU: ${variantSku}):`, variantQueryError);
      continue;
    }

    const isVariantUpdate = !!existingVariant;
    const variantId = isVariantUpdate ? existingVariant.productId : generateUniqueId();

    const variantName = variant.product_name || `${productName} - ${variantSku}`;
    const variantSlug = generateSlug(variantName);
    const variantImageKey = variant.localImageKey || '';

    // 生成变体的富文本描述（基于属性）
    const variantDescription = attributesToHtml(variant.attributes || {});
    const variantShortDesc = '';

    const variantSeoTitle = generateSeoTitle(
      variantName, brand, minOrderQuantity, siteName,
      defaultSettings.auto_seo_title_template || ''
    );
    // 使用 variantDescription 作为 SEO 描述的基础
    const variantSeoDescription = generateSeoDescription(
      variantDescription, priceTiers, '',
      defaultSettings.auto_seo_desc_template || '',
      defaultSettings.default_currency || 'USD'
    );

    // 变体数据（存入父产品的 variants 数组，包含 description）
    const variantData = {
      id: variantId,
      product_name: variantName,
      sku: variantSku,
      short_description: variantShortDesc,
      description: variantDescription,        // 富文本描述，仅存于 MD 文件
      main_image_url: variantImageKey,
      additional_images: [],
      attributes: variant.attributes || {},
      slug: variantSlug,
      seo_keywords: '',
      seo_title: variantSeoTitle,
      seo_description: variantSeoDescription,
    };

    if (!productData.variants) productData.variants = [];
    if (isVariantUpdate) {
      const idx = productData.variants.findIndex((v: any) => v.id === variantId);
      if (idx !== -1) productData.variants[idx] = variantData;
      else productData.variants.push(variantData);
    } else {
      productData.variants.push(variantData);
    }

    // 写入 products 表（不包含 description 字段）
    const variantRecord = {
      productId: variantId,
      site_id: DEFAULT_SITE_ID,
      locale,
      sku: variantSku,
      product_name: variantName,
      parent_product_id: productId,
      brand: productData.brand,
      currency: productData.currency,
      availability: productData.availability,
      min_order_quantity: productData.min_order_quantity,
      price_tiers: JSON.stringify(productData.price_tiers),
      main_image_url: variantImageKey,
      slug: variantSlug,
      status: 'published',
      createdAt: isVariantUpdate ? existingVariant.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productLineId: productLineId || '',
      categoryId,
      seriesId: seriesId || '',
      templateId: productData.templateId,
    };

    if (isVariantUpdate) {
      await supabase.from('products').update(variantRecord).eq('productId', variantId);
    } else {
      await supabase.from('products').insert(variantRecord);
    }

    await upsertProductIndex({
      productId: variantId,
      locale,
      productLineId: productLineId || '',
      categoryId,
      seriesId: seriesId || '',
      parent_product_id: productId,
      sku: variantSku,
      product_name: variantName,
      brand: productData.brand,
      price_tiers: priceTiers,
      currency: productData.currency,
      availability: productData.availability,
      min_order_quantity: minOrderQuantity,
      main_image_url: variantImageKey,
      attributes: variant.attributes || {},
      slug: variantSlug,
      status: 'published',
      updatedAt: new Date().toISOString(),
      createdAt: isVariantUpdate ? existingVariant.createdAt : new Date().toISOString(),
      templateId: productData.templateId,
    });

    variantItems.push(variantData);
  }

  // 如果有变体，更新父产品的 MD 文件（因为变体数据已修改）
  if (variantItems.length > 0) {
    await writeProduct(locale, productId, productData, '');
    const parentIndex = await getProductIndex(productId, locale);
    if (parentIndex) {
      await upsertProductIndex({
        ...parentIndex,
        variants: productData.variants.map((v: any) => ({
          sku: v.sku,
          name: v.product_name,
          mainImage: v.main_image_url,
        })),
        updatedAt: now,
      });
    }
  }

  return { success: true, productId };
}

// ==================== POST 入口 ====================
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const locale = (formData.get('locale') as string) || 'zh';

  if (!file) {
    return NextResponse.json({ error: '未上传文件' }, { status: 400 });
  }
  if (!file.name.endsWith('.json')) {
    return NextResponse.json({ error: '请上传 JSON 文件' }, { status: 400 });
  }

  try {
    const fileContent = await file.text();
    const jsonData = JSON.parse(fileContent);
    const items = Array.isArray(jsonData) ? jsonData : [jsonData];

    await loadCategories(locale);

    const productSettings = await getProductSettings(locale);
    const defaultSettings = (productSettings as any).defaultSettings || {};
    const siteName = await getSiteName();
    const skuRule = defaultSettings.sku_rule || 'P-{timestamp}';

    const existingIds = await getAllProductIds(locale);
    const usedIds = new Set(existingIds);
    const generateUniqueId = (): string => {
      let id: string;
      do {
        id = nanoid(6);
      } while (usedIds.has(id));
      usedIds.add(id);
      return id;
    };

    const tasks = items.map((item) => async () => {
      return await processProductItem(
        item, locale, defaultSettings, siteName, skuRule, generateUniqueId
      );
    });

    const CONCURRENT_LIMIT = 10;
    const results = await runWithConcurrency(tasks, CONCURRENT_LIMIT);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const message = failCount === 0
      ? `成功导入 ${successCount} 个产品系列`
      : `成功 ${successCount} 个，失败 ${failCount} 个`;
    console.log(`导入完成，总耗时 ${Date.now() - startTime}ms`);
    return NextResponse.json({ message, results });
  } catch (error: any) {
    console.error('JSON 导入失败:', error);
    return NextResponse.json({ error: error.message || '导入失败' }, { status: 500 });
  }
}