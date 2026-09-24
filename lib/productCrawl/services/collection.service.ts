// lib/productCrawl/services/collection.service.ts
import sql from '@/lib/db/admin';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';
import { generateSlug } from '@/lib/products/seoGenerator';
import type { ProductCrawlData, BatchSaveResult, ImportResult } from '@/lib/productCrawl/types';

const DEFAULT_SITE_ID = '000001';

export async function saveCrawledProduct(
  data: ProductCrawlData,
  siteId: string = DEFAULT_SITE_ID
): Promise<{ crawlerId: string; isDuplicate: boolean }> {
  const now = new Date().toISOString();

  // 1. 去重检查
  let existing: { crawler_id: string; import_status: string } | undefined;
  try {
    const rows = await sql<{ crawler_id: string; import_status: string }[]>`
      SELECT crawler_id, import_status FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND source_url = ${data.source_url}
      LIMIT 1
    `;
    existing = rows[0];
  } catch (checkError: any) {
    console.warn('去重检查失败:', checkError.message);
  }

  // 2. 已存在且未导入 → 更新
  if (existing && existing.import_status === 'pending') {
    try {
      await sql`
        UPDATE public.crawler_products
        SET product_name = ${data.product_name},
            sku = ${data.sku},
            brand = ${data.brand},
            price_tiers = ${data.price_tiers},
            currency = ${data.currency},
            min_order_quantity = ${data.min_order_quantity},
            main_image_url = ${data.main_image_url},
            additional_images = ${data.additional_images},
            description = ${data.description},
            short_description = ${data.short_description},
            attributes = ${data.attributes},
            spec_text = ${data.spec_text},
            slug = ${data.slug},
            "updatedAt" = ${now},
            collected_at = ${data.collected_at || now}
        WHERE crawler_id = ${existing.crawler_id}
      `;
    } catch (updateError: any) {
      throw new Error(`更新采集数据失败: ${updateError.message}`);
    }

    return { crawlerId: existing.crawler_id, isDuplicate: false };
  }

  // 3. 已存在且已导入 → 跳过
  if (existing && existing.import_status === 'imported') {
    return { crawlerId: existing.crawler_id, isDuplicate: true };
  }

  // 4. 生成新 ID
  const crawlerId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const productId = data.productId || await generateUniqueProductId(async () => []);
  const slug = data.slug || generateSlug(data.product_name);

  // 5. 插入新记录
  try {
    await sql`
      INSERT INTO public.crawler_products (
        crawler_id, site_id, locale, "productId", "productLineId", "categoryId", "seriesId",
        parent_product_id, sku, product_name, brand, price_tiers, currency, availability,
        min_order_quantity, main_image_url, additional_images, description, short_description,
        attributes, spec_text, slug, status, "templateId", seo_title, seo_description, seo_keywords,
        platform, source_url, source_product_id, source_locale,
        collected_at, collected_by, import_status, "updatedAt", "createdAt"
      ) VALUES (
        ${crawlerId}, ${siteId}, ${data.source_locale || 'en'},
        ${productId}, ${data.productLineId || ''}, ${data.categoryId || ''}, ${data.seriesId || ''},
        ${data.parent_product_id || null}, ${data.sku}, ${data.product_name}, ${data.brand || ''},
        ${data.price_tiers || []}, ${data.currency || 'USD'}, ${data.availability || 'in_stock'},
        ${data.min_order_quantity || 1}, ${data.main_image_url || ''}, ${data.additional_images || []},
        ${data.description || ''}, ${data.short_description || ''},
        ${data.attributes || {}}, ${data.spec_text || ''}, ${slug}, 'draft',
        ${data.templateId || ''}, ${data.seo_title || ''}, ${data.seo_description || ''}, ${data.seo_keywords || ''},
        ${data.platform}, ${data.source_url}, ${data.source_product_id || ''}, ${data.source_locale || 'en'},
        ${data.collected_at || now}, ${data.collected_by || 'plugin'}, 'pending', ${now}, ${now}
      )
    `;
  } catch (insertError: any) {
    throw new Error(`保存采集数据失败: ${insertError.message}`);
  }

  return { crawlerId, isDuplicate: false };
}

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

export async function getPendingCrawledProducts(
  siteId: string = DEFAULT_SITE_ID,
  locale: string = 'en',
  page: number = 1,
  size: number = 20
): Promise<{ items: any[]; total: number }> {
  const offset = (page - 1) * size;

  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND locale = ${locale}
        AND import_status = 'pending'
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    const items = await sql<any[]>`
      SELECT * FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND locale = ${locale}
        AND import_status = 'pending'
      ORDER BY collected_at DESC
      LIMIT ${size} OFFSET ${offset}
    `;

    return { items, total };
  } catch (error: any) {
    throw new Error(`获取待导入数据失败: ${error.message}`);
  }
}

