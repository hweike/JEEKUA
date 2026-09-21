// lib/discovery/services/product-sync.service.ts
import { supabase } from '@/lib/supabase/client';
import { getEnabledLanguages } from '@/lib/languages/settings';
import { LANGUAGES } from '@/lib/languages/config';
import { readProduct, writeProduct } from '@/lib/products/mdParser';
import { upsertProductIndex } from '@/lib/products/indexDb';
import { getProductLineIdFromCategory } from '@/lib/products/indexDb';
import { upsertPage } from '@/lib/discovery/register';
import { translateFields } from '@/lib/discovery/translate';
import { translateText } from '@/lib/discovery/deepseek';
import { getPrivateStorage } from '@/lib/storage/factory';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 配置管理
// ============================================================

interface ProductSyncConfig {
  fields: string[];
  promptTemplate: string;
}

let cachedConfig: ProductSyncConfig = {
  fields: [
    'product_name',
    'short_description',
    'description',
    'spec_text',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'attributes',
  ],
  promptTemplate: `你是一位专业的产品翻译专家。请将以下产品信息从 {sourceLocale} 翻译成 {targetLocale} 版本。

【翻译要求】:
1. 只翻译以下字段：{fields}
2. 对于 description 和 spec_text 字段：
   - 这些字段可能包含 HTML 标签（如 <p>, <strong>, <ul>, <li> 等）。
   - 请完整保留所有 HTML 标签、属性、类名和结构。
   - 只翻译标签之间的用户可见文本（即标签内的自然语言内容）。
   - 不要翻译任何数字、单位（如 V, A, W, Hz）、型号代码、标准编号或品牌名称。
3. 对于 attributes 字段：
   - attributes 是一个键值对对象，其中键（如“型号”“功率”）和值（如“VCB48_SBO-30WR3-N”“30”）都需要翻译。
   - 对于值，同样遵循第2条规则：只翻译自然语言部分，保留数字、单位、型号代码等。
   - 翻译后的 attributes 对象应保持相同的键值对结构。
4. 对于所有纯文本字段，直接翻译自然语言内容。
5. 不要翻译 id、任何技术标识符。
6. 翻译要准确、自然，符合目标语言的产品营销表达习惯；专业术语应使用行业标准译法。

【输入数据】（JSON格式）:
{data}

【输出格式】:
请直接输出纯 JSON 对象，包含翻译后的所有字段，字段名保持不变，不要添加任何额外解释或代码块标记。`,
};

async function getProductSyncConfig(): Promise<ProductSyncConfig> {
  const storage = getPrivateStorage();
  const key = 'discovery/product-sync-config.json';
  try {
    const content = await storage.read(key, 'utf8');
    const config = JSON.parse(content as string);
    cachedConfig = config;
    return config;
  } catch {
    return cachedConfig;
  }
}

// ============================================================
// 接口定义
// ============================================================

export interface ProductSyncItem {
  productId: string;
  product_name: string;
  sku: string;
  slug: string | null;
  main_image_url: string | null;
  updatedAt: string;
  source_locale: string | null;
  source_product_id: string | null;
  parent_product_id: string | null;
  syncedCount: number;
  totalTargetCount: number;
  needSync: boolean;
}

export interface ProductSyncResult {
  items: ProductSyncItem[];
  totalTargetCount: number;
}

// ============================================================
// 获取同步状态列表
// ============================================================

