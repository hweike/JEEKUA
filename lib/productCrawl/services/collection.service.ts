// lib/productCrawl/services/collection.service.ts
import { supabase } from '@/lib/supabase/client';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';
import { generateSlug } from '@/lib/products/seoGenerator';
import type { ProductCrawlData, BatchSaveResult, ImportResult } from '@/lib/productCrawl/types';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// 采集数据 CRUD
// ============================================================

/**
 * 保存单个采集数据到临时表
 */
export async function saveCrawledProduct(
  data: ProductCrawlData,
  siteId: string = DEFAULT_SITE_ID
): Promise<{ crawlerId: string; isDuplicate: boolean }> {
  const now = new Date().toISOString();

  // 1. 去重检查
  const { data: existing, error: checkError } = await supabase
    .from('crawler_products')
    .select('crawler_id, import_status')
    .eq('site_id', siteId)
    .eq('source_url', data.source_url)
    .maybeSingle();

  if (checkError) {
    console.warn('去重检查失败:', checkError.message);
  }

  // 2. 如果已存在且未导入，更新
  if (existing && existing.import_status === 'pending') {
    const { error: updateError } = await supabase
      .from('crawler_products')
      .update({
        product_name: data.product_name,
        sku: data.sku,
        brand: data.brand,
        price_tiers: data.price_tiers,
        currency: data.currency,
        min_order_quantity: data.min_order_quantity,
        main_image_url: data.main_image_url,
        additional_images: data.additional_images,
        description: data.description,
        short_description: data.short_description,
        attributes: data.attributes,
        spec_text: data.spec_text,
        slug: data.slug,
        updatedAt: now,
        collected_at: data.collected_at || now,
      })
      .eq('crawler_id', existing.crawler_id);

    if (updateError) {
      throw new Error(`更新采集数据失败: ${updateError.message}`);
    }

    return { crawlerId: existing.crawler_id, isDuplicate: false };
  }

  // 3. 如果已存在且已导入，跳过
  if (existing && existing.import_status === 'imported') {
    return { crawlerId: existing.crawler_id, isDuplicate: true };
  }

  // 4. 生成新 ID
  const crawlerId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const productId = data.productId || await generateUniqueProductId(async () => []);
  const slug = data.slug || generateSlug(data.product_name);

  // 5. 插入新记录
  const { error: insertError } = await supabase
    .from('crawler_products')
    .insert({
      crawler_id: crawlerId,
      site_id: siteId,
      locale: data.source_locale || 'en',
      productId: productId,
      productLineId: data.productLineId || '',
      categoryId: data.categoryId || '',
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
      additional_images: data.additional_images || [],
      description: data.description || '',
      short_description: data.short_description || '',
      attributes: data.attributes || {},
      spec_text: data.spec_text || '',
      slug: slug,
      status: 'draft',
      templateId: data.templateId || '',
      seo_title: data.seo_title || '',
      seo_description: data.seo_description || '',
      seo_keywords: data.seo_keywords || '',
      platform: data.platform,
      source_url: data.source_url,
      source_product_id: data.source_product_id || '',
      source_locale: data.source_locale || 'en',
      collected_at: data.collected_at || now,
      collected_by: data.collected_by || 'plugin',
      import_status: 'pending',
      updatedAt: now,
      createdAt: now,
    });

  if (insertError) {
    throw new Error(`保存采集数据失败: ${insertError.message}`);
  }

  return { crawlerId, isDuplicate: false };
}

/**
 * 批量保存采集数据
 */
