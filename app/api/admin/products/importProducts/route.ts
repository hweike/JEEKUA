import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { getProductSettings } from '@/lib/products/productSettings';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';
import { getProductLineIdFromCategory, getProductIndex, upsertProductIndex } from '@/lib/products/indexDb';
import { writeProduct, readProduct } from '@/lib/products/mdParser';
import { generateSlug, generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { downloadImage, ensureDir } from '@/lib/imageUtils';
import { getDb } from '@/lib/db';

interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

async function getSiteName(): Promise<string> {
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    return settings.site_name || '我的网站';
  } catch {
    return '我的网站';
  }
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

function getProductType(locale: string, categoryId: string, seriesId?: string): string {
  if (!categoryId || categoryId === '__UNCATEGORIZED__') return '';
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

// 根据基本设置中的规则生成 SKU（与 manage 路由保持一致）
function generateSkuFromRule(rule: string): string {
  // 生成8位随机数字（范围 10000000 到 99999999）
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return rule.replace(/\{timestamp\}/g, randomNum.toString());
}

export async function POST(req: NextRequest) {
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

    const productSettings = await getProductSettings(locale);
    const defaultSettings = productSettings.defaultSettings || {};
    const siteName = await getSiteName();
    const skuRule = defaultSettings.sku_rule || 'P-{timestamp}';  // 获取规则

    const categoriesPath = path.join(process.cwd(), 'data', 'products', locale, 'categories.json');
    let categoriesData;
    try {
      const data = await fs.readFile(categoriesPath, 'utf-8');
      categoriesData = JSON.parse(data);
    } catch {
      return NextResponse.json({ error: '无法加载分类数据' }, { status: 500 });
    }
    const categories = categoriesData.categories || [];

    const results: { row: number; sku: string; success: boolean; error?: string }[] = [];
    let parentProductId: string | null = null;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2;
      try {
        const productType = row['产品类型']?.trim();
        if (productType !== 'parent' && productType !== 'variant') {
          throw new Error('产品类型必须是 parent 或 variant');
        }

        if (productType === 'parent') {
          // ---------- 父产品创建 ----------
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
                if (series) {
                  seriesId = series.id;
                } else {
                  console.warn(`行 ${rowNum}: 二级分类 "${seriesName}" 不存在于一级分类 "${categoryName}"，已忽略`);
                }
              }
              try {
                productLineId = getProductLineIdFromCategory(locale, category.id);
              } catch (err) {
                console.warn(`行 ${rowNum}: 无法获取产品线ID，将留空`, err);
              }
            } else {
              console.warn(`行 ${rowNum}: 一级分类 "${categoryName}" 不存在，产品将归类到"未分类"`);
            }
          } else {
            console.warn(`行 ${rowNum}: 未填写一级分类，产品将归类到"未分类"`);
          }

          // 价格阶梯
          const priceTiers: PriceTier[] = [];
          for (let i = 1; i <= 3; i++) {
            const minQty = row[`最小起订量${i}`];
            const price = row[`单价${i}`];
            if (minQty && price) {
              const minQtyNum = Number(minQty);
              const priceNum = Number(price);
              if (isNaN(minQtyNum) || isNaN(priceNum)) {
                throw new Error(`阶梯 ${i} 的价格或数量格式错误`);
              }
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
            if (i < priceTiers.length - 1) {
              priceTiers[i].max_qty = priceTiers[i + 1].min_qty - 1;
            } else {
              priceTiers[i].max_qty = null;
            }
          }

          // 生成产品ID
          const existingIds = await getAllProductIds(locale);
          const productId = await generateUniqueProductId(() => existingIds);

          // SKU：若未填则根据规则生成
          let sku = row['SKU']?.trim();
          if (!sku) {
            sku = generateSkuFromRule(skuRule);
          }

          const productName = row['产品名称']?.trim();
          if (!productName) throw new Error('产品名称不能为空');
          if (productName.length > 128) throw new Error('产品名称不能超过128字符');

          let brand = row['品牌']?.trim();
          if (!brand) brand = defaultSettings.default_brand || 'Neutral';

          let slug = row['Slug']?.trim();
          if (!slug) slug = generateSlug(productName);

          const mainImageUrl = await downloadImage(row['主图URL']);
          const additionalImages: string[] = [];
          for (let i = 1; i <= 8; i++) {
            const imgUrl = row[`附加图URL${i}`];
            if (imgUrl) {
              const localUrl = await downloadImage(imgUrl);
              if (localUrl) additionalImages.push(localUrl);
            }
          }

          let description = row['详细描述'] || '';
          if (description && !description.includes('<')) {
            description = description
              .split(/\r?\n/)
              .filter(p => p.trim())
              .map(p => `<p>${p.trim()}</p>`)
              .join('');
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
              productName,
              brand,
              minOrderQuantity,
              siteName,
              defaultSettings.auto_seo_title_template || ''
            );
          }

          let seoDescription = seoDescriptionFromExcel;
          if (!seoDescription) {
            seoDescription = generateSeoDescription(
              description,
              priceTiers,
              specText,
              defaultSettings.auto_seo_desc_template || '',
              defaultSettings.default_currency || 'USD'
            );
          }

          let mpn = row['MPN'] || '';
          if (!mpn && defaultSettings.default_mpn) {
            mpn = processMpn(defaultSettings.default_mpn, sku);
          }

          const product_type = getProductType(locale, categoryId, seriesId);

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
            main_image_url: mainImageUrl,
            additional_images: additionalImages,
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
            seriesId,
            parent_product_id: '',
            variants: [],
            templateId: 'default_product_published',
          };

          await writeProduct(locale, productId, productData, '');

          const now = new Date().toISOString();
          upsertProductIndex({
            productId,
            locale,
            productLineId: productLineId || null,
            categoryId,
            seriesId: seriesId || null,
            parent_product_id: null,
            sku,
            product_name: productName,
            brand,
            price_tiers: priceTiers,
            currency: defaultSettings.default_currency || 'USD',
            availability: defaultSettings.default_availability || 'in_stock',
            min_order_quantity: minOrderQuantity,
            main_image_url: mainImageUrl || '',
            attributes: {},
            slug,
            status: 'published',
            updatedAt: now,
            createdAt: now,
          });

          parentProductId = productId;
          results.push({ row: rowNum, sku, success: true });
        } 
        else if (productType === 'variant') {
          // ---------- 变体创建 ----------
          if (!parentProductId) {
            throw new Error('变体前面没有父产品，请确保变体行紧跟在父产品之后');
          }

          const parentProduct = await readProduct(locale, parentProductId);
          if (!parentProduct) throw new Error('父产品不存在');

          let sku = row['SKU']?.trim();
          if (!sku) {
            // 变体也使用相同的规则生成 SKU
            sku = generateSkuFromRule(skuRule);
          }

          const productName = row['产品名称']?.trim();
          if (!productName) throw new Error('变体产品名称不能为空');
          if (productName.length > 128) throw new Error('变体产品名称不能超过128字符');

          let slug = row['Slug']?.trim();
          if (!slug) slug = generateSlug(productName);

          const mainImageUrl = await downloadImage(row['主图URL']);

          const variantId = `variant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          const variantData = {
            id: variantId,
            product_name: productName,
            sku,
            short_description: row['简短描述'] || '',
            main_image_url: mainImageUrl,
            additional_images: [],
            attributes: {},
            slug,
            seo_keywords: row['SEO关键词'] || '',
            seo_title: row['SEO标题'] || '',
            seo_description: row['SEO描述'] || '',
          };

          const variants = parentProduct.variants || [];
          variants.push(variantData);
          await updateParentVariants(locale, parentProductId, variants);

          const parentIndex = getProductIndex(parentProductId);
          if (!parentIndex) throw new Error('父产品索引不存在');

          const now = new Date().toISOString();
          upsertProductIndex({
            productId: variantId,
            locale,
            productLineId: parentIndex.productLineId,
            categoryId: parentIndex.categoryId,
            seriesId: parentIndex.seriesId,
            parent_product_id: parentProductId,
            sku,
            product_name: productName,
            brand: parentIndex.brand,
            price_tiers: [],
            currency: parentIndex.currency,
            availability: parentIndex.availability,
            min_order_quantity: parentIndex.min_order_quantity,
            main_image_url: mainImageUrl || '',
            attributes: {},
            slug,
            status: 'published',
            updatedAt: now,
            createdAt: now,
          });

          const updatedVariants = variants.map((v: any) => ({
            sku: v.sku,
            name: v.product_name,
            mainImage: v.main_image_url,
          }));
          upsertProductIndex({
            ...parentIndex,
            variants: updatedVariants,
            updatedAt: now,
          });

          results.push({ row: rowNum, sku, success: true });
        }
      } catch (err: any) {
        results.push({ row: rowNum, sku: '', success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const message = failCount === 0
      ? `成功导入 ${successCount} 个产品`
      : `成功 ${successCount} 个，失败 ${failCount} 个，请查看详情`;
    return NextResponse.json({ message, results });
  } catch (err: any) {
    console.error('导入失败', err);
    return NextResponse.json({ error: '导入处理失败: ' + err.message }, { status: 500 });
  }
}