export async function getCrawledProduct(
  crawlerId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<any | null> {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND crawler_id = ${crawlerId}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error: any) {
    throw new Error(`获取采集数据失败: ${error.message}`);
  }
}

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
  let products: any[];
  try {
    products = await sql<any[]>`
      SELECT * FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND locale = ${locale}
        AND crawler_id IN ${sql(crawlerIds)}
        AND import_status = 'pending'
    `;
  } catch (fetchError: any) {
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
      let existing: { productId: string } | undefined;
      try {
        const rows = await sql<{ productId: string }[]>`
          SELECT "productId" FROM public.products
          WHERE site_id = ${siteId}
            AND "productId" = ${product.productId}
            AND locale = ${locale}
          LIMIT 1
        `;
        existing = rows[0];
      } catch {}

      if (existing) {
        skipped_count++;
        try {
          await sql`
            UPDATE public.crawler_products
            SET import_status = 'skipped',
                import_error = '产品已存在',
                imported_at = ${now}
            WHERE crawler_id = ${product.crawler_id}
          `;
        } catch {}
        continue;
      }

      // 插入到正式表
      try {
        await sql`
          INSERT INTO public.products (
            site_id, "productId", locale, "productLineId", "categoryId", "seriesId",
            parent_product_id, sku, product_name, brand, price_tiers, currency, availability,
            min_order_quantity, main_image_url, attributes, slug, status, "templateId",
            "updatedAt", "createdAt",
            source_locale, source_product_id, last_sync_time, last_sync_operator
          ) VALUES (
            ${siteId}, ${product.productId}, ${locale},
            ${product.productLineId || ''}, ${product.categoryId || ''}, ${product.seriesId || ''},
            ${product.parent_product_id || null}, ${product.sku}, ${product.product_name},
            ${product.brand || ''}, ${product.price_tiers || []}, ${product.currency || 'USD'},
            ${product.availability || 'in_stock'}, ${product.min_order_quantity || 1},
            ${product.main_image_url || ''}, ${product.attributes || {}}, ${product.slug || ''},
            'published', ${product.templateId || ''}, ${now}, ${product.createdAt || now},
            ${product.source_locale || 'en'}, ${product.source_product_id || ''},
            ${now}, ${operator || 'crawler_import'}
          )
        `;
      } catch (insertError: any) {
        errors.push(`${product.sku}: ${insertError.message}`);
        try {
          await sql`
            UPDATE public.crawler_products
            SET import_status = 'failed',
                import_error = ${insertError.message},
                imported_at = ${now}
            WHERE crawler_id = ${product.crawler_id}
          `;
        } catch {}
        continue;
      }

      // 标记为已导入
      try {
        await sql`
          UPDATE public.crawler_products
          SET import_status = 'imported',
              imported_at = ${now}
          WHERE crawler_id = ${product.crawler_id}
        `;
      } catch {}

      imported_count++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      errors.push(`${product.sku}: ${msg}`);
      try {
        await sql`
          UPDATE public.crawler_products
          SET import_status = 'failed',
              import_error = ${msg},
              imported_at = ${now}
          WHERE crawler_id = ${product.crawler_id}
        `;
      } catch {}
    }
  }

  return {
    success: errors.length === 0,
    imported_count,
    skipped_count,
    errors,
  };
}

export async function deleteCrawledProducts(
  crawlerIds: string[],
  siteId: string = DEFAULT_SITE_ID
): Promise<number> {
  try {
    const rows = await sql<{ crawler_id: string }[]>`
      DELETE FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND crawler_id IN ${sql(crawlerIds)}
      RETURNING crawler_id
    `;
    return rows.length;
  } catch (error: any) {
    throw new Error(`删除采集数据失败: ${error.message}`);
  }
}

export async function cleanupImportedProducts(
  siteId: string = DEFAULT_SITE_ID,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  try {
    const rows = await sql<{ crawler_id: string }[]>`
      DELETE FROM public.crawler_products
      WHERE site_id = ${siteId}
        AND import_status IN ('imported', 'skipped')
        AND imported_at < ${cutoffDate.toISOString()}
      RETURNING crawler_id
    `;
    return rows.length;
  } catch (error: any) {
    throw new Error(`清理采集数据失败: ${error.message}`);
  }
}