export async function saveCrawledProducts(
  products: ProductCrawlData[],
  siteId: string = DEFAULT_SITE_ID
): Promise<BatchSaveResult> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const product of products) {
    try {
      await saveCrawledProduct(product, siteId);
      success++;
    } catch (err) {
      failed++;
      errors.push(`${product.sku || 'unknown'}: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  return { success, failed, errors };
}

/**
 * 获取待导入的采集数据
 */
export async function getPendingCrawledProducts(
  siteId: string = DEFAULT_SITE_ID,
  locale: string = 'en',
  page: number = 1,
  size: number = 20
): Promise<{ items: any[]; total: number }> {
  const from = (page - 1) * size;
  const to = from + size - 1;

  const { data, error, count } = await supabase
    .from('crawler_products')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .eq('locale', locale)
    .eq('import_status', 'pending')
    .order('collected_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`获取待导入数据失败: ${error.message}`);
  }

  return { items: data || [], total: count || 0 };
}

/**
 * 获取单个采集数据
 */
export async function getCrawledProduct(
  crawlerId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<any | null> {
  const { data, error } = await supabase
    .from('crawler_products')
    .select('*')
    .eq('site_id', siteId)
    .eq('crawler_id', crawlerId)
    .maybeSingle();

  if (error) {
    throw new Error(`获取采集数据失败: ${error.message}`);
  }

  return data;
}

// ============================================================
// 导入功能
// ============================================================

/**
 * 导入采集数据到正式产品表
 */
export async function importCrawledProducts(
  crawlerIds: string[],
  siteId: string = DEFAULT_SITE_ID,
  locale: string = 'en',
  operator?: string
): Promise<ImportResult> {
  const errors: string[] = [];
  let imported_count = 0;
  let skipped_count = 0;

  // 1. 获取待导入数据
  const { data: products, error: fetchError } = await supabase
    .from('crawler_products')
    .select('*')
    .eq('site_id', siteId)
    .eq('locale', locale)
    .in('crawler_id', crawlerIds)
    .eq('import_status', 'pending');

  if (fetchError) {
    throw new Error(`获取待导入数据失败: ${fetchError.message}`);
  }

  if (!products || products.length === 0) {
    return { success: true, imported_count: 0, skipped_count: 0, errors: [] };
  }

  const now = new Date().toISOString();

  // 2. 逐条导入
  for (const product of products) {
    try {
      // 检查正式表中是否已存在
      const { data: existing, error: checkError } = await supabase
        .from('products')
        .select('productId')
        .eq('site_id', siteId)
        .eq('productId', product.productId)
        .eq('locale', locale)
        .maybeSingle();

      if (!checkError && existing) {
        skipped_count++;
        await supabase
          .from('crawler_products')
          .update({
            import_status: 'skipped',
            import_error: '产品已存在',
            imported_at: now
          })
          .eq('crawler_id', product.crawler_id);
        continue;
      }

      // 插入到正式表
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          site_id: siteId,
          productId: product.productId,
          locale: locale,
          productLineId: product.productLineId || '',
          categoryId: product.categoryId || '',
          seriesId: product.seriesId || '',
          parent_product_id: product.parent_product_id || null,
          sku: product.sku,
          product_name: product.product_name,
          brand: product.brand || '',
          price_tiers: product.price_tiers || [],
          currency: product.currency || 'USD',
          availability: product.availability || 'in_stock',
          min_order_quantity: product.min_order_quantity || 1,
          main_image_url: product.main_image_url || '',
          attributes: product.attributes || {},
          slug: product.slug || '',
          status: 'published',
          templateId: product.templateId || '',
          updatedAt: now,
          createdAt: product.createdAt || now,
          source_locale: product.source_locale || 'en',
          source_product_id: product.source_product_id || '',
          last_sync_time: now,
          last_sync_operator: operator || 'crawler_import',
        });

      if (insertError) {
        errors.push(`${product.sku}: ${insertError.message}`);
        await supabase
          .from('crawler_products')
          .update({
            import_status: 'failed',
            import_error: insertError.message,
            imported_at: now
          })
          .eq('crawler_id', product.crawler_id);
        continue;
      }

      // 标记为已导入
      await supabase
        .from('crawler_products')
        .update({
          import_status: 'imported',
          imported_at: now
        })
        .eq('crawler_id', product.crawler_id);

      imported_count++;

    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      errors.push(`${product.sku}: ${msg}`);
      await supabase
        .from('crawler_products')
        .update({
          import_status: 'failed',
          import_error: msg,
          imported_at: now
        })
        .eq('crawler_id', product.crawler_id);
    }
  }

  return {
    success: errors.length === 0,
    imported_count,
    skipped_count,
    errors
  };
}

/**
 * 删除采集数据（清理）
 */
export async function deleteCrawledProducts(
  crawlerIds: string[],
  siteId: string = DEFAULT_SITE_ID
): Promise<number> {
  const { data, error } = await supabase
    .from('crawler_products')
    .delete()
    .eq('site_id', siteId)
    .in('crawler_id', crawlerIds)
    .select('crawler_id');

  if (error) {
    throw new Error(`删除采集数据失败: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * 清理已导入的采集数据（批量删除）
 */
export async function cleanupImportedProducts(
  siteId: string = DEFAULT_SITE_ID,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('crawler_products')
    .delete()
    .eq('site_id', siteId)
    .in('import_status', ['imported', 'skipped'])
    .lt('imported_at', cutoffDate.toISOString())
    .select('crawler_id');

  if (error) {
    throw new Error(`清理采集数据失败: ${error.message}`);
  }

  return data?.length || 0;
}