export async function getProductSyncStatus(
  sourceLocale: string,
  includeVariants: boolean = true
): Promise<ProductSyncResult> {
  const enabledCodes = await getEnabledLanguages();
  const allEnabledLocales = LANGUAGES.filter(lang => enabledCodes.includes(lang.code)).map(lang => lang.code);

  let targetLocales: string[];
  if (sourceLocale === 'zh') {
    // 中文→英文：仅目标英文
    targetLocales = allEnabledLocales.filter(loc => loc === 'en');
  } else {
    targetLocales = allEnabledLocales.filter(loc => loc !== sourceLocale);
  }
  const totalTargetCount = targetLocales.length;

  let query = supabase
    .from('products')
    .select(`
      productId,
      product_name,
      sku,
      slug,
      main_image_url,
      updatedAt,
      source_locale,
      source_product_id,
      parent_product_id
    `)
    .eq('site_id', SITE_ID)
    .eq('locale', sourceLocale);

  if (!includeVariants) {
    query = query.is('parent_product_id', null);
  }

  query = query.order('updatedAt', { ascending: false });

  const { data: products, error } = await query;
  if (error) {
    console.error('查询产品失败:', error);
    throw new Error(`查询产品失败: ${error.message}`);
  }

  if (!products || products.length === 0) {
    return { items: [], totalTargetCount };
  }

  const parentProductIds = products
    .filter(p => p.parent_product_id === null)
    .map(p => p.productId);

  let syncQuery = supabase
    .from('products')
    .select('source_product_id, source_locale, productId, locale')
    .eq('site_id', SITE_ID)
    .in('source_product_id', parentProductIds)
    .eq('source_locale', sourceLocale)
    .in('locale', targetLocales);

  const { data: syncRecords, error: syncError } = await syncQuery;
  if (syncError) {
    console.error('查询同步记录失败:', syncError);
    throw new Error(`查询同步记录失败: ${syncError.message}`);
  }

  const syncMap = new Map<string, Set<string>>();
  if (syncRecords) {
    for (const rec of syncRecords) {
      const pid = rec.source_product_id;
      if (!syncMap.has(pid)) syncMap.set(pid, new Set());
      syncMap.get(pid)!.add(rec.locale);
    }
  }

  const items: ProductSyncItem[] = products.map(p => {
    const synced = syncMap.get(p.productId)?.size || 0;
    const needSync = totalTargetCount > 0 && synced < totalTargetCount;
    return {
      productId: p.productId,
      product_name: p.product_name,
      sku: p.sku || '',
      slug: p.slug || null,
      main_image_url: p.main_image_url || null,
      updatedAt: p.updatedAt,
      source_locale: p.source_locale || null,
      source_product_id: p.source_product_id || null,
      parent_product_id: p.parent_product_id || null,
      syncedCount: synced,
      totalTargetCount,
      needSync,
    };
  });

  return { items, totalTargetCount };
}

// ============================================================
// 批量同步实现（顶层过滤父产品）
// ============================================================

interface SyncProgressLog {
  productId: string;
  message: string;
  status: 'processing' | 'success' | 'failed';
}

interface BatchSyncOptions {
  sourceLocale: string;
  targetLocales: string[];
  productIds: string[];
  mode: 'repair' | 'copy' | 'copy_translate';
  operator: string;
  syncStrategy?: 'full' | 'incremental';  // 新增策略
  onProgress?: (log: SyncProgressLog) => void;
}

interface BatchSyncResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 仅同步父产品（变体会由父产品同步时一并处理）
 */
