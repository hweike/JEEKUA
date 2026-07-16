// lib/products/services/product.service.ts
import { readProduct, writeProduct, deleteProduct } from '@/lib/products/mdParser';
import {
  upsertProductIndex,
  deleteProductIndex,
  getProductIndex,
  getProductStatusCount,
  searchProducts,
  getChildrenProducts,
  getProductLineIdFromCategory,
  searchAllProducts,
  getAllProductIds as getAllProductIdsFromIndex,
  statusCountCache, // 新增：用于清除状态计数缓存
} from '@/lib/products/indexDb';
import { getProductSettings } from '@/lib/products/productSettings';
import { generateSlug, generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';
import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage, getPublicStorage } from '@/lib/storage/factory';
import { computeFileHash, getImageDimensions, generateStorageKey } from '@/lib/files/utils';
import { createMediaFile, findMediaFileByHash, createFileReference } from '@/lib/files/db';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import type { PageData } from '@/lib/discovery/register';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// 内部工具函数（提取公共逻辑）
// ============================================================

function extractFirstTier(tiers: any[]): { minQty: number; price: number } {
  const first = (tiers && tiers[0]) || { min_qty: 1, price: 0 };
  return { minQty: first.min_qty, price: first.price };
}

function generateSkuIfEmpty(existingSku: string, rule: string): string {
  if (existingSku && existingSku.trim()) return existingSku.trim();
  return generateSkuFromRule(rule);
}

async function getSiteSettings() {
  const storage = getPrivateStorage();
  const key = 'settings.json';
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch {
    return { site_name: '我的网站' };
  }
}

async function getProductType(locale: string, categoryId: string, seriesId?: string): Promise<string> {
  if (categoryId === '__UNCATEGORIZED__') return '';
  const storage = getPrivateStorage();
  const key = `products/${locale}/categories.json`;
  try {
    const content = await storage.read(key, 'utf8');
    const data = JSON.parse(content as string);
    const categories = data.categories || [];
    const cat = categories.find((c: any) => c.id === categoryId);
    if (!cat) return '';
    let type = cat.name;
    if (seriesId && cat.series) {
      const series = cat.series.find((s: any) => s.id === seriesId);
      if (series) type = `${cat.name} > ${series.name}`;
    }
    return type;
  } catch {
    return '';
  }
}

function processMpn(defaultMpn: string, sku: string): string {
  if (!defaultMpn) return '';
  return defaultMpn.replace(/\{SKU\}/g, sku);
}

function generateSkuFromRule(rule: string): string {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return rule.replace(/\{timestamp\}/g, randomNum.toString());
}

// 统一图片处理
async function processImages(productId: string, mainUrl?: string, additionalUrls?: string[]): Promise<{ mainImageUrl: string; additionalImages: string[] }> {
  let newMain = mainUrl || '';
  if (newMain && newMain.startsWith('http')) {
    newMain = await downloadAndSaveProductImage(newMain, productId);
  }
  let newAdditional: string[] = [];
  if (additionalUrls && additionalUrls.length) {
    for (const url of additionalUrls) {
      if (url && url.startsWith('http')) {
        newAdditional.push(await downloadAndSaveProductImage(url, productId));
      } else {
        newAdditional.push(url);
      }
    }
  }
  return { mainImageUrl: newMain, additionalImages: newAdditional };
}

