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
import { getPrivateStorage, getPublicStorage } from '@/lib/storage/factory';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = '000001';

interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

// 图片下载缓存（原始URL -> 最终云存储URL）
const imageCache = new Map<string, string>();
// 失败记录，避免重复尝试
const failedUrlCache = new Set<string>();

// 从URL中提取文件名（去除路径和查询参数）
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    // 去除开头的 /
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    // 提取最后一段
    const parts = pathname.split('/');
    let filename = parts[parts.length - 1];
    // 去除查询参数（如果还有）
    const queryIndex = filename.indexOf('?');
    if (queryIndex !== -1) filename = filename.slice(0, queryIndex);
    return filename;
  } catch {
    // 如果不是有效URL，直接返回最后一段
    const parts = url.split('/');
    let filename = parts[parts.length - 1];
    const queryIndex = filename.indexOf('?');
    if (queryIndex !== -1) filename = filename.slice(0, queryIndex);
    return filename;
  }
}

// 清理品牌名称，只保留字母、数字、中文、连字符，用于文件名
function sanitizeBrandForFilename(brand: string): string {
  return brand.replace(/[^\p{L}\p{N}-]/gu, '').trim();
}

// 下载图片并上传到云存储，返回公开URL。如果同一URL已经处理过，直接返回缓存结果。
async function downloadImageWithTimeout(url: string, brand: string, timeoutMs = 8000): Promise<string> {
  if (!url) return '';
  // 检查缓存
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  if (failedUrlCache.has(url)) {
    console.warn(`图片已失败过，跳过: ${url}`);
    return '';
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';

    // 生成新文件名：品牌-原文件名.扩展名
    const originalFilename = extractFileNameFromUrl(url);
    const baseName = originalFilename.includes('.') ? originalFilename.split('.').slice(0, -1).join('.') : originalFilename;
    const cleanBrand = sanitizeBrandForFilename(brand);
    const newFilename = `${cleanBrand}-${baseName}.${ext}`;
    const key = `uploads/imported/${newFilename}`;
    const publicStorage = getPublicStorage();
    await publicStorage.write(key, Buffer.from(buffer), { contentType });
    const publicUrl = publicStorage.getPublicUrl(key);
    // 存入缓存
    imageCache.set(url, publicUrl);
    return publicUrl;
  } catch (err: any) {
    console.error(`下载图片失败 (${url}):`, err.message);
    failedUrlCache.add(url);
    return '';
  }
}

// 从私有桶读取站点设置
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

// 从私有桶读取分类数据（一次性加载）
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

// 根据分类 ID 获取一级分类名称
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

// 辅助函数：生成认证标准徽章图标
function getCertificationBadge(value: string): string {
  const lowerVal = value.toLowerCase();
  if (lowerVal.includes('ce')) return '<span class="badge-ce">CE</span>';
  if (lowerVal.includes('cb')) return '<span class="badge-cb">CB</span>';
  if (lowerVal.includes('ccc')) return '<span class="badge-ccc">CCC</span>';
  if (lowerVal.includes('ul')) return '<span class="badge-ul">UL</span>';
  if (lowerVal.includes('rohs')) return '<span class="badge-rohs">RoHS</span>';
  // 默认返回原文本
  return value;
}

