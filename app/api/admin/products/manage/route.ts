import { NextRequest, NextResponse } from 'next/server';
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
} from '@/lib/products/indexDb';
import { getProductSettings } from '@/lib/products/productSettings';
import { generateSlug, generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

// ==================== 辅助函数 ====================
async function getSiteSettings() {
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  try {
    const data = await fs.promises.readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { site_name: '我的网站' };
  }
}

function getPriceRange(tiers: any[], currency: string): string {
  if (!tiers || tiers.length === 0) return '-';
  const validPrices = tiers.map(t => t.price).filter(p => typeof p === 'number' && !isNaN(p));
  if (validPrices.length === 0) return '-';
  const min = Math.min(...validPrices);
  const max = Math.max(...validPrices);
  if (min === max) return `${min} ${currency}`;
  return `${min} - ${max} ${currency}`;
}

function getProductType(locale: string, categoryId: string, seriesId?: string): string {
  if (categoryId === '__UNCATEGORIZED__') return '';
  const categoriesPath = path.join(process.cwd(), 'data', 'products', locale, 'categories.json');
  try {
    const data = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
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

async function getAllProductIds(locale: string): Promise<string[]> {
  const db = getDb();
  const rows = db.prepare(`SELECT productId FROM products WHERE locale = ?`).all(locale) as any[];
  return rows.map(row => row.productId);
}

async function updateParentVariants(locale: string, parentId: string, variants: any[]) {
  const parentMd = await readProduct(locale, parentId);
  if (!parentMd) throw new Error('父产品不存在');
  const updated = { ...parentMd, variants };
  await writeProduct(locale, parentId, updated, parentMd.content || '');
}

// 根据基本设置中的规则生成 SKU
function generateSkuFromRule(rule: string): string {
  // 生成8位随机数字（范围 10000000 到 99999999）
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return rule.replace(/\{timestamp\}/g, randomNum.toString());
}

// ==================== GET ====================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const status = searchParams.get('status') || 'all';
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const seriesId = searchParams.get('seriesId') || '';
    const parentId = searchParams.get('parentId');
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const size = Math.min(parseInt(searchParams.get('size') || '20', 10), 100);
    const uncategorized = searchParams.get('uncategorized') === 'true';

    if (uncategorized) {
      const db = getDb();
      let sql = `SELECT * FROM products WHERE locale = ? AND categoryId = '__UNCATEGORIZED__' AND (parent_product_id IS NULL OR parent_product_id = '')`;
      const params: any[] = [locale];
      if (status !== 'all') {
        sql += ` AND status = ?`;
        params.push(status);
      }
      if (keyword) {
        sql += ` AND (product_name LIKE ? OR sku LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
      const totalRow = db.prepare(countSql).get(params) as any;
      const total = totalRow?.total || 0;
      sql += ` ORDER BY updatedAt DESC LIMIT ? OFFSET ?`;
      params.push(size, (page - 1) * size);
      const items = db.prepare(sql).all(params) as any[];
      const statusCount = getProductStatusCount(locale);
      return NextResponse.json({ items, total, statusCount, page, size });
    }

    const searchAll = searchParams.get('searchAll') === 'true';
    if (searchAll) {
      const { items, total } = searchAllProducts(locale, keyword, categoryId, seriesId, page, size);
      const statusCount = getProductStatusCount(locale);
      return NextResponse.json({ items, total, statusCount, page, size });
    }

    if (productId) {
      const index = getProductIndex(productId);
      if (index?.parent_product_id) {
        const parentMd = await readProduct(locale, index.parent_product_id);
        const variant = parentMd?.variants?.find((v: any) => v.id === productId);
        return NextResponse.json(variant || {});
      } else {
        const product = await readProduct(locale, productId);
        return NextResponse.json(product || {});
      }
    }

    if (parentId) {
      const children = getChildrenProducts(parentId);
      return NextResponse.json(children);
    }

    const statusCount = getProductStatusCount(locale);
    const { items, total } = searchProducts(
      locale,
      status === 'all' ? undefined : status,
      keyword,
      categoryId || undefined,
      seriesId || undefined,
      page,
      size
    );
    return NextResponse.json({ items, total, statusCount, page, size });
  } catch (error) {
    console.error('GET /products/manage error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// ==================== POST ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = body.locale || 'zh';
    const isVariant = !!body.parent_product_id;

    // 加载系统设置，用于获取 SKU 生成规则
    const productSettings = await getProductSettings(locale);
    const defaultSettings = productSettings.defaultSettings || {};
    const skuRule = defaultSettings.sku_rule || 'P-{timestamp}';

    if (isVariant) {
      const parentId = body.parent_product_id;
      const parentMd = await readProduct(locale, parentId);
      if (!parentMd) return NextResponse.json({ error: '父产品不存在' }, { status: 404 });

      const existingIds = await getAllProductIds(locale);
      const variantId = await generateUniqueProductId(async () => existingIds);

      // 处理 SKU：若前端未传则根据规则生成
      let sku = body.sku?.trim();
      if (!sku) {
        sku = generateSkuFromRule(skuRule);
      }

      const variant = {
        id: variantId,
        product_name: body.product_name,
        sku: sku,
        short_description: body.short_description || '',
        main_image_url: body.main_image_url || '',
        additional_images: body.additional_images || [],
        attributes: body.attributes || {},
        slug: body.slug || generateSlug(body.product_name),
        seo_keywords: body.seo_keywords || '',
        seo_title: body.seo_title || '',
        seo_description: body.seo_description || '',
      };

      const variants = parentMd.variants || [];
      variants.push(variant);
      await updateParentVariants(locale, parentId, variants);

      const now = new Date().toISOString();
      upsertProductIndex({
        productId: variantId,
        locale,
        productLineId: parentMd.productLineId,
        categoryId: parentMd.categoryId,
        seriesId: parentMd.seriesId || null,
        parent_product_id: parentId,
        sku: sku,
        product_name: body.product_name,
        brand: parentMd.brand,
        price_tiers: [],
        currency: parentMd.currency,
        availability: 'in_stock',
        min_order_quantity: 1,
        main_image_url: body.main_image_url || '',
        attributes: body.attributes || {},
        slug: variant.slug,
        status: 'published',
        updatedAt: now,
        createdAt: now,
      });

      return NextResponse.json({ ...variant, productId: variantId }, { status: 201 });
    }

    // 普通产品创建
    const categoryId = body.categoryId;
    if (!categoryId) return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    const seriesId = body.seriesId;

    let productLineId = body.productLineId || getProductLineIdFromCategory(locale, categoryId);
    if (!productLineId) return NextResponse.json({ error: '无法确定产品线' }, { status: 400 });

    const siteSettings = await getSiteSettings();

    const existingIds = await getAllProductIds(locale);
    const productId = await generateUniqueProductId(async () => existingIds);

    // 处理 SKU：若前端未传则根据规则生成
    let sku = body.sku?.trim();
    if (!sku) {
      sku = generateSkuFromRule(skuRule);
    }

    let slug = body.slug;
    if (!slug) slug = generateSlug(body.product_name);

    const firstTier = (body.price_tiers && body.price_tiers[0]) || { min_qty: 1, price: 0 };
    const minOrderQuantity = firstTier.min_qty;
    const extractedPrice = firstTier.price;

    const defaultBrand = defaultSettings.default_brand || '';
    const brand = body.brand || defaultBrand;

    const seoTitle = body.seo_title || generateSeoTitle(
      body.product_name,
      brand,
      minOrderQuantity,
      siteSettings.site_name || '我的网站',
      defaultSettings.auto_seo_title_template || ''
    );
    const seoDescription = body.seo_description || generateSeoDescription(
      body.description,
      body.price_tiers,
      body.spec_text,
      defaultSettings.auto_seo_desc_template || '',
      body.currency || defaultSettings.default_currency || 'USD'
    );

    let mpn = body.mpn || '';
    if (!mpn && defaultSettings.default_mpn) {
      mpn = processMpn(defaultSettings.default_mpn, sku);
    }

    const product_type = getProductType(locale, categoryId, seriesId);

    const frontMatter = {
      id: productId,
      product_name: body.product_name,
      brand: brand || 'Neutral',
      sku,
      mpn,
      gtin: '',
      price_tiers: body.price_tiers,
      currency: body.currency || defaultSettings.default_currency || 'USD',
      identifier_exists: false,
      price: extractedPrice,
      spec_text: body.spec_text || '',
      availability: body.availability || defaultSettings.default_availability || 'in_stock',
      min_order_quantity: minOrderQuantity,
      main_image_url: body.main_image_url,
      additional_images: body.additional_images || [],
      description: body.description || '',
      short_description: body.short_description || '',
      attributes: body.attributes || {},
      product_type,
      google_product_category: body.google_product_category || 0,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: body.seo_keywords || '',
      slug,
      shipping_cost: body.shipping_cost !== undefined ? body.shipping_cost : (defaultSettings.default_shipping_cost ?? 0),
      return_policy_days: body.return_policy_days !== undefined ? body.return_policy_days : (defaultSettings.default_return_days ?? 30),
      aggregate_rating: null,
      categoryId,
      seriesId: seriesId || '',
      parent_product_id: body.parent_product_id || '',
      variants: body.variants || [],
      templateId: body.templateId || '',
    };

    await writeProduct(locale, productId, frontMatter, body.content || '');

    const now = new Date().toISOString();
    upsertProductIndex({
      productId,
      locale,
      productLineId,
      categoryId,
      seriesId: seriesId || null,
      parent_product_id: body.parent_product_id || null,
      sku,
      product_name: body.product_name,
      brand,
      price_tiers: body.price_tiers,
      currency: body.currency || defaultSettings.default_currency || 'USD',
      availability: body.availability || defaultSettings.default_availability || 'in_stock',
      min_order_quantity: minOrderQuantity,
      main_image_url: body.main_image_url || '',
      attributes: body.attributes || {},
      slug,
      status: body.status || 'published',
      updatedAt: now,
      createdAt: now,
    });

    return NextResponse.json({ ...frontMatter, productId, content: body.content }, { status: 201 });
  } catch (error) {
    console.error('POST /products/manage error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// ==================== PUT ====================
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    const body = await request.json();
    const locale = body.locale || 'zh';

    const existingIndex = getProductIndex(productId);
    const isVariant = existingIndex?.parent_product_id && existingIndex.parent_product_id !== '';

    // 加载系统设置，用于获取 SKU 生成规则（仅在需要生成新 SKU 时使用）
    const productSettings = await getProductSettings(locale);
    const defaultSettings = productSettings.defaultSettings || {};
    const skuRule = defaultSettings.sku_rule || 'P-{timestamp}';

    if (isVariant) {
      const parentId = existingIndex!.parent_product_id;
      const parentMd = await readProduct(locale, parentId);
      if (!parentMd) return NextResponse.json({ error: '父产品不存在' }, { status: 404 });

      const variants = parentMd.variants || [];
      const variantIndex = variants.findIndex((v: any) => v.id === productId);
      if (variantIndex === -1) return NextResponse.json({ error: '变体不存在' }, { status: 404 });

      // 处理 SKU：若前端传了非空新值则使用，否则保留原 SKU（若原 SKU 为空则根据规则生成）
      let sku = body.sku?.trim();
      if (!sku) {
        if (!variants[variantIndex].sku) {
          sku = generateSkuFromRule(skuRule);
        } else {
          sku = variants[variantIndex].sku;
        }
      }

      const updatedVariant = {
        ...variants[variantIndex],
        product_name: body.product_name,
        sku: sku,
        short_description: body.short_description || '',
        main_image_url: body.main_image_url || '',
        additional_images: body.additional_images || [],
        attributes: body.attributes || {},
        slug: body.slug || generateSlug(body.product_name),
        seo_keywords: body.seo_keywords || '',
        seo_title: body.seo_title || '',
        seo_description: body.seo_description || '',
      };
      variants[variantIndex] = updatedVariant;
      await updateParentVariants(locale, parentId, variants);

      const now = new Date().toISOString();
      upsertProductIndex({
        ...existingIndex!,
        sku: sku,
        product_name: body.product_name,
        main_image_url: body.main_image_url || '',
        attributes: body.attributes || {},
        slug: updatedVariant.slug,
        updatedAt: now,
      });

      return NextResponse.json({ ...updatedVariant, productId });
    }

    // 普通产品更新
    const categoryId = body.categoryId;
    const seriesId = body.seriesId;
    if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 });

    let productLineId = body.productLineId || getProductLineIdFromCategory(locale, categoryId);
    if (!productLineId) return NextResponse.json({ error: '无法确定产品线' }, { status: 400 });

    const existingMd = await readProduct(locale, productId);
    if (!existingMd) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const siteSettings = await getSiteSettings();

    const final = {
      ...existingMd,
      ...body,
      variants: body.variants !== undefined ? body.variants : (existingMd.variants || []),
      updatedAt: new Date().toISOString(),
    };

    // 处理 SKU：若前端未传或为空，则保留原有 SKU（如果原有也为空则根据规则生成）
    let sku = body.sku?.trim();
    if (!sku) {
      if (!final.sku) {
        sku = generateSkuFromRule(skuRule);
      } else {
        sku = final.sku;
      }
    }
    final.sku = sku;

    const product_type = getProductType(locale, categoryId, seriesId);

    const firstTier = (final.price_tiers && final.price_tiers[0]) || { min_qty: 1, price: 0 };
    const extractedMinOrderQty = firstTier.min_qty;
    const extractedPrice = firstTier.price;

    let mpn = final.mpn || '';
    if (!mpn && defaultSettings.default_mpn) {
      mpn = processMpn(defaultSettings.default_mpn, sku);
    }

    const defaultBrand = defaultSettings.default_brand || '';
    const brand = final.brand || defaultBrand;

    if (!body.seo_title) {
      final.seo_title = generateSeoTitle(
        final.product_name,
        brand,
        extractedMinOrderQty,
        siteSettings.site_name || '我的网站',
        defaultSettings.auto_seo_title_template || ''
      );
    }
    if (!body.seo_description) {
      final.seo_description = generateSeoDescription(
        final.description,
        final.price_tiers,
        final.spec_text,
        defaultSettings.auto_seo_desc_template || '',
        final.currency || defaultSettings.default_currency || 'USD'
      );
    }
    if (!body.slug && !final.slug) final.slug = generateSlug(final.product_name);

    final.mpn = mpn;
    final.product_type = product_type;
    final.min_order_quantity = extractedMinOrderQty;
    final.price = extractedPrice;
    final.identifier_exists = false;

    const orderedFinal: any = {
      id: productId,
      product_name: final.product_name,
      brand: final.brand,
      sku: final.sku,
      mpn: final.mpn,
      gtin: final.gtin,
      price_tiers: final.price_tiers,
      currency: final.currency,
      identifier_exists: final.identifier_exists,
      price: final.price,
      spec_text: final.spec_text,
      availability: final.availability,
      min_order_quantity: final.min_order_quantity,
      main_image_url: final.main_image_url,
      additional_images: final.additional_images,
      description: final.description,
      short_description: final.short_description,
      attributes: final.attributes,
      product_type: final.product_type,
      google_product_category: final.google_product_category,
      seo_title: final.seo_title,
      seo_description: final.seo_description,
      seo_keywords: final.seo_keywords,
      slug: final.slug,
      shipping_cost: final.shipping_cost,
      return_policy_days: final.return_policy_days,
      aggregate_rating: final.aggregate_rating,
      categoryId: final.categoryId,
      seriesId: final.seriesId,
      parent_product_id: final.parent_product_id,
      variants: final.variants,
      templateId: body.templateId !== undefined ? body.templateId : existingMd.templateId || '',
    };

    await writeProduct(locale, productId, orderedFinal, body.content || existingMd.content || '');

    const now = new Date().toISOString();
    upsertProductIndex({
      productId,
      locale,
      productLineId,
      categoryId,
      seriesId: seriesId || null,
      parent_product_id: final.parent_product_id || null,
      sku: final.sku,
      product_name: final.product_name,
      brand: final.brand,
      price_tiers: final.price_tiers,
      currency: final.currency,
      availability: final.availability,
      min_order_quantity: extractedMinOrderQty,
      main_image_url: final.main_image_url || '',
      attributes: final.attributes || {},
      slug: final.slug,
      status: body.status || existingIndex?.status || 'published',
      updatedAt: now,
      createdAt: existingIndex?.createdAt || now,
    });

    return NextResponse.json({ ...final, productId });
  } catch (error) {
    console.error('PUT /products/manage error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const locale = searchParams.get('locale') || 'zh';
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
    
    const filePath = path.join(process.cwd(), 'data', 'products', locale, 'products', `${productId}.md`);
    let fileDeleted = false;
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        fileDeleted = true;
        console.log(`已删除产品文件: ${filePath}`);
      } else {
        console.warn(`产品文件不存在: ${filePath}`);
      }
    } catch (err: any) {
      console.error(`删除产品文件失败: ${filePath}`, err);
    }

    try {
      await deleteProduct(locale, productId);
    } catch (err: any) {
      console.warn(`deleteProduct 调用失败（可忽略）: ${err.message}`);
    }
    
    try {
      deleteProductIndex(productId);
    } catch (err: any) {
      console.error(`删除产品索引失败: ${productId}`, err);
      return NextResponse.json({ error: `删除索引失败: ${err.message}` }, { status: 500 });
    }
    
    try {
      const db = getDb();
      db.prepare(`DELETE FROM resource_product WHERE product_id = ?`).run(productId);
    } catch (err: any) {
      console.error(`删除产品关联资源失败: ${productId}`, err);
    }
    
    return NextResponse.json({ success: true, fileDeleted });
  } catch (error) {
    console.error('DELETE /products/manage error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '删除失败' }, { status: 500 });
  }
}