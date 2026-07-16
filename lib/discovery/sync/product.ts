// lib/discovery/sync/product.ts
import { SyncContext, SyncResult } from './types';
import { translateText } from '../deepseek';
import { readProduct, writeProduct } from '@/lib/products/mdParser';
import { upsertProductIndex } from '@/lib/products/indexDb';
import { upsertPage, computeHash, SITE_ID } from '@/lib/discovery/register';
import { generateSlug } from '@/lib/products/seoGenerator';

function shouldTranslateValue(value: any): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^[\d\s\.\-]+$/.test(trimmed)) return false;
  if (/^[\d\s\.\-]+\s*[A-Za-z]+$/.test(trimmed)) return false;
  if (/[\u4e00-\u9fa5]/.test(trimmed)) return true;
  return true;
}

async function translateAttributesObj(
  obj: Record<string, any>,
  targetLocale: string
): Promise<Record<string, any>> {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const translatedKey = await translateText(key, targetLocale);
    if (typeof value === 'string') {
      result[translatedKey] = shouldTranslateValue(value)
        ? await translateText(value, targetLocale)
        : value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[translatedKey] = await translateAttributesObj(value, targetLocale);
    } else {
      result[translatedKey] = value;
    }
  }
  return result;
}

async function translateProductFields(
  product: any,
  targetLocale: string
): Promise<any> {
  const translated = { ...product };
  const stringFields = [
    'product_name', 'short_description', 'description',
    'seo_title', 'seo_description', 'seo_keywords'
  ];
  for (const field of stringFields) {
    if (product[field]) {
      translated[field] = await translateText(product[field], targetLocale);
    }
  }
  if (product.attributes) {
    translated.attributes = await translateAttributesObj(product.attributes, targetLocale);
  }
  return translated;
}