// 增强版：将 attributes 对象转换为 HTML（支持特殊字段处理）
function attributesToHtml(attrs: Record<string, string>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return '';

  const htmlParts = entries.map(([key, value]) => {
    let processedValue = value;

    // 特殊字段处理
    if (key === '技术手册') {
      // 假设 value 包含 URL
      const urlMatch = value.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[0];
        processedValue = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="pdf-link">
          📄 技术手册
        </a>`;
      } else {
        processedValue = value;
      }
    } 
    else if (key === '认证/标准') {
      processedValue = getCertificationBadge(value);
    }
    else if (key === '资料下载(3D/PCB封装库/原理图库)') {
      // 提取 URL 并生成链接
      const urlMatch = value.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[0];
        processedValue = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="download-link">
          📎 下载资料
        </a>`;
      } else {
        processedValue = value;
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

// 并发控制函数
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

// 处理单个产品项（父产品+变体）
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

  // 查找分类
  const categoryInfo = await findCategoryByName(locale, categoryName);
  if (!categoryInfo) {
    return { success: false, error: `分类 "${categoryName}" 不存在` };
  }
  const { categoryId, seriesId } = categoryInfo;

  const topLevelCategoryName = await getTopLevelCategoryName(locale, categoryId);
  const productName = `${brand} ${parent_product_name} ${topLevelCategoryName}`.trim();

  let productLineId = '';
  if (categoryId) {
    productLineId = await getProductLineIdFromCategory(locale, categoryId);
  }

  // 父产品 SKU
  let sku = parent_product_sku?.trim();
  if (!sku) sku = generateSkuFromRule(skuRule);
  else sku = sku.trim();

  // 查询父产品是否存在
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

  // 并发下载主图和所有变体图片（使用品牌名称）
  const mainImagePromise = downloadImageWithTimeout(parent_product_imageUrl, brand);
  const variantImagePromises = (variants || []).map(async (variant: any) => {
    const url = variant.product_imageUrl;
    // 变体图片使用相同的品牌（因为属于同一产品系列）
    const localUrl = url ? await downloadImageWithTimeout(url, brand) : '';
    return { ...variant, localImageUrl: localUrl };
  });
  const [mainImageUrl, variantsWithImages] = await Promise.all([mainImagePromise, Promise.all(variantImagePromises)]);

  const description = attributesToHtml(attributes);
  const shortDescription = '';

  const priceTiers: PriceTier[] = [{ min_qty: 10, max_qty: null, price: 0 }];
  const minOrderQuantity = 10;
  const extractedPrice = 0;

  const slug = generateSlug(productName);
  let seoTitle = generateSeoTitle(
    productName,
    brand,
    minOrderQuantity,
    siteName,
    defaultSettings.auto_seo_title_template || ''
  );
  let seoDescription = generateSeoDescription(
    description,
    priceTiers,
    '',
    defaultSettings.auto_seo_desc_template || '',
    defaultSettings.default_currency || 'USD'
  );

  let mpn = '';
  if (defaultSettings.default_mpn) {
    mpn = processMpn(defaultSettings.default_mpn, sku);
  }

  const product_type = await getProductType(locale, categoryId, seriesId);

  // 准备产品数据
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
    main_image_url: mainImageUrl,
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
  } else {
    productData.variants = [];
  }

  const now = new Date().toISOString();
  // 写入数据库索引
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
    main_image_url: mainImageUrl || '',
    attributes: attributes || {},
    slug,
    status: 'published',
    updatedAt: now,
    createdAt: isUpdate ? existingProduct.createdAt : now,
  });
  // 写入 MD 文件
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
    const variantImage = variant.localImageUrl || '';
    const variantDesc = attributesToHtml(variant.attributes || {});
    const variantShortDesc = '';

    const variantSeoTitle = generateSeoTitle(
      variantName,
      brand,
      minOrderQuantity,
      siteName,
      defaultSettings.auto_seo_title_template || ''
    );
    const variantSeoDescription = generateSeoDescription(
      variantDesc,
      priceTiers,
      '',
      defaultSettings.auto_seo_desc_template || '',
      defaultSettings.default_currency || 'USD'
    );

    const variantData = {
      id: variantId,
      product_name: variantName,
      sku: variantSku,
      short_description: variantShortDesc,
      main_image_url: variantImage,
      additional_images: [],
      attributes: variant.attributes || {},
      slug: variantSlug,
      seo_keywords: '',
      seo_title: variantSeoTitle,
      seo_description: variantSeoDescription,
    };

    // 更新父产品的 variants 数组
    if (!productData.variants) productData.variants = [];
    if (isVariantUpdate) {
      const idx = productData.variants.findIndex((v: any) => v.id === variantId);
      if (idx !== -1) productData.variants[idx] = variantData;
      else productData.variants.push(variantData);
    } else {
      productData.variants.push(variantData);
    }

    // 写入变体索引
    await upsertProductIndex({
      productId: variantId,
      locale,
      productLineId: productLineId || '',
      categoryId,
      seriesId: seriesId || '',
      parent_product_id: productId,
      sku: variantSku,
      product_name: variantName,
      brand,
      price_tiers: [],
      currency: defaultSettings.default_currency || 'USD',
      availability: defaultSettings.default_availability || 'in_stock',
      min_order_quantity: minOrderQuantity,
      main_image_url: variantImage || '',
      attributes: variant.attributes || {},
      slug: variantSlug,
      status: 'published',
      updatedAt: now,
      createdAt: isVariantUpdate ? existingVariant.createdAt : now,
    });

    variantItems.push(variantData);
  }

  // 如果有变体，重新写入父产品 MD 并更新父产品索引的 variants 摘要
  if (variantItems.length > 0) {
    await writeProduct(locale, productId, productData, '');
    const parentIndex = await getProductIndex(productId);
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

    // 预加载分类数据
    await loadCategories(locale);

    const productSettings = await getProductSettings(locale);
    const defaultSettings = (productSettings as any).defaultSettings || {};
    const siteName = await getSiteName();
    const skuRule = defaultSettings.sku_rule || 'P-{timestamp}';

    // 全局 ID 生成器（用于新增）
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

    // 构建任务列表
    const tasks = items.map((item) => async () => {
      return await processProductItem(
        item,
        locale,
        defaultSettings,
        siteName,
        skuRule,
        generateUniqueId
      );
    });

    // 并发限制（例如 10 个产品同时处理）
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