async function filterParentProductIds(productIds: string[], sourceLocale: string): Promise<string[]> {
  if (!productIds || productIds.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('productId, parent_product_id')
    .eq('site_id', SITE_ID)
    .eq('locale', sourceLocale)
    .in('productId', productIds);
  if (error) {
    console.error('查询产品父级信息失败:', error);
    return [];
  }
  return data.filter(p => p.parent_product_id === null).map(p => p.productId);
}

export async function executeProductBatchSync(
  options: Omit<BatchSyncOptions, 'onProgress'>
): Promise<BatchSyncResult> {
  const { sourceLocale, targetLocales, productIds, mode, operator, syncStrategy = 'full' } = options;
  const parentIds = await filterParentProductIds(productIds, sourceLocale);
  if (parentIds.length === 0) {
    return { total: 0, success: 0, failed: 0, errors: ['没有可同步的父产品'] };
  }

  const results: BatchSyncResult = {
    total: parentIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const productId of parentIds) {
    try {
      await syncSingleProduct({
        productId,
        sourceLocale,
        targetLocales,
        mode,
        operator,
        syncStrategy,
        onProgress: (log) => {
          if (log.status === 'success') results.success++;
          else if (log.status === 'failed') {
            results.failed++;
            results.errors.push(`${log.productId}: ${log.message}`);
          }
        },
      });
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${productId}: ${err.message}`);
    }
  }
  return results;
}

export async function executeProductBatchSyncWithProgress(
  options: BatchSyncOptions
): Promise<void> {
  const { sourceLocale, targetLocales, productIds, mode, operator, syncStrategy = 'full', onProgress } = options;
  const parentIds = await filterParentProductIds(productIds, sourceLocale);
  if (parentIds.length === 0) {
    onProgress?.({
      productId: 'batch',
      message: '没有可同步的父产品（变体自动由父产品同步）',
      status: 'failed',
    });
    return;
  }

  // 仅检查环境变量（不发起任何网络请求）
  if (mode === 'copy_translate') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      onProgress?.({
        productId: 'system',
        message: 'DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置',
        status: 'failed',
      });
      throw new Error('DEEPSEEK_API_KEY 环境变量未配置');
    }
    onProgress?.({
      productId: 'system',
      message: 'Deepseek API Key 已配置，开始同步...',
      status: 'processing',
    });
  }

  for (const productId of parentIds) {
    try {
      await syncSingleProduct({
        ...options,
        productId,
        onProgress: (log) => {
          onProgress?.(log);
        },
      });
    } catch (err: any) {
      onProgress?.({
        productId,
        message: `同步失败: ${err.message}`,
        status: 'failed',
      });
    }
  }
}

// ============================================================
// 单个产品同步核心逻辑（含增量/全量分支）
// ============================================================

async function syncSingleProduct(options: {
  productId: string;
  sourceLocale: string;
  targetLocales: string[];
  mode: 'repair' | 'copy' | 'copy_translate';
  operator: string;
  syncStrategy?: 'full' | 'incremental';
  onProgress?: (log: SyncProgressLog) => void;
}): Promise<void> {
  const { productId, sourceLocale, targetLocales, mode, operator, syncStrategy = 'full', onProgress } = options;

  // 1. 查询产品是否为变体（防御性，实际已在上层过滤）
  const { data: productInfo, error: productInfoError } = await supabase
    .from('products')
    .select('parent_product_id')
    .eq('site_id', SITE_ID)
    .eq('productId', productId)
    .eq('locale', sourceLocale)
    .maybeSingle();

  if (productInfoError || !productInfo) {
    throw new Error(`产品 ${productId} 在 ${sourceLocale} 不存在`);
  }

  const isVariant = !!productInfo.parent_product_id;
  if (isVariant) {
    onProgress?.({
      productId,
      message: `该产品为变体，已由父产品 ${productInfo.parent_product_id} 同步，无需单独处理`,
      status: 'success',
    });
    return;
  }

  const parentId = productId;

  // ---------- 修复模式 ----------
  if (mode === 'repair') {
    // 获取源语言下所有产品（父 + 变体）
    const { data: sourceProducts, error: sourceError } = await supabase
      .from('products')
      .select('productId')
      .eq('site_id', SITE_ID)
      .eq('locale', sourceLocale)
      .or(`productId.eq.${parentId},parent_product_id.eq.${parentId}`);

    if (sourceError) {
      throw new Error(`获取源产品列表失败: ${sourceError.message}`);
    }
    if (!sourceProducts || sourceProducts.length === 0) {
      onProgress?.({ productId, message: '未找到源产品记录', status: 'failed' });
      return;
    }

    for (const targetLocale of targetLocales) {
      try {
        onProgress?.({
          productId,
          message: `开始修复关联到 ${targetLocale}...`,
          status: 'processing',
        });

        // 检查目标语言中存在的产品
        const { data: targetProducts, error: targetError } = await supabase
          .from('products')
          .select('productId')
          .eq('site_id', SITE_ID)
          .eq('locale', targetLocale)
          .in('productId', sourceProducts.map(p => p.productId));

        if (targetError) {
          throw new Error(`查询目标产品失败: ${targetError.message}`);
        }
        if (!targetProducts || targetProducts.length === 0) {
          onProgress?.({
            productId,
            message: `目标 ${targetLocale} 无任何产品记录，修复失败，请使用复制模式`,
            status: 'failed',
          });
          continue;
        }

        // 为每个存在的产品更新同步字段
        for (const sp of sourceProducts) {
          const exists = targetProducts.some(tp => tp.productId === sp.productId);
          if (!exists) continue;
          await updateProductSyncFields(sp.productId, targetLocale, sourceLocale, parentId, operator);
          await updatePageSyncFields(sp.productId, targetLocale, sourceLocale, parentId, operator);
        }

        onProgress?.({
          productId,
          message: `已修复同步关联到 ${targetLocale}`,
          status: 'success',
        });
      } catch (err: any) {
        onProgress?.({
          productId,
          message: `修复到 ${targetLocale} 失败: ${err.message}`,
          status: 'failed',
        });
      }
    }
    return;
  }

  // ---------- 复制模式（copy / copy_translate） ----------
  // 步骤1: 读取源父产品的 MD 文件
  onProgress?.({ productId, message: `[1/8] 读取源产品数据...`, status: 'processing' });
  const sourceProduct = await readProduct(sourceLocale, parentId);
  if (!sourceProduct) {
    onProgress?.({ productId, message: `[1/8] 源产品数据不存在`, status: 'failed' });
    throw new Error(`源父产品 ${parentId} 在 ${sourceLocale} 不存在`);
  }
  onProgress?.({ productId, message: `[1/8] 源产品数据读取完成`, status: 'processing' });

  // 步骤2: 从数据库获取源父产品的完整信息（包括 productLineId 等字段）
  onProgress?.({ productId, message: `[2/8] 获取源产品数据库信息...`, status: 'processing' });
  let { data: sourceDbRecord, error: dbError } = await supabase
    .from('products')
    .select('productLineId, categoryId, seriesId')
    .eq('site_id', SITE_ID)
    .eq('productId', parentId)
    .eq('locale', sourceLocale)
    .maybeSingle();

  if (dbError) {
    onProgress?.({ productId, message: `[2/8] 获取数据库信息失败`, status: 'failed' });
    throw new Error(`无法获取源父产品数据库记录 ${parentId}: ${dbError.message}`);
  }

  // 如果源 productLineId 为空，尝试从其他语言继承
  let effectiveProductLineId = sourceDbRecord?.productLineId || '';
  let effectiveCategoryId = sourceProduct.categoryId || sourceDbRecord?.categoryId || '';
  let effectiveSeriesId = sourceProduct.seriesId || sourceDbRecord?.seriesId || '';

  if (!effectiveProductLineId) {
    // 查询其他语言中该产品是否有 productLineId
    const { data: otherLangRecord, error: otherError } = await supabase
      .from('products')
      .select('productLineId')
      .eq('site_id', SITE_ID)
      .eq('productId', parentId)
      .neq('locale', sourceLocale)
      .not('productLineId', 'eq', '')
      .limit(1)
      .maybeSingle();

    if (!otherError && otherLangRecord?.productLineId) {
      effectiveProductLineId = otherLangRecord.productLineId;
    } else {
      // 如果其他语言也没有，尝试从分类获取
      try {
        const catId = effectiveCategoryId || sourceDbRecord?.categoryId;
        if (catId) {
          const lineId = await getProductLineIdFromCategory(sourceLocale, catId);
          if (lineId) effectiveProductLineId = lineId;
        }
      } catch (ignore) { /* ignore */ }
    }
  }
  onProgress?.({ productId, message: `[2/8] 数据库信息获取完成 (productLineId: ${effectiveProductLineId})`, status: 'processing' });

  // 过滤目标语言（排除源语言本身和源产品的源语言）
  const allowedTargets = targetLocales.filter(loc => {
    if (sourceProduct.source_locale && loc === sourceProduct.source_locale) return false;
    if (loc === sourceLocale) return false;
    return true;
  });

  if (allowedTargets.length === 0) {
    onProgress?.({ productId, message: '没有有效的目标语言', status: 'failed' });
    return;
  }

  // 辅助：获取目标产品已存在的 createdAt
  async function getTargetCreatedAt(pid: string, loc: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('products')
      .select('createdAt')
      .eq('site_id', SITE_ID)
      .eq('productId', pid)
      .eq('locale', loc)
      .maybeSingle();
    if (error || !data) return null;
    return data.createdAt;
  }

  // --- 增量/全量分支：处理每个目标语言 ---
  for (const targetLocale of allowedTargets) {
    // **增量模式检查**：如果该语言已同步，则跳过（仅当 syncStrategy === 'incremental'）
    if (syncStrategy === 'incremental') {
      const { data: existingSync, error: checkError } = await supabase
        .from('products')
        .select('productId')
        .eq('site_id', SITE_ID)
        .eq('productId', parentId)
        .eq('locale', targetLocale)
        .eq('source_locale', sourceLocale)
        .eq('source_product_id', parentId)
        .maybeSingle();

      if (!checkError && existingSync) {
        onProgress?.({
          productId,
          message: `跳过 ${targetLocale}（已同步）`,
          status: 'success',
        });
        continue; // 跳过该语言，不执行任何同步操作
      }
    }

    // 全量模式或目标未同步：执行完整同步
    try {
      onProgress?.({
        productId,
        message: `开始同步到 ${targetLocale} (${mode})...`,
        status: 'processing',
      });

      // 步骤3: 翻译（如果需要）
      let translatedData = { ...sourceProduct };
      if (mode === 'copy_translate') {
        onProgress?.({ productId, message: `[3/8] 翻译产品内容（Deepseek）...`, status: 'processing' });
        translatedData = await translateProductData(
          sourceProduct,
          sourceLocale,
          targetLocale,
          productId,
          onProgress
        );
        onProgress?.({ productId, message: `[3/8] 翻译完成`, status: 'processing' });
      } else {
        onProgress?.({ productId, message: `[3/8] 跳过翻译（仅复制）`, status: 'processing' });
      }

      // 步骤4: 写入目标 MD 文件
      onProgress?.({ productId, message: `[4/8] 写入 MD 文件...`, status: 'processing' });
      await writeProduct(targetLocale, parentId, translatedData, translatedData.content || '');
      onProgress?.({ productId, message: `[4/8] MD 文件写入完成`, status: 'processing' });

      const now = new Date().toISOString();

      // --- 步骤5: 父产品索引 ---
      onProgress?.({ productId, message: `[5/8] 更新 products 索引...`, status: 'processing' });
      const parentExistingCreatedAt = await getTargetCreatedAt(parentId, targetLocale);
      const parentIndexData = {
        productId: parentId,
        locale: targetLocale,
        productLineId: effectiveProductLineId,
        categoryId: effectiveCategoryId,
        seriesId: effectiveSeriesId,
        parent_product_id: null,
        sku: sourceProduct.sku,
        product_name: translatedData.product_name,
        brand: sourceProduct.brand || '',
        price_tiers: sourceProduct.price_tiers || [],
        currency: sourceProduct.currency || 'USD',
        availability: sourceProduct.availability || 'in_stock',
        min_order_quantity: sourceProduct.min_order_quantity || 1,
        main_image_url: sourceProduct.main_image_url || '',
        attributes: translatedData.attributes || {},
        slug: sourceProduct.slug || '',
        status: sourceProduct.status || 'published',
        templateId: sourceProduct.templateId || '',
        updatedAt: now,
        createdAt: parentExistingCreatedAt || now,
      };
      await upsertProductIndex(parentIndexData as any);
      await updateProductSyncFields(parentId, targetLocale, sourceLocale, parentId, operator);
      onProgress?.({ productId, message: `[5/8] products 索引更新完成`, status: 'processing' });

      // --- 步骤6: 父产品 pages 注册 ---
      onProgress?.({ productId, message: `[6/8] 注册 pages 表...`, status: 'processing' });
      const parentPageData = {
        id: `product:${parentId}`,
        type: 'product',
        title: translatedData.product_name,
        slug: translatedData.slug || parentId,
        url: `/product/${translatedData.slug || parentId}`,
        cover_image: translatedData.main_image_url || null,
        seo_title: translatedData.seo_title || null,
        seo_description: translatedData.seo_description || null,
        seo_keywords: translatedData.seo_keywords || null,
        content_summary: translatedData.short_description || null,
        content_full: translatedData.description || null,
        updatedAt: now,
        source_locale: sourceLocale,
        source_content_hash: null,
        last_sync_time: now,
        last_sync_operator: operator,
        translated_by_ai: mode === 'copy_translate',
      };
      await upsertPage(parentPageData, targetLocale);
      onProgress?.({ productId, message: `[6/8] pages 注册完成`, status: 'processing' });

      // --- 步骤7: 变体处理 ---
      const variants = translatedData.variants || [];
      if (variants.length > 0) {
        onProgress?.({ productId, message: `[7/8] 处理 ${variants.length} 个变体...`, status: 'processing' });
        for (const variant of variants) {
          if (!variant.id) continue;
          onProgress?.({ productId, message: `  处理变体 ${variant.id}...`, status: 'processing' });

          // 变体索引（继承父产品的 productLineId 等）
          const variantExistingCreatedAt = await getTargetCreatedAt(variant.id, targetLocale);
          const variantIndexData = {
            productId: variant.id,
            locale: targetLocale,
            productLineId: effectiveProductLineId,
            categoryId: effectiveCategoryId,
            seriesId: effectiveSeriesId,
            parent_product_id: parentId,
            sku: variant.sku || '',
            product_name: variant.product_name || '',
            brand: sourceProduct.brand || '',
            price_tiers: sourceProduct.price_tiers || [],
            currency: sourceProduct.currency || 'USD',
            availability: sourceProduct.availability || 'in_stock',
            min_order_quantity: sourceProduct.min_order_quantity || 1,
            main_image_url: variant.main_image_url || '',
            attributes: variant.attributes || {},
            slug: variant.slug || '',
            status: sourceProduct.status || 'published',
            templateId: sourceProduct.templateId || '',
            updatedAt: now,
            createdAt: variantExistingCreatedAt || now,
          };
          await upsertProductIndex(variantIndexData as any);
          await updateProductSyncFields(variant.id, targetLocale, sourceLocale, parentId, operator);

          // 变体 pages 注册
          const variantPageData = {
            id: `product:${parentId}/${variant.id}`,
            type: 'product',
            title: variant.product_name || '',
            slug: variant.slug || '',
            url: `/product/${variant.slug || variant.id}`,
            cover_image: variant.main_image_url || null,
            seo_title: variant.seo_title || null,
            seo_description: variant.seo_description || null,
            seo_keywords: variant.seo_keywords || null,
            content_summary: variant.short_description || null,
            content_full: variant.description || null,
            updatedAt: now,
            source_locale: sourceLocale,
            source_content_hash: null,
            last_sync_time: now,
            last_sync_operator: operator,
            translated_by_ai: mode === 'copy_translate',
          };
          await upsertPage(variantPageData, targetLocale);
        }
        onProgress?.({ productId, message: `[7/8] 所有变体处理完成`, status: 'processing' });
      } else {
        onProgress?.({ productId, message: `[7/8] 无变体，跳过`, status: 'processing' });
      }

      // 步骤8: 完成
      onProgress?.({
        productId,
        message: `[8/8] 同步到 ${targetLocale} 完成`,
        status: 'success',
      });
    } catch (err: any) {
      onProgress?.({
        productId,
        message: `同步到 ${targetLocale} 失败: ${err.message}`,
        status: 'failed',
      });
    }
  }
}

// ============================================================
// 辅助函数
// ============================================================

async function updateProductSyncFields(
  productId: string,
  locale: string,
  sourceLocale: string,
  sourceProductId: string,
  operator: string
) {
  const { error } = await supabase
    .from('products')
    .update({
      source_locale: sourceLocale,
      source_product_id: sourceProductId,
      last_sync_time: new Date().toISOString(),
      last_sync_operator: operator,
    })
    .eq('site_id', SITE_ID)
    .eq('productId', productId)
    .eq('locale', locale);
  if (error) {
    console.error(`更新 products 同步字段失败 (${productId}, ${locale}):`, error);
    throw new Error(`更新同步字段失败: ${error.message}`);
  }
}

async function updatePageSyncFields(
  productId: string,
  locale: string,
  sourceLocale: string,
  sourceProductId: string,
  operator: string
) {
  const pageId = `product:${productId}`;
  const { error } = await supabase
    .from('pages')
    .update({
      source_locale: sourceLocale,
      source_content_hash: null,
      last_sync_time: new Date().toISOString(),
      last_sync_operator: operator,
    })
    .eq('id', pageId)
    .eq('site_id', SITE_ID)
    .eq('locale', locale);
  if (error) {
    console.error(`更新 pages 同步字段失败 (${pageId}, ${locale}):`, error);
  }
}

// ============================================================
// 翻译产品数据（支持变体 attributes 翻译）
// ============================================================

async function translateProductData(
  productData: any,
  sourceLocale: string,
  targetLocale: string,
  productId: string,
  onProgress?: (log: SyncProgressLog) => void
): Promise<any> {
  if (sourceLocale === targetLocale) return productData;

  const config = await getProductSyncConfig();
  const fields = config.fields || [];
  const promptTemplate = config.promptTemplate || '';

  // 1. 翻译普通字段（非 attributes），包括父产品和变体的这些字段
  const fieldsToTranslate = fields.filter(f => f !== 'attributes');
  let translated = { ...productData };
  if (fieldsToTranslate.length > 0) {
    onProgress?.({ productId, message: `  翻译普通字段...`, status: 'processing' });
    translated = await translateFields(translated, 'product', targetLocale);
    onProgress?.({ productId, message: `  普通字段翻译完成`, status: 'processing' });
  }

  // 2. 辅助函数：翻译 attributes 对象（带重试）
  const translateAttributes = async (attrObj: any, context: string): Promise<any> => {
    if (!attrObj || typeof attrObj !== 'object') return attrObj;
    const attrJson = JSON.stringify(attrObj);
    const fieldsStr = fields.join('、');
    const prompt = promptTemplate
      .replace(/\{sourceLocale\}/g, sourceLocale)
      .replace(/\{targetLocale\}/g, targetLocale)
      .replace(/\{fields\}/g, fieldsStr)
      .replace(/\{data\}/g, attrJson);

    let translatedAttrJson: string | null = null;
    let lastError: any;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        translatedAttrJson = await translateText(attrJson, targetLocale, prompt);
        break;
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.response?.status || err.code;
        if (status === 401 || status === 402 || status === 400) {
          throw new Error(`翻译失败 (HTTP ${status}): ${err.message || '认证/余额问题'}`);
        }
        if (status === 429 || (status >= 500 && status <= 504)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          console.warn(`[ProductSync][${productId}] ${context} 翻译重试 ${attempt}/${maxRetries}，${delay}ms 后重试`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          console.warn(`[ProductSync][${productId}] ${context} 翻译重试 ${attempt}/${maxRetries}，${delay}ms 后重试`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }
    if (!translatedAttrJson) {
      throw new Error(`${context} 翻译最终失败: ${lastError?.message || '未知错误'}`);
    }
    try {
      return JSON.parse(translatedAttrJson);
    } catch {
      throw new Error(`${context} 翻译返回内容不是合法 JSON`);
    }
  };

  // 3. 翻译父产品的 attributes
  if (fields.includes('attributes') && productData.attributes && typeof productData.attributes === 'object') {
    onProgress?.({ productId, message: `  翻译父产品 attributes (键值对)...`, status: 'processing' });
    translated.attributes = await translateAttributes(productData.attributes, '父产品 attributes');
    onProgress?.({ productId, message: `  父产品 attributes 翻译完成`, status: 'processing' });
  } else {
    onProgress?.({ productId, message: `  父产品无 attributes 需要翻译`, status: 'processing' });
  }

  // 4. 翻译变体的 attributes
  if (fields.includes('attributes') && translated.variants && Array.isArray(translated.variants)) {
    onProgress?.({ productId, message: `  翻译变体 attributes...`, status: 'processing' });
    for (const variant of translated.variants) {
      if (variant.attributes && typeof variant.attributes === 'object') {
        try {
          variant.attributes = await translateAttributes(variant.attributes, `变体 ${variant.id} attributes`);
        } catch (err) {
          console.warn(`[ProductSync][${productId}] 变体 ${variant.id} attributes 翻译失败，保留原文:`, err);
          throw err;
        }
      }
    }
    onProgress?.({ productId, message: `  变体 attributes 翻译完成`, status: 'processing' });
  } else {
    onProgress?.({ productId, message: `  无变体或变体无 attributes`, status: 'processing' });
  }

  return translated;
}