export async function syncProduct(context: SyncContext): Promise<SyncResult> {
  if (context.repairOnly) return { success: true };

  try {
    const rawId = context.sourcePage.id.replace('product:', '');
    const isVariant = rawId.includes('/');

    let sourceMd: any = null;
    let parentRawId: string = '';
    let variantId: string = '';

    if (isVariant) {
      const parts = rawId.split('/');
      parentRawId = parts[0];
      variantId = parts[1];
      sourceMd = await readProduct(context.sourcePage.locale, parentRawId);
      if (!sourceMd) {
        return { success: false, error: `Parent product ${parentRawId} not found` };
      }
    } else {
      sourceMd = await readProduct(context.sourcePage.locale, rawId);
      if (!sourceMd) {
        return { success: false, error: `Product ${rawId} not found` };
      }
    }

    // 如果 frontMatter 为空但 sourceMd 本身有数据，则使用 sourceMd
    let sourceFrontMatter = sourceMd.frontMatter || {};
    if (Object.keys(sourceFrontMatter).length === 0) {
      const keys = Object.keys(sourceMd);
      const hasFrontmatterFields = keys.some(k => ['id', 'product_name', 'sku', 'categoryId', 'variants'].includes(k));
      if (hasFrontmatterFields) {
        sourceFrontMatter = { ...sourceMd };
        delete sourceFrontMatter.content;
        delete sourceFrontMatter.frontMatter;
      }
    }

    const sourceContent = sourceMd.content || '';

    // 确保 variants 存在
    if (!sourceFrontMatter.variants) {
      sourceFrontMatter.variants = [];
    }

    // ---------- 关键修复：优先保留源 MD 中的分类 ID，仅在缺失时从 context 补充 ----------
    if (!sourceFrontMatter.productLineId) {
      sourceFrontMatter.productLineId = context.sourcePage.productLineId || '';
    }
    if (!sourceFrontMatter.categoryId) {
      sourceFrontMatter.categoryId = context.sourcePage.categoryId || '';
    }
    if (!sourceFrontMatter.seriesId) {
      sourceFrontMatter.seriesId = context.sourcePage.seriesId || '';
    }

    if (!sourceFrontMatter.product_name) {
      sourceFrontMatter.product_name = context.sourcePage.title || '';
    }

    // 准备目标数据（复制或翻译）
    let translatedFrontMatter: any;
    let contentToWrite: string;

    if (context.translate) {
      translatedFrontMatter = await translateProductFields(sourceFrontMatter, context.targetLocale);
      // 确保所有字段都被复制
      for (const key of Object.keys(sourceFrontMatter)) {
        if (!(key in translatedFrontMatter)) {
          translatedFrontMatter[key] = sourceFrontMatter[key];
        }
      }
      if (Array.isArray(sourceFrontMatter.variants)) {
        translatedFrontMatter.variants = [];
        for (const variant of sourceFrontMatter.variants) {
          const translatedVariant = await translateProductFields(variant, context.targetLocale);
          translatedVariant.id = variant.id;
          for (const key of Object.keys(variant)) {
            if (!(key in translatedVariant)) {
              translatedVariant[key] = variant[key];
            }
          }
          translatedFrontMatter.variants.push(translatedVariant);
        }
      }
      contentToWrite = sourceContent;
    } else {
      translatedFrontMatter = JSON.parse(JSON.stringify(sourceFrontMatter));
      contentToWrite = sourceContent;
    }

    if (!translatedFrontMatter.variants) {
      translatedFrontMatter.variants = [];
    }

    // 最终确保业务字段存在（如果 translatedFrontMatter 中仍为空，再从 context 补充一次）
    if (!translatedFrontMatter.productLineId) {
      translatedFrontMatter.productLineId = context.sourcePage.productLineId || '';
    }
    if (!translatedFrontMatter.categoryId) {
      translatedFrontMatter.categoryId = context.sourcePage.categoryId || '';
    }
    if (!translatedFrontMatter.seriesId) {
      translatedFrontMatter.seriesId = context.sourcePage.seriesId || '';
    }

    // 写入目标 MD
    if (isVariant) {
      const targetParentMd = await readProduct(context.targetLocale, parentRawId);
      if (!targetParentMd) {
        return { success: false, error: `Target parent product ${parentRawId} not found` };
      }
      const targetVariants = targetParentMd.frontMatter.variants || [];
      const cleanVariant = {
        id: variantId,
        product_name: translatedFrontMatter.product_name || '',
        sku: translatedFrontMatter.sku || '',
        short_description: translatedFrontMatter.short_description || '',
        main_image_url: translatedFrontMatter.main_image_url || '',
        additional_images: translatedFrontMatter.additional_images || [],
        attributes: translatedFrontMatter.attributes || {},
        slug: translatedFrontMatter.slug || '',
        seo_title: translatedFrontMatter.seo_title || '',
        seo_description: translatedFrontMatter.seo_description || '',
        seo_keywords: translatedFrontMatter.seo_keywords || '',
        description: translatedFrontMatter.description || '',
      };
      const idx = targetVariants.findIndex(v => v.id === variantId);
      if (idx === -1) targetVariants.push(cleanVariant);
      else targetVariants[idx] = cleanVariant;
      await writeProduct(
        context.targetLocale,
        parentRawId,
        { ...targetParentMd.frontMatter, variants: targetVariants },
        targetParentMd.content || ''
      );
    } else {
      await writeProduct(context.targetLocale, rawId, translatedFrontMatter, contentToWrite);
    }

    // 更新索引（父产品或变体）
    const now = new Date().toISOString();
    const productIdForIndex = isVariant ? variantId : rawId;
    const productLineId = translatedFrontMatter.productLineId || '';
    const categoryId = translatedFrontMatter.categoryId || '';
    const seriesId = translatedFrontMatter.seriesId || '';
    const parent_product_id = isVariant ? parentRawId : (translatedFrontMatter.parent_product_id || null);

    await upsertProductIndex({
      productId: productIdForIndex,
      locale: context.targetLocale,
      productLineId,
      categoryId,
      seriesId,
      parent_product_id,
      sku: translatedFrontMatter.sku || '',
      product_name: translatedFrontMatter.product_name || '',
      brand: translatedFrontMatter.brand || '',
      price_tiers: translatedFrontMatter.price_tiers || [],
      currency: translatedFrontMatter.currency || 'USD',
      availability: translatedFrontMatter.availability || 'in_stock',
      min_order_quantity: translatedFrontMatter.min_order_quantity || 1,
      main_image_url: translatedFrontMatter.main_image_url || '',
      attributes: translatedFrontMatter.attributes || {},
      slug: translatedFrontMatter.slug || '',
      status: translatedFrontMatter.status || 'published',
      updatedAt: now,
      createdAt: now,
    });

    // 处理变体（仅父产品）
    if (!isVariant && Array.isArray(translatedFrontMatter.variants) && translatedFrontMatter.variants.length > 0) {
      const sourceHash = context.sourcePage.content_hash || '';
      for (const variant of translatedFrontMatter.variants) {
        const varId = variant.id;
        if (!varId) continue;
        const variantPageId = `product:${rawId}/${varId}`;

        await upsertPage({
          id: variantPageId,
          type: 'product',
          title: variant.product_name || '',
          slug: variant.slug || '',
          url: `/product/${variant.slug || ''}`,
          cover_image: variant.main_image_url || null,
          seo_title: variant.seo_title || null,
          seo_description: variant.seo_description || null,
          seo_keywords: variant.seo_keywords || null,
          content_summary: variant.short_description || '',
          content_full: '',
          updatedAt: now,
          source_content_hash: sourceHash,
          source_locale: context.sourcePage.locale,
          translated_by_ai: false,
        }, context.targetLocale);

        await upsertProductIndex({
          productId: varId,
          locale: context.targetLocale,
          productLineId,
          categoryId,
          seriesId,
          parent_product_id: rawId,
          sku: variant.sku || '',
          product_name: variant.product_name || '',
          brand: translatedFrontMatter.brand || '',
          price_tiers: translatedFrontMatter.price_tiers || [],
          currency: translatedFrontMatter.currency || 'USD',
          availability: translatedFrontMatter.availability || 'in_stock',
          min_order_quantity: translatedFrontMatter.min_order_quantity || 1,
          main_image_url: variant.main_image_url || '',
          attributes: variant.attributes || {},
          slug: variant.slug || '',
          status: 'published',
          updatedAt: now,
          createdAt: now,
        });
      }
    }

    return { success: true, data: translatedFrontMatter };
  } catch (error: any) {
    console.error('Product sync error:', error);
    return { success: false, error: error.message };
  }
}