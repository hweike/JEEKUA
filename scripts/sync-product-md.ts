// scripts/sync-product-md.ts 
// 对于每个父产品，脚本会：
// 更新父产品自身字段：
// product_name（从数据库）
// price_tiers（从数据库的 JSON 解析）
// price（取第一个阶梯的 price）
// min_order_quantity（取第一个阶梯的 min_qty）
// 更新所有子产品（变体）的 product_name：
// 遍历 MD 文件中的 variants 数组，如果 variant.id 在数据库中有对应的子产品记录，则将其 product_name 替换为数据库中的值。
// 写回 MD 文件（仅当有实际变更时）。

// scripts/sync-product-md.ts
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { readProduct, writeProduct } from '@/lib/products/mdParser';

// 解析命令行参数
const args = process.argv.slice(2);
const params: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1];
    if (value && !value.startsWith('--')) {
      params[key] = value;
      i++;
    } else {
      params[key] = 'true';
    }
  }
}

const SITE_ID = params['site-id'] || '000001';
const LOCALE = params['locale'] || 'zh';
const TEST_PRODUCT_ID = params['test'] || params['product-id'] || '';
const IGNORE_SITE = params['no-site-id'] === 'true' || params['site-id'] === 'all';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
process.env.R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || 'feisman-power-private';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

console.log('📌 配置:');
console.log(`  - site_id: ${IGNORE_SITE ? 'ALL (忽略)' : SITE_ID}`);
console.log(`  - locale: ${LOCALE}`);
console.log(`  - test product: ${TEST_PRODUCT_ID || '无 (处理所有)'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 凭证，请检查 .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parsePriceTiers(priceTiersStr: string | null): any[] {
  if (!priceTiersStr) return [{ min_qty: 1, max_qty: null, price: 0 }];
  try {
    const tiers = JSON.parse(priceTiersStr);
    return Array.isArray(tiers) && tiers.length > 0 ? tiers : [{ min_qty: 1, max_qty: null, price: 0 }];
  } catch {
    return [{ min_qty: 1, max_qty: null, price: 0 }];
  }
}

/**
 * 分页查询所有产品记录
 */
async function fetchAllProducts(): Promise<any[]> {
  const allProducts: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select('*')
      .range(from, to);

    if (!IGNORE_SITE) {
      query = query.eq('site_id', SITE_ID);
    }

    if (TEST_PRODUCT_ID) {
      // 测试模式：如果指定了测试ID，只查询该父产品及其子产品
      query = supabase
        .from('products')
        .select('*')
        .or(`productId.eq.${TEST_PRODUCT_ID},parent_product_id.eq.${TEST_PRODUCT_ID}`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allProducts.push(...data);
      page++;
      // 如果返回数量小于 pageSize，说明已到末尾
      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  return allProducts;
}

async function syncProductMd() {
  console.log(TEST_PRODUCT_ID ? `🧪 测试模式：仅处理父产品ID = ${TEST_PRODUCT_ID}` : '🚀 处理所有产品');

  let products: any[];
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.error('❌ 查询产品失败:', error);
    process.exit(1);
  }

  console.log(`📦 共获取 ${products.length} 条产品记录`);

  // 分组 - 判断父产品
  const parentMap = new Map<string, any>();
  const childMap = new Map<string, any[]>();
  for (const p of products) {
    // 判断是否为父产品：parent_product_id 为 null、空字符串或 'null'
    const isParent = p.parent_product_id === null || p.parent_product_id === '' || p.parent_product_id === 'null';
    if (isParent) {
      parentMap.set(p.productId, p);
    } else {
      const parentId = p.parent_product_id;
      if (parentId && parentId !== 'null') {
        if (!childMap.has(parentId)) {
          childMap.set(parentId, []);
        }
        childMap.get(parentId)!.push(p);
      }
    }
  }

  console.log(`👨‍👩‍👧‍👦 父产品 ${parentMap.size} 个，子产品 ${products.length - parentMap.size} 个`);

  if (TEST_PRODUCT_ID && !parentMap.has(TEST_PRODUCT_ID)) {
    console.error(`❌ 未找到父产品 ID: ${TEST_PRODUCT_ID}`);
    process.exit(1);
  }

  // 如果希望强制处理指定数量，可在此处设置
  const expectedParentCount = parseInt(params['expected-count'] || '0');
  if (expectedParentCount > 0 && parentMap.size !== expectedParentCount) {
    console.warn(`⚠️  预期父产品 ${expectedParentCount} 个，实际找到 ${parentMap.size} 个`);
  }

  let successCount = 0,
    failCount = 0,
    updateCount = 0;

  for (const [parentId, parentRecord] of parentMap) {
    try {
      const locale = parentRecord.locale || LOCALE;
      const mdData = await readProduct(locale, parentId);

      if (!mdData) {
        console.warn(`⚠️  父产品 ${parentId} 的 MD 文件不存在，跳过`);
        continue;
      }

      const oldProductName = mdData.product_name;
      const oldPriceTiers = mdData.price_tiers;

      // 更新父产品字段
      mdData.product_name = parentRecord.product_name;

      const priceTiers = parsePriceTiers(parentRecord.price_tiers);
      mdData.price_tiers = priceTiers;
      const firstTier = priceTiers[0] || { min_qty: 1, price: 0 };
      mdData.price = firstTier.price;
      mdData.min_order_quantity = firstTier.min_qty;

      // 更新变体名称
      const children = childMap.get(parentId) || [];
      const childNameMap = new Map(children.map(c => [c.productId, c.product_name]));
      const variants = mdData.variants || [];
      let variantUpdated = false;
      for (const variant of variants) {
        if (childNameMap.has(variant.id)) {
          const newName = childNameMap.get(variant.id)!;
          if (variant.product_name !== newName) {
            variant.product_name = newName;
            variantUpdated = true;
          }
        }
      }

      const hasChanges =
        oldProductName !== mdData.product_name ||
        JSON.stringify(oldPriceTiers) !== JSON.stringify(priceTiers) ||
        variantUpdated;

      if (hasChanges) {
        await writeProduct(locale, parentId, mdData, mdData.content || '');
        updateCount++;
        console.log(`✅ 更新父产品 ${parentId} (${mdData.product_name})`);
      } else {
        console.log(`⏭️  父产品 ${parentId} 无需更新`);
      }
      successCount++;
    } catch (err: any) {
      console.error(`❌ 更新父产品 ${parentId} 失败:`, err.message);
      failCount++;
    }
  }

  console.log(`\n🎉 同步完成，处理 ${successCount} 个父产品，更新 ${updateCount} 个，失败 ${failCount} 个`);
}

syncProductMd()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });