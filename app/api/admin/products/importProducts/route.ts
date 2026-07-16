// app/api/admin/products/importProducts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { nanoid } from 'nanoid';
import { getProductSettings } from '@/lib/products/productSettings';
import {
  getProductLineIdFromCategory,
  getAllProductIds,
  upsertProductIndex,
} from '@/lib/products/indexDb';
import { writeProduct, readProduct } from '@/lib/products/mdParser';
import { generateSlug, generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { getPrivateStorage, getPublicStorage } from '@/lib/storage/factory';
import { supabase } from '@/lib/supabase/client';
import { downloadAndSaveImage } from '@/lib/files/download';

const DEFAULT_SITE_ID = '000001';

interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

interface ImageTask {
  url: string;
  productId: string;
  field: string;
  index?: number;
  variantId?: string;
}

const imageCache = new Map<string, string>();

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

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const locale = (formData.get('locale') as string) || 'zh';

  if (!file) {
    return NextResponse.json({ error: '未上传文件' }, { status: 400 });
  }
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return NextResponse.json({ error: '请上传 Excel 文件（.xlsx 或 .xls）' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel 文件为空' }, { status: 400 });
    }

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

    const productSettings = await getProductSettings(locale);
    const defaultSettings = (productSettings as any).defaultSettings || {};
    const siteName = await getSiteName();
    const skuRule = defaultSettings.sku_rule || 'P-{timestamp}';
    const categories = await loadCategories(locale);

    const results: { row: number; sku: string; success: boolean; error?: string; productId?: string }[] = [];
    let currentParentProductId: string | null = null;
    const parentProductsMap = new Map<string, any>();
    const imageTasks: ImageTask[] = [];

    // 第一遍解析：构建父产品和变体的内存数据，收集图片任务
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2;
      try {
        const productType = row['产品类型']?.trim();
        if (productType !== 'parent' && productType !== 'variant') {
          throw new Error(`产品类型必须是 parent 或 variant，当前: ${productType}`);
        }

        let sku = row['SKU']?.trim();
        if (!sku) sku = generateSkuFromRule(skuRule);
        else sku = sku.trim();

        if (productType === 'parent') {
          // 查询父产品是否存在（SKU 匹配且不是变体）
          const { data: existingProduct, error: queryError } = await supabase
            .from('products')
            .select('productId, createdAt')
            .eq('site_id', DEFAULT_SITE_ID)
            .eq('locale', locale)
            .eq('sku', sku)
            .is('parent_product_id', null)
            .maybeSingle();

          if (queryError) {
            console.error(`第 ${rowNum} 行查询失败:`, queryError);
            throw new Error(`查询数据库失败: ${queryError.message}`);
          }

          const isUpdate = !!existingProduct;
          let productId: string;
          if (isUpdate) {
            productId = existingProduct.productId;
            usedIds.add(productId);
            console.log(`[行${rowNum}] 复用已有父产品 ID: ${productId} (SKU: ${sku})`);
          } else {
            productId = generateUniqueId();
            console.log(`[行${rowNum}] 生成新父产品 ID: ${productId} (SKU: ${sku})`);
          }

          // 分类处理
          let categoryId = '__UNCATEGORIZED__';
          let seriesId = '';
          let productLineId = '';

          const categoryName = row['一级分类']?.trim();
          const seriesName = row['二级分类']?.trim() || '';

          if (categoryName) {
            const category = categories.find((c: any) => c.name === categoryName);
            if (category) {
              categoryId = category.id;
              if (seriesName) {
                const series = category.series?.find((s: any) => s.name === seriesName);
                if (series) seriesId = series.id;
                else console.warn(`行 ${rowNum}: 二级分类 "${seriesName}" 不存在，只关联一级分类`);
              }
              try {
                productLineId = await getProductLineIdFromCategory(locale, category.id);
              } catch (err) {
                console.warn(`行 ${rowNum}: 无法获取产品线ID，将留空`, err);
              }
            } else {
              console.warn(`行 ${rowNum}: 一级分类 "${categoryName}" 不存在，归类到未分类`);
            }
          } else {
            console.warn(`行 ${rowNum}: 未填写一级分类，归类到未分类`);
          }

          // 价格阶梯
          const priceTiers: PriceTier[] = [];
          for (let i = 1; i <= 3; i++) {
            const minQty = row[`最小起订量${i}`];
            const price = row[`单价${i}`];
            if (minQty && price) {
              const minQtyNum = Number(minQty);
              const priceNum = Number(price);
              if (isNaN(minQtyNum) || isNaN(priceNum)) throw new Error(`阶梯 ${i} 格式错误`);
              if (priceTiers.length > 0 && minQtyNum <= priceTiers[priceTiers.length - 1].min_qty) {
                throw new Error(`阶梯 ${i} 的最小起订量必须大于前一级`);
              }
              priceTiers.push({ min_qty: minQtyNum, max_qty: null, price: priceNum });
            } else if ((minQty && !price) || (!minQty && price)) {
              throw new Error(`阶梯 ${i} 必须同时提供最小起订量和单价`);
            }
          }
          if (priceTiers.length === 0) throw new Error('至少提供一个价格阶梯');
          for (let i = 0; i < priceTiers.length; i++) {
            if (i < priceTiers.length - 1) priceTiers[i].max_qty = priceTiers[i + 1].min_qty - 1;
            else priceTiers[i].max_qty = null;
          }

          const productName = row['产品名称']?.trim();
          if (!productName) throw new Error('产品名称不能为空');
          if (productName.length > 128) throw new Error('产品名称超过128字符');

          let brand = row['品牌']?.trim();
          if (!brand) brand = defaultSettings.default_brand || 'Neutral';

          let slug = row['Slug']?.trim();
          if (!slug) slug = generateSlug(productName);

          // 主图任务
          const mainImageUrlRaw = row['主图URL']?.trim();
          if (mainImageUrlRaw) imageTasks.push({ url: mainImageUrlRaw, productId, field: 'main_image_url' });

          // 附加图任务
          const additionalImagesRaw: string[] = [];
          for (let i = 1; i <= 8; i++) {
            const imgUrl = row[`附加图URL${i}`]?.trim();
            if (imgUrl) {
              additionalImagesRaw.push(imgUrl);
              imageTasks.push({ url: imgUrl, productId, field: 'additional_images', index: additionalImagesRaw.length - 1 });
            }
          }

          let description = row['详细描述'] || '';
          if (description && !description.includes('<')) {
            description = description.split(/\r?\n/).filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('');
          }

          const shortDescription = row['简短描述'] || '';
          const specText = row['规格说明'] || '';
          const seoTitleFromExcel = row['SEO标题'] || '';
          const seoDescriptionFromExcel = row['SEO描述'] || '';
          const seoKeywords = row['SEO关键词'] || '';

          const firstTier = priceTiers[0];
          const minOrderQuantity = firstTier.min_qty;
          const extractedPrice = firstTier.price;

          let seoTitle = seoTitleFromExcel;
          if (!seoTitle) {
            seoTitle = generateSeoTitle(
              productName, brand, minOrderQuantity, siteName,
              defaultSettings.auto_seo_title_template || ''
            );
          }
          let seoDescription = seoDescriptionFromExcel;
          if (!seoDescription) {
            seoDescription = generateSeoDescription(
              description, priceTiers, specText,
              defaultSettings.auto_seo_desc_template || '',
              defaultSettings.default_currency || 'USD'
            );
          }

          let mpn = row['MPN'] || '';
          if (!mpn && defaultSettings.default_mpn) mpn = processMpn(defaultSettings.default_mpn, sku);

          const product_type = await getProductType(locale, categoryId, seriesId);

          const productData = {
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
            spec_text: specText,
            availability: defaultSettings.default_availability || 'in_stock',
            min_order_quantity: minOrderQuantity,
            main_image_url: '',
            additional_images: [],
            description,
            short_description: shortDescription,
            attributes: {},
            product_type,
            google_product_category: 0,
            seo_title: seoTitle,
            seo_description: seoDescription,
            seo_keywords: seoKeywords,
            slug,
            shipping_cost: row['运费'] !== undefined ? Number(row['运费']) : (defaultSettings.default_shipping_cost ?? 0),
            return_policy_days: row['退货天数'] !== undefined ? Number(row['退货天数']) : (defaultSettings.default_return_days ?? 30),
            aggregate_rating: null,
            categoryId,
            seriesId: seriesId || '',
            parent_product_id: '',
            variants: [],
            templateId: 'default_product_published',
            productLineId,
          };

          parentProductsMap.set(productId, productData);
          currentParentProductId = productId;
          results.push({ row: rowNum, sku, success: true, productId });
        }
        else if (productType === 'variant') {
          if (!currentParentProductId) throw new Error('变体前面没有父产品，请确保变体行紧跟在父产品之后');
          const parentId = currentParentProductId;
          const parentData = parentProductsMap.get(parentId);
          if (!parentData) throw new Error(`父产品数据不存在: ${parentId}`);

          const variantName = row['产品名称']?.trim();
          if (!variantName) throw new Error('变体产品名称不能为空');
          if (variantName.length > 128) throw new Error('变体名称超过128字符');

          let variantSku = row['SKU']?.trim();
          if (!variantSku) variantSku = generateSkuFromRule(skuRule);
          else variantSku = variantSku.trim();

          let variantSlug = row['Slug']?.trim();
          if (!variantSlug) variantSlug = generateSlug(variantName);

          const variantId = generateUniqueId();
          console.log(`[行${rowNum}] 生成变体 ID: ${variantId}，关联父产品: ${parentId}`);

          const mainImageUrlRaw = row['主图URL']?.trim();
          if (mainImageUrlRaw) {
            imageTasks.push({ url: mainImageUrlRaw, productId: parentId, field: 'variant_main_image', variantId });
          }

          const variantData = {
            id: variantId,
            product_name: variantName,
            sku: variantSku,
            short_description: row['简短描述'] || '',
            main_image_url: '',
            additional_images: [],
            attributes: {},
            slug: variantSlug,
            seo_keywords: row['SEO关键词'] || '',
            seo_title: row['SEO标题'] || '',
            seo_description: row['SEO描述'] || '',
          };

          if (!parentData.variants) parentData.variants = [];
          parentData.variants.push(variantData);
          results.push({ row: rowNum, sku: variantSku, success: true, productId: variantId });
        }
      } catch (err: any) {
        console.error(`第 ${rowNum} 行处理失败:`, err);
        results.push({ row: rowNum, sku: row['SKU']?.trim() || '', success: false, error: err.message });
        if (rows[idx]['产品类型']?.trim() === 'parent') currentParentProductId = null;
      }
    }

    // 并发下载图片（使用公共函数）
    console.log(`开始下载 ${imageTasks.length} 个图片...`);
    const downloadStart = Date.now();
    const downloadResults = await Promise.all(
      imageTasks.map(async (task) => {
        try {
          // 调用公共函数，获取相对路径（storage_key）
          const relativePath = await downloadAndSaveImage(task.url, {
            referenceType: 'product',
            referenceId: task.productId,
            cache: imageCache,
          });
          // 转换为完整 URL（保持与原数据结构兼容）
          const storage = getPublicStorage();
          const fullUrl = storage.getPublicUrl(relativePath);
          return { task, finalUrl: fullUrl };
        } catch (err) {
          console.error(`下载图片失败: ${task.url}`, err);
          return { task, finalUrl: task.url };
        }
      })
    );
    console.log(`图片下载完成，耗时 ${Date.now() - downloadStart}ms`);

    // 回填图片到内存数据
    for (const { task, finalUrl } of downloadResults) {
      const productData = parentProductsMap.get(task.productId);
      if (!productData) continue;
      if (task.field === 'main_image_url') {
        productData.main_image_url = finalUrl;
      } else if (task.field === 'additional_images') {
        if (!productData.additional_images) productData.additional_images = [];
        productData.additional_images[task.index!] = finalUrl;
      } else if (task.field === 'variant_main_image' && task.variantId) {
        const variant = productData.variants?.find((v: any) => v.id === task.variantId);
        if (variant) variant.main_image_url = finalUrl;
      }
    }

    // 保存父产品到数据库索引和 MD 文件
    const saveStart = Date.now();
    for (const [productId, productData] of parentProductsMap.entries()) {
      // 再次确认数据库中是否存在相同 SKU 但不同 ID 的父产品（防止并发冲突）
      const { data: existingSameSku, error: checkError } = await supabase
        .from('products')
        .select('productId')
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('locale', locale)
        .eq('sku', productData.sku)
        .is('parent_product_id', null)
        .maybeSingle();

      if (checkError) {
        console.error(`保存前检查 SKU ${productData.sku} 失败:`, checkError);
      } else if (existingSameSku && existingSameSku.productId !== productId) {
        console.warn(`⚠️ SKU ${productData.sku} 已存在于父产品 ${existingSameSku.productId}，但当前准备写入的 ID 为 ${productId}。将复用已有 ID 并覆盖当前数据。`);
        parentProductsMap.delete(productId);
        productData.id = existingSameSku.productId;
        parentProductsMap.set(existingSameSku.productId, productData);
        console.log(`已将父产品 ID 从 ${productId} 更正为 ${existingSameSku.productId}`);
      }

      const indexData = {
        productId: productData.id,
        locale,
        productLineId: productData.productLineId || '',
        categoryId: productData.categoryId,
        seriesId: productData.seriesId,
        parent_product_id: null,
        sku: productData.sku,
        product_name: productData.product_name,
        brand: productData.brand,
        price_tiers: productData.price_tiers,
        currency: productData.currency,
        availability: productData.availability,
        min_order_quantity: productData.min_order_quantity,
        main_image_url: productData.main_image_url || '',
        attributes: productData.attributes,
        slug: productData.slug,
        status: 'published',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        templateId: productData.templateId,
      };
      await upsertProductIndex(indexData);
      await writeProduct(locale, productData.id, productData, '');
    }

    // ========== 保存变体到 products 表和索引表 ==========
    for (const [parentId, parentData] of parentProductsMap.entries()) {
      const variants = parentData.variants || [];
      for (const variant of variants) {
        const variantId = variant.id;
        const variantSku = variant.sku;
        
        // 检查 SKU 是否已被其他产品（父产品或变体）占用
        const { data: existingSku, error: skuCheckErr } = await supabase
          .from('products')
          .select('productId')
          .eq('site_id', DEFAULT_SITE_ID)
          .eq('locale', locale)
          .eq('sku', variantSku)
          .maybeSingle();

        if (skuCheckErr) {
          console.error(`检查变体 SKU 失败: ${variantSku}`, skuCheckErr);
          continue;
        }
        if (existingSku && existingSku.productId !== variantId) {
          console.error(`变体 SKU 冲突: ${variantSku} (已存在产品 ${existingSku.productId})，跳过保存`);
          continue;
        }

        // 继承父产品的必要字段
        const variantRecord = {
          productId: variantId,
          site_id: DEFAULT_SITE_ID,
          locale,
          sku: variantSku,
          product_name: variant.product_name,
          parent_product_id: parentId,
          brand: parentData.brand,
          currency: parentData.currency,
          availability: parentData.availability,
          min_order_quantity: parentData.min_order_quantity,
          price_tiers: JSON.stringify(parentData.price_tiers),
          main_image_url: variant.main_image_url || '',
          slug: variant.slug,
          status: 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          productLineId: parentData.productLineId || '',
          categoryId: parentData.categoryId,
          seriesId: parentData.seriesId,
          templateId: parentData.templateId,
        };

        // 检查变体是否已存在（基于 productId）
        const { data: existingVariant, error: findErr } = await supabase
          .from('products')
          .select('productId')
          .eq('productId', variantId)
          .maybeSingle();

        if (findErr) {
          console.error(`查询变体是否存在失败: ${variantId}`, findErr);
          continue;
        }

        if (existingVariant) {
          // 更新现有变体
          const { error: updateErr } = await supabase
            .from('products')
            .update(variantRecord)
            .eq('productId', variantId);
          if (updateErr) {
            console.error(`更新变体 ${variantId} 到 products 表失败:`, updateErr);
            continue;
          }
        } else {
          // 插入新变体
          const { error: insertErr } = await supabase
            .from('products')
            .insert(variantRecord);
          if (insertErr) {
            console.error(`插入变体 ${variantId} 到 products 表失败:`, insertErr);
            continue;
          }
        }

        // 写入索引表
        await upsertProductIndex({
          productId: variantId,
          locale,
          productLineId: parentData.productLineId || '',
          categoryId: parentData.categoryId,
          seriesId: parentData.seriesId,
          parent_product_id: parentId,
          sku: variantSku,
          product_name: variant.product_name,
          brand: parentData.brand,
          price_tiers: parentData.price_tiers,
          currency: parentData.currency,
          availability: parentData.availability,
          min_order_quantity: parentData.min_order_quantity,
          main_image_url: variant.main_image_url || '',
          attributes: variant.attributes || {},
          slug: variant.slug,
          status: 'published',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          templateId: parentData.templateId,
        });
      }
    }

    console.log(`保存完成，耗时 ${Date.now() - saveStart}ms`);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const errors = results.filter(r => !r.success).map(r => `第${r.row}行: ${r.error}`);
    const message = failCount === 0
      ? `成功导入 ${successCount} 个产品`
      : `成功 ${successCount} 个，失败 ${failCount} 个。${errors.slice(0, 3).join('；')}${errors.length > 3 ? `等${errors.length}条错误` : ''}`;

    console.log(`总耗时 ${Date.now() - startTime}ms`);
    return NextResponse.json({
      success: true,
      message,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (err: any) {
    console.error('导入整体失败:', err);
    return NextResponse.json({ error: '导入处理失败: ' + err.message, success: false }, { status: 500 });
  }
}