async function downloadAndSaveProductImage(url: string, productId: string): Promise<string> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`下载失败: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const originalFileName = url.split('/').pop() || 'product-image.jpg';

    const fileHash = await computeFileHash(buffer);
    const existingFile = await findMediaFileByHash(fileHash);
    let publicUrl: string;
    let fileId: string;

    if (existingFile) {
      fileId = existingFile.id;
      const storage = getPublicStorage();
      publicUrl = storage.getPublicUrl(existingFile.storage_key);
    } else {
      const displayName = originalFileName;
      const storageKey = generateStorageKey(displayName, fileHash);
      const storage = getPublicStorage();
      await storage.write(storageKey, buffer, { contentType });

      let width = null, height = null;
      if (contentType.startsWith('image/')) {
        try {
          const dims = await getImageDimensions(buffer);
          if (dims) { width = dims.width; height = dims.height; }
        } catch {}
      }

      const newFile = await createMediaFile({
        storage_key: storageKey,
        display_name: displayName,
        mime_type: contentType,
        size: buffer.length,
        file_hash: fileHash,
        width,
        height,
      });
      fileId = newFile.id;
      publicUrl = storage.getPublicUrl(storageKey);
    }

    await createFileReference({
      file_id: fileId,
      reference_type: 'product',
      reference_id: productId,
      alt_text: '',
      sort_order: 0,
    }).catch((err) => {
      if (!err.message.includes('unique constraint')) console.warn('创建产品图片引用失败:', err);
    });

    return publicUrl;
  } catch (err) {
    console.error(`产品图片下载失败: ${url}`, err);
    return url;
  }
}

// 统一 SEO 准备
function prepareSeoFields(productName: string, brand: string, minQty: number, siteName: string, defaultSettings: any, description: string, priceTiers: any[], specText: string, currency: string, existingSeo?: any): { seo_title: string; seo_description: string } {
  const seoTitle = existingSeo?.seo_title || generateSeoTitle(
    productName,
    brand,
    minQty,
    siteName,
    defaultSettings.auto_seo_title_template || ''
  );
  const seoDescription = existingSeo?.seo_description || generateSeoDescription(
    description,
    priceTiers,
    specText,
    defaultSettings.auto_seo_desc_template || '',
    currency
  );
  return { seo_title: seoTitle, seo_description: seoDescription };
}

// 统一索引更新（支持部分更新）
async function upsertProductIndexSafe(productId: string, locale: string, data: any, createdAt?: string) {
  const now = new Date().toISOString();
  const existing = await getProductIndex(productId, locale);
  const fullData = {
    productId,
    locale,
    productLineId: data.productLineId || '',
    categoryId: data.categoryId,
    seriesId: data.seriesId || '',
    parent_product_id: data.parent_product_id || null,
    sku: data.sku,
    product_name: data.product_name,
    brand: data.brand || '',
    price_tiers: data.price_tiers || [],
    currency: data.currency || 'USD',
    availability: data.availability || 'in_stock',
    min_order_quantity: data.min_order_quantity || 1,
    main_image_url: data.main_image_url || '',
    attributes: data.attributes || {},
    slug: data.slug || '',
    status: data.status || 'published',
    updatedAt: now,
    createdAt: createdAt || existing?.createdAt || now,
    templateId: data.templateId || '',
  };
  await upsertProductIndex(fullData);
}

// 统一 pages 注册（主产品和变体）
async function registerProductPages(productId: string, locale: string, productData: any, variantList: any[] = []) {
  const now = new Date().toISOString();
  // 主产品
  await registerEntity({
    type: 'product',
    id: productId,
    locale,
    data: productData,
    updatedAt: now,
  }).catch(err => console.error(`注册产品失败 ${productId}:`, err));

  // 变体
  for (const variant of variantList) {
    const vid = variant.id;
    if (!vid) continue;
    const variantPageData = {
      id: `${productId}/${vid}`,
      product_name: variant.product_name || '',
      slug: variant.slug || '',
      seo_title: variant.seo_title || '',
      seo_description: variant.seo_description || '',
      seo_keywords: variant.seo_keywords || '',
      main_image_url: variant.main_image_url || '',
      description: productData.description || '',
    };
    await registerEntity({
      type: 'product',
      id: vid,
      locale,
      data: variantPageData,
      updatedAt: now,
    }).catch(err => console.error(`注册变体失败 ${vid}:`, err));
  }
}

// 统一变体处理（创建或更新）
// 新增参数 explicitVariantId：用于更新时明确指定变体 ID，避免从 body.id 读取
async function processVariant(
  locale: string,
  parentId: string,
  variantData: any,
  existingVariants: any[] = [],
  isNew: boolean,
  explicitVariantId?: string  // 新增
): Promise<any> {
  const parentMd = await readProduct(locale, parentId);
  if (!parentMd) throw new Error('父产品不存在');
  const variants = existingVariants.length ? existingVariants : (parentMd.variants || []);
  const productSettings = await getProductSettings(locale);
  const defaultSettings = (productSettings as any).defaultSettings || {};
  const skuRule = defaultSettings.sku_rule ?? 'P-{timestamp}';

  let variantId = explicitVariantId || variantData.id;
  let isExisting = false;
  let variantIndex = -1;

  if (variantId) {
    variantIndex = variants.findIndex((v: any) => v.id === variantId);
    if (variantIndex !== -1) isExisting = true;
  }

  // 如果是新增且未提供 ID，则生成
  if (!variantId && !isExisting) {
    const existingIds = await getAllProductIds(locale);
    variantId = await generateUniqueProductId(async () => existingIds);
  }

  // SKU
  let sku = variantData.sku?.trim();
  if (!sku) {
    if (isExisting && variants[variantIndex]?.sku) {
      sku = variants[variantIndex].sku;
    } else {
      sku = generateSkuFromRule(skuRule);
    }
  }

  // 图片
  const { mainImageUrl, additionalImages } = await processImages(variantId, variantData.main_image_url, variantData.additional_images);

  const newVariant = {
    id: variantId,
    product_name: variantData.product_name,
    sku,
    short_description: variantData.short_description || '',
    main_image_url: mainImageUrl,
    additional_images: additionalImages,
    attributes: variantData.attributes || {},
    slug: variantData.slug || generateSlug(variantData.product_name),
    seo_keywords: variantData.seo_keywords || '',
    seo_title: variantData.seo_title || '',
    seo_description: variantData.seo_description || '',
  };

  if (isExisting) {
    variants[variantIndex] = { ...variants[variantIndex], ...newVariant };
  } else {
    variants.push(newVariant);
  }

  // 更新父产品
  await updateParentVariants(locale, parentId, variants);

  // 更新索引
  const now = new Date().toISOString();
  const indexData = {
    productId: variantId,
    locale,
    productLineId: parentMd.productLineId || '',
    categoryId: parentMd.categoryId || '',
    seriesId: parentMd.seriesId || '',
    parent_product_id: parentId,
    sku: newVariant.sku,
    product_name: newVariant.product_name,
    brand: parentMd.brand || '',
    price_tiers: parentMd.price_tiers || [],
    currency: parentMd.currency || 'USD',
    availability: parentMd.availability || 'in_stock',
    min_order_quantity: parentMd.min_order_quantity || 1,
    main_image_url: newVariant.main_image_url,
    attributes: newVariant.attributes,
    slug: newVariant.slug,
    status: 'published',
    updatedAt: now,
    createdAt: now,
    templateId: variantData.templateId || '',
  };
  await upsertProductIndex(indexData);

  // 注册 pages
  const variantPageData = {
    id: `${parentId}/${variantId}`,
    product_name: newVariant.product_name,
    slug: newVariant.slug,
    seo_title: newVariant.seo_title,
    seo_description: newVariant.seo_description,
    seo_keywords: newVariant.seo_keywords,
    main_image_url: newVariant.main_image_url,
    description: parentMd.description || '',
  };
  await registerEntity({
    type: 'product',
    id: variantId,
    locale,
    data: variantPageData,
    updatedAt: now,
  }).catch(err => console.error(`注册变体失败 ${variantId}:`, err));

  return newVariant;
}

async function getAllProductIds(locale: string): Promise<string[]> {
  return getAllProductIdsFromIndex(locale);
}

async function updateParentVariants(locale: string, parentId: string, variants: any[]) {
  const parentMd = await readProduct(locale, parentId);
  if (!parentMd) throw new Error('父产品不存在');
  const updated = { ...parentMd, variants };
  await writeProduct(locale, parentId, updated, parentMd.content || '');
}

// ============================================================
// 核心导出函数（保持外部接口不变）
// ============================================================

export interface GetProductsOptions {
  locale: string;
  status?: string;
  keyword?: string;
  categoryId?: string;
  seriesId?: string;
  parentId?: string;
  productId?: string;
  page?: number;
  size?: number;
  uncategorized?: boolean;
  searchAll?: boolean;
}

export interface ProductListResult {
  items: any[];
  total: number;
  statusCount: any;
  uncategorizedCount?: number;
  page: number;
  size: number;
}

export async function getProducts(options: GetProductsOptions): Promise<ProductListResult | any> {
  const {
    locale,
    status = 'all',
    keyword = '',
    categoryId = '',
    seriesId = '',
    parentId,
    productId,
    page = 1,
    size = 20,
    uncategorized = false,
    searchAll = false,
  } = options;

  if (uncategorized) {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .eq('categoryId', '__UNCATEGORIZED__')
      .is('parent_product_id', null);
    if (status !== 'all') query = query.eq('status', status);
    if (keyword) query = query.or(`product_name.ilike.%${keyword}%,sku.ilike.%${keyword}%`);
    const from = (page - 1) * size;
    const to = from + size - 1;
    const { data, error, count } = await query.order('updatedAt', { ascending: false }).range(from, to);
    if (error) throw new Error(`uncategorized query failed: ${error.message}`);
    const items = data || [];
    const statusCount = await getProductStatusCount(locale);
    return { items, total: count || 0, statusCount, page, size };
  }

  if (searchAll) {
    const { items, total } = await searchAllProducts(locale, keyword, categoryId, seriesId, page, size);
    const statusCount = await getProductStatusCount(locale);
    return { items, total, statusCount, page, size };
  }

  if (productId) {
    const index = await getProductIndex(productId, locale);
    if (index?.parent_product_id) {
      const parentMd = await readProduct(locale, index.parent_product_id);
      if (!parentMd) throw new Error('父产品不存在');
      const variant = parentMd.variants?.find((v: any) => v.id === productId);
      if (!variant) throw new Error('变体不存在');
      return {
        id: variant.id,
        product_name: variant.product_name || '',
        sku: variant.sku || '',
        short_description: variant.short_description || '',
        main_image_url: variant.main_image_url || '',
        additional_images: variant.additional_images || [],
        attributes: variant.attributes || {},
        slug: variant.slug || '',
        seo_title: variant.seo_title || '',
        seo_description: variant.seo_description || '',
        seo_keywords: variant.seo_keywords || '',
        parent_product_id: index.parent_product_id,
        parent_product_name: parentMd.product_name || '',
        categoryId: parentMd.categoryId || '',
        productLineId: parentMd.productLineId || '',
        seriesId: parentMd.seriesId || '',
        brand: parentMd.brand || '',
        currency: parentMd.currency || 'USD',
        availability: parentMd.availability || 'in_stock',
        templateId: parentMd.templateId || '',
        _isVariant: true,
        createdAt: parentMd.createdAt,
        updatedAt: parentMd.updatedAt,
      };
    }
    const product = await readProduct(locale, productId);
    return product || {};
  }

  if (parentId) {
    return await getChildrenProducts(parentId, locale);
  }

  const statusCount = await getProductStatusCount(locale);
  const { items, total } = await searchProducts(
    locale,
    status === 'all' ? undefined : status,
    keyword,
    categoryId || undefined,
    seriesId || undefined,
    page,
    size
  );

  let uncategorizedCount = 0;
  if (!uncategorized) {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .eq('categoryId', '__UNCATEGORIZED__')
      .is('parent_product_id', null);
    if (!error) uncategorizedCount = count || 0;
  }

  return { items, total, statusCount, uncategorizedCount, page, size };
}

export async function createProduct(locale: string, body: any): Promise<any> {
  const isVariant = !!body.parent_product_id;
  const productSettings = await getProductSettings(locale);
  const defaultSettings = (productSettings as any).defaultSettings || {};
  const skuRule = defaultSettings.sku_rule ?? 'P-{timestamp}';

  if (isVariant) {
    const result = await processVariant(locale, body.parent_product_id, body, [], true);
    // 清除状态计数缓存
    statusCountCache.delete(`statusCount_${locale}`);
    return result;
  }

  // 普通产品创建
  const categoryId = body.categoryId;
  if (!categoryId) throw new Error('categoryId is required');
  const seriesId = body.seriesId;
  const productLineId = body.productLineId || (await getProductLineIdFromCategory(locale, categoryId));
  if (!productLineId) throw new Error('无法确定产品线');

  const siteSettings = await getSiteSettings();
  const existingIds = await getAllProductIds(locale);
  const productId = await generateUniqueProductId(async () => existingIds);

  const sku = generateSkuIfEmpty(body.sku, skuRule);
  const slug = body.slug || generateSlug(body.product_name);

  const { minQty, price } = extractFirstTier(body.price_tiers);
  const brand = body.brand || defaultSettings.default_brand || '';

  const seo = prepareSeoFields(
    body.product_name,
    brand,
    minQty,
    siteSettings.site_name || '我的网站',
    defaultSettings,
    body.description,
    body.price_tiers,
    body.spec_text,
    body.currency || defaultSettings.default_currency || 'USD',
    { seo_title: body.seo_title, seo_description: body.seo_description }
  );

  let mpn = body.mpn || '';
  if (!mpn && defaultSettings.default_mpn) mpn = processMpn(defaultSettings.default_mpn, sku);
  const product_type = await getProductType(locale, categoryId, seriesId);

  const { mainImageUrl, additionalImages } = await processImages(productId, body.main_image_url, body.additional_images);

  const frontMatter = {
    id: productId,
    product_name: body.product_name,
    brand,
    sku,
    mpn,
    gtin: '',
    price_tiers: body.price_tiers,
    currency: body.currency || defaultSettings.default_currency || 'USD',
    identifier_exists: false,
    price,
    spec_text: body.spec_text || '',
    availability: body.availability || defaultSettings.default_availability || 'in_stock',
    min_order_quantity: minQty,
    main_image_url: mainImageUrl,
    additional_images: additionalImages,
    description: body.description || '',
    short_description: body.short_description || '',
    attributes: body.attributes || {},
    product_type,
    google_product_category: body.google_product_category || 0,
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    seo_keywords: body.seo_keywords || '',
    slug,
    shipping_cost: body.shipping_cost !== undefined ? body.shipping_cost : (defaultSettings.default_shipping_cost ?? 0),
    return_policy_days: body.return_policy_days !== undefined ? body.return_policy_days : (defaultSettings.default_return_days ?? 30),
    aggregate_rating: null,
    categoryId,
    seriesId: seriesId || '',
    parent_product_id: '',
    variants: body.variants || [],
    templateId: body.templateId || '',
  };

  await writeProduct(locale, productId, frontMatter, body.content || '');
  const now = new Date().toISOString();

  await upsertProductIndexSafe(productId, locale, {
    productLineId,
    categoryId,
    seriesId: seriesId || '',
    parent_product_id: null,
    sku,
    product_name: body.product_name,
    brand,
    price_tiers: body.price_tiers,
    currency: body.currency || defaultSettings.default_currency || 'USD',
    availability: body.availability || defaultSettings.default_availability || 'in_stock',
    min_order_quantity: minQty,
    main_image_url: mainImageUrl,
    attributes: body.attributes || {},
    slug,
    status: body.status || 'published',
    templateId: body.templateId || '',
  }, now);

  await registerProductPages(productId, locale, frontMatter, body.variants || []);

  // 清除状态计数缓存
  statusCountCache.delete(`statusCount_${locale}`);
  return { ...frontMatter, productId, content: body.content };
}

export async function updateProduct(locale: string, productId: string, body: any): Promise<any> {
  const existingIndex = await getProductIndex(productId, locale);
  const isVariant = existingIndex?.parent_product_id && existingIndex.parent_product_id !== '';

  if (isVariant) {
    // 变体更新：获取父产品并更新单个变体
    const parentId = existingIndex.parent_product_id;
    const parentMd = await readProduct(locale, parentId);
    if (!parentMd) throw new Error('父产品不存在');
    const variants = parentMd.variants || [];
    const variantIndex = variants.findIndex((v: any) => v.id === productId);
    if (variantIndex === -1) throw new Error('变体不存在');

    const variant = variants[variantIndex];
    // 合并更新数据，并显式传入变体 ID
    const updatedVariant = await processVariant(
      locale,
      parentId,
      { ...variant, ...body },
      variants,
      false,
      productId  // 显式传入变体 ID，避免从 body.id 读取
    );
    // 清除状态计数缓存
    statusCountCache.delete(`statusCount_${locale}`);
    return { ...updatedVariant, productId };
  }

  // 普通产品更新
  const existingMd = await readProduct(locale, productId);
  if (!existingMd) throw new Error('Product not found');

  const categoryId = body.categoryId !== undefined ? body.categoryId : existingMd.categoryId;
  if (!categoryId) throw new Error('categoryId required');

  const seriesId = body.seriesId !== undefined ? body.seriesId : existingMd.seriesId;
  let productLineId = body.productLineId || (await getProductLineIdFromCategory(locale, categoryId));
  if (!productLineId) productLineId = existingMd.productLineId || '';

  const siteSettings = await getSiteSettings();
  const productSettings = await getProductSettings(locale);
  const defaultSettings = (productSettings as any).defaultSettings || {};
  const skuRule = defaultSettings.sku_rule ?? 'P-{timestamp}';

  // 处理图片
  let mainImageUrl = body.main_image_url !== undefined ? body.main_image_url : existingMd.main_image_url;
  let additionalImages = body.additional_images !== undefined ? body.additional_images : existingMd.additional_images;
  const processed = await processImages(productId, mainImageUrl, additionalImages);
  mainImageUrl = processed.mainImageUrl;
  additionalImages = processed.additionalImages;

  // 构建更新数据
  const updatedData: any = {
    ...existingMd,
    ...body,
    main_image_url: mainImageUrl,
    additional_images: additionalImages,
    updatedAt: new Date().toISOString(),
  };

  // SKU
  let sku = body.sku?.trim();
  if (!sku) {
    sku = updatedData.sku || generateSkuFromRule(skuRule);
  }
  updatedData.sku = sku;

  // 价格
  const { minQty, price } = extractFirstTier(updatedData.price_tiers);
  updatedData.min_order_quantity = minQty;
  updatedData.price = price;

  // MPN
  let mpn = updatedData.mpn || '';
  if (!mpn && defaultSettings.default_mpn) mpn = processMpn(defaultSettings.default_mpn, sku);
  updatedData.mpn = mpn;

  // 品牌
  const brand = updatedData.brand || defaultSettings.default_brand || '';
  updatedData.brand = brand;

  // SEO
  const seo = prepareSeoFields(
    updatedData.product_name,
    brand,
    minQty,
    siteSettings.site_name || '我的网站',
    defaultSettings,
    updatedData.description,
    updatedData.price_tiers,
    updatedData.spec_text,
    updatedData.currency || defaultSettings.default_currency || 'USD',
    { seo_title: body.seo_title, seo_description: body.seo_description }
  );
  updatedData.seo_title = seo.seo_title;
  updatedData.seo_description = seo.seo_description;

  if (!updatedData.slug) updatedData.slug = generateSlug(updatedData.product_name);
  updatedData.product_type = await getProductType(locale, categoryId, seriesId);

  // 清理多余字段，保持顺序
  const final: any = {
    id: productId,
    product_name: updatedData.product_name,
    brand: updatedData.brand,
    sku: updatedData.sku,
    mpn: updatedData.mpn,
    gtin: updatedData.gtin,
    price_tiers: updatedData.price_tiers,
    currency: updatedData.currency,
    identifier_exists: updatedData.identifier_exists,
    price: updatedData.price,
    spec_text: updatedData.spec_text,
    availability: updatedData.availability,
    min_order_quantity: updatedData.min_order_quantity,
    main_image_url: updatedData.main_image_url,
    additional_images: updatedData.additional_images,
    description: updatedData.description,
    short_description: updatedData.short_description,
    attributes: updatedData.attributes,
    product_type: updatedData.product_type,
    google_product_category: updatedData.google_product_category,
    seo_title: updatedData.seo_title,
    seo_description: updatedData.seo_description,
    seo_keywords: updatedData.seo_keywords,
    slug: updatedData.slug,
    shipping_cost: updatedData.shipping_cost,
    return_policy_days: updatedData.return_policy_days,
    aggregate_rating: updatedData.aggregate_rating,
    categoryId: updatedData.categoryId,
    seriesId: updatedData.seriesId,
    parent_product_id: updatedData.parent_product_id,
    variants: updatedData.variants,
    templateId: body.templateId !== undefined ? body.templateId : existingMd.templateId || '',
  };

  await writeProduct(locale, productId, final, body.content || existingMd.content || '');
  const now = new Date().toISOString();

  // 更新索引
  await upsertProductIndexSafe(productId, locale, {
    productLineId,
    categoryId,
    seriesId: seriesId || '',
    parent_product_id: final.parent_product_id || null,
    sku: final.sku,
    product_name: final.product_name,
    brand: final.brand,
    price_tiers: final.price_tiers,
    currency: final.currency,
    availability: final.availability,
    min_order_quantity: final.min_order_quantity,
    main_image_url: final.main_image_url || '',
    attributes: final.attributes || {},
    slug: final.slug,
    status: body.status || existingIndex?.status || 'published',
    templateId: final.templateId || '',
  }, existingIndex?.createdAt || now);

  await registerProductPages(productId, locale, final, final.variants || []);

  // 清除状态计数缓存
  statusCountCache.delete(`statusCount_${locale}`);
  return { ...final, productId };
}

export async function deleteProductService(locale: string, productId: string): Promise<void> {
  // 1. 查询该语言下的子变体
  const { data: variants, error: variantsError } = await supabase
    .from('products')
    .select('productId')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('parent_product_id', productId)
    .eq('locale', locale);

  if (variantsError) {
    console.error('查询变体失败:', variantsError);
  } else if (variants && variants.length > 0) {
    for (const variant of variants) {
      // 删除变体索引
      const { error: delVarError } = await supabase
        .from('products')
        .delete()
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('productId', variant.productId)
        .eq('locale', locale);
      if (delVarError) {
        console.error(`删除变体索引失败: ${variant.productId}`, delVarError);
      }

      // 删除变体 pages
      const variantPageId = `product:${productId}/${variant.productId}`;
      try {
        await deletePage(variantPageId, locale);
      } catch (err) {
        console.error(`删除变体 pages 失败 ${variantPageId}:`, err);
      }
    }
  }

  // 2. 删除 MD 文件（仅当前语言）
  try {
    await deleteProduct(locale, productId);
  } catch (err) {
    console.warn(`deleteProduct 调用失败: ${err.message}`);
  }

  // 3. 删除该语言产品索引
  const { error: delIndexError } = await supabase
    .from('products')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('productId', productId)
    .eq('locale', locale);
  if (delIndexError) {
    console.error(`删除产品索引失败: ${productId} (${locale})`, delIndexError);
    throw new Error(`删除索引失败: ${delIndexError.message}`);
  }

  // 4. 删除主产品 pages
  const mainPageId = `product:${productId}`;
  try {
    await deletePage(mainPageId, locale);
  } catch (err) {
    console.error(`删除主产品 pages 失败 ${mainPageId}:`, err);
  }

  // 5. 删除产品与资源的关联记录
  try {
    const { error: resourceError } = await supabase
      .from('resource_product')
      .delete()
      .eq('product_id', productId);
    if (resourceError) {
      console.error(`删除产品关联资源失败: ${productId}`, resourceError);
    }
  } catch (err) {
    console.error(`删除产品关联资源失败: ${productId}`, err);
  }

  // 清除状态计数缓存
  statusCountCache.delete(`statusCount_${locale}`);
}

export async function getProductsByIds(locale: string, productIds: string[]): Promise<any[]> {
  if (!productIds || productIds.length === 0) return [];
  const results: any[] = [];
  for (const id of productIds) {
    const index = await getProductIndex(id, locale);
    if (!index) continue;
    if (index.parent_product_id) {
      const parentMd = await readProduct(locale, index.parent_product_id);
      if (!parentMd) continue;
      const variant = parentMd.variants?.find((v: any) => v.id === id);
      if (!variant) continue;
      results.push({
        id: variant.id,
        product_name: variant.product_name || '',
        sku: variant.sku || '',
        short_description: variant.short_description || '',
        main_image_url: variant.main_image_url || '',
        additional_images: variant.additional_images || [],
        attributes: variant.attributes || {},
        slug: variant.slug || '',
        seo_title: variant.seo_title || '',
        seo_description: variant.seo_description || '',
        seo_keywords: variant.seo_keywords || '',
        parent_product_id: index.parent_product_id,
        parent_product_name: parentMd.product_name || '',
        categoryId: parentMd.categoryId || '',
        productLineId: parentMd.productLineId || '',
        seriesId: parentMd.seriesId || '',
        brand: parentMd.brand || '',
        currency: parentMd.currency || 'USD',
        availability: parentMd.availability || 'in_stock',
        templateId: parentMd.templateId || '',
        description: parentMd.description || '',
        spec_text: parentMd.spec_text || '',
        _isVariant: true,
        createdAt: parentMd.createdAt,
        updatedAt: parentMd.updatedAt,
      });
    } else {
      const product = await readProduct(locale, id);
      if (product) results.push(product);
    }
  }
  return results;
}

export interface TranslationFields {
  product_name?: string;
  short_description?: string;
  description?: string;
  spec_text?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
}

export interface VariantTranslation {
  id: string;
  fields: TranslationFields;
}

export interface ProductTranslation {
  productId: string;
  fields: TranslationFields;
  variants?: VariantTranslation[];
}

export async function updateProductTranslations(
  locale: string,
  translations: ProductTranslation[],
  sourceLocale?: string
): Promise<void> {
  if (!translations || translations.length === 0) return;

  for (const trans of translations) {
    const { productId, fields, variants = [] } = trans;

    // 读取目标产品（允许不存在）
    let existingMd: any = null;
    let isNew = false;
    try {
      existingMd = await readProduct(locale, productId);
    } catch (err: any) {
      if (err.Code === 'NoSuchKey' || err.message?.includes('NoSuchKey')) existingMd = null;
      else throw err;
    }

    if (!existingMd && sourceLocale) {
      // 从源复制
      let sourceMd: any = null;
      try {
        sourceMd = await readProduct(sourceLocale, productId);
      } catch (err: any) {
        if (err.Code === 'NoSuchKey' || err.message?.includes('NoSuchKey')) {
          console.error(`源产品 ${productId} 不存在，无法创建`);
          continue;
        } else throw err;
      }
      if (!sourceMd) continue;
      existingMd = JSON.parse(JSON.stringify(sourceMd));
      existingMd.id = productId;
      existingMd.content = '';
      isNew = true;
    }

    if (!existingMd) {
      console.warn(`产品 ${productId} 不存在且未提供源语言，跳过翻译更新`);
      continue;
    }

    let updated = false;
    // 更新字段
    const fieldKeys: (keyof TranslationFields)[] = ['product_name', 'short_description', 'description', 'spec_text', 'seo_title', 'seo_description', 'seo_keywords'];
    for (const key of fieldKeys) {
      if (fields[key] !== undefined) {
        existingMd[key] = fields[key];
        updated = true;
      }
    }

    // 处理变体
    if (variants.length > 0) {
      const currentVariants = existingMd.variants || [];
      for (const vTrans of variants) {
        const vIdx = currentVariants.findIndex((v: any) => v.id === vTrans.id);
        if (vIdx === -1) {
          // 新建变体（仅当从源复制且存在时）
          if (isNew && sourceLocale) {
            let sourceVariant = null;
            try {
              const sourceMd = await readProduct(sourceLocale, productId);
              sourceVariant = sourceMd?.variants?.find((v: any) => v.id === vTrans.id);
            } catch {}
            if (sourceVariant) {
              const newVariant = JSON.parse(JSON.stringify(sourceVariant));
              newVariant.id = vTrans.id;
              for (const key of fieldKeys) {
                if (vTrans.fields[key] !== undefined) newVariant[key] = vTrans.fields[key];
              }
              currentVariants.push(newVariant);
              updated = true;
            } else {
              console.warn(`源产品中未找到变体 ${vTrans.id}，无法创建`);
            }
          } else {
            console.warn(`变体 ${vTrans.id} 不存在且目标已存在，无法新增`);
          }
        } else {
          // 更新已有变体
          const v = currentVariants[vIdx];
          for (const key of fieldKeys) {
            if (vTrans.fields[key] !== undefined) {
              v[key] = vTrans.fields[key];
              updated = true;
            }
          }
        }
      }
      existingMd.variants = currentVariants;
    }

    if (!updated) {
      console.log(`产品 ${productId} 无字段更新，跳过写入`);
      continue;
    }

    // 写回 MD
    await writeProduct(locale, productId, existingMd, existingMd.content || '');

    // 更新索引
    const now = new Date().toISOString();
    // 父产品索引
    const existingIndex = await getProductIndex(productId, locale);
    if (existingIndex || isNew) {
      const indexData = {
        productId,
        locale,
        productLineId: existingIndex?.productLineId || existingMd.productLineId || '',
        categoryId: existingIndex?.categoryId || existingMd.categoryId,
        seriesId: existingIndex?.seriesId || existingMd.seriesId || '',
        parent_product_id: existingIndex?.parent_product_id || null,
        sku: existingMd.sku,
        product_name: existingMd.product_name,
        brand: existingMd.brand || '',
        price_tiers: existingMd.price_tiers || [],
        currency: existingMd.currency || 'USD',
        availability: existingMd.availability || 'in_stock',
        min_order_quantity: existingMd.min_order_quantity || 1,
        main_image_url: existingMd.main_image_url || '',
        attributes: existingMd.attributes || {},
        slug: existingMd.slug || '',
        status: existingIndex?.status || 'published',
        updatedAt: now,
        createdAt: isNew ? now : existingIndex?.createdAt || now,
        templateId: existingMd.templateId || '',
      };
      await upsertProductIndex(indexData);
    }

    // 变体索引
    for (const variant of existingMd.variants || []) {
      const vid = variant.id;
      if (!vid) continue;
      const varIndex = await getProductIndex(vid, locale);
      if (varIndex || isNew) {
        const varData = {
          productId: vid,
          locale,
          productLineId: existingMd.productLineId || '',
          categoryId: existingMd.categoryId || '',
          seriesId: existingMd.seriesId || '',
          parent_product_id: productId,
          sku: variant.sku || '',
          product_name: variant.product_name || '',
          brand: existingMd.brand || '',
          price_tiers: existingMd.price_tiers || [],
          currency: existingMd.currency || 'USD',
          availability: existingMd.availability || 'in_stock',
          min_order_quantity: existingMd.min_order_quantity || 1,
          main_image_url: variant.main_image_url || '',
          attributes: variant.attributes || {},
          slug: variant.slug || '',
          status: varIndex?.status || 'published',
          updatedAt: now,
          createdAt: isNew ? now : varIndex?.createdAt || now,
          templateId: existingMd.templateId || '',
        };
        await upsertProductIndex(varData);
      }
    }

    // 注册 pages
    await registerProductPages(productId, locale, existingMd, existingMd.variants || []);
    // 清除状态计数缓存
    statusCountCache.delete(`statusCount_${locale}`);
  }
}