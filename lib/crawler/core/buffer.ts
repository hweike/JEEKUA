// lib/crawler/core/buffer.ts
import { getPrivateStorage } from '@/lib/storage/factory';

const BATCH_SIZE = 50;
let pendingProducts: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/**
 * 获取指定任务的 products.json 在私有桶中的完整 key
 */
function getTaskProductsKey(taskId: string): string {
  return `data/crawler/tasks/${taskId}/products.json`;
}

/**
 * 读取指定任务的 products.json 文件
 */
async function readProducts(taskId: string): Promise<any[]> {
  const storage = getPrivateStorage();
  const key = getTaskProductsKey(taskId);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 文件不存在 -> 返回空数组
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return [];
    }
    console.error(`读取 products.json 失败 [${taskId}]:`, error);
    throw error;
  }
}

/**
 * 写入 products.json 到私有桶
 */
async function writeProducts(taskId: string, products: any[]): Promise<void> {
  const storage = getPrivateStorage();
  const key = getTaskProductsKey(taskId);
  await storage.write(key, JSON.stringify(products, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 生成产品的唯一标识（用于去重）
 */
function getProductKey(product: any): string {
  const identifier = product.model || product.name || product.seriesId;
  return `${product.categoryId}-${identifier}`;
}

/**
 * 检查产品是否已存在于 pending 或已持久化的列表中
 */
async function isProductDuplicate(taskId: string, product: any): Promise<boolean> {
  const key = getProductKey(product);

  // 1. 检查 pendingProducts（全局，不区分 taskId，与原逻辑一致）
  if (pendingProducts.some(p => getProductKey(p.rawData) === key)) {
    return true;
  }

  // 2. 检查已持久化的 products.json
  const existingProducts = await readProducts(taskId);
  if (existingProducts.some((p: any) => getProductKey(p.rawData) === key)) {
    return true;
  }

  return false;
}

/**
 * 添加产品到缓冲区（带去重）
 */
export async function addProduct(taskId: string, product: any) {
  // 去重检查
  if (await isProductDuplicate(taskId, product)) {
    console.log(`⏭️ 跳过重复产品: ${product.model || product.name}`);
    return;
  }

  pendingProducts.push({
    taskId,
    categoryId: product.categoryId,
    rawData: product,
    crawledAt: new Date().toISOString(),
  });

  if (pendingProducts.length >= BATCH_SIZE) {
    if (batchTimer) clearTimeout(batchTimer);
    await flushProducts(taskId);
  } else if (!batchTimer) {
    batchTimer = setTimeout(async () => {
      await flushProducts(taskId);
      batchTimer = null;
    }, 5000);
  }
}

/**
 * 将缓冲区中的所有产品持久化到私有桶
 */
export async function flushProducts(taskId: string) {
  if (pendingProducts.length === 0) return;

  // 读取现有产品
  let existingProducts: any[] = await readProducts(taskId);

  // 追加所有待写入产品（保留原 bug：未按 taskId 筛选，直接全部追加）
  existingProducts.push(...pendingProducts);

  // 写入私有桶（覆盖写）
  await writeProducts(taskId, existingProducts);

  // 清空缓冲区
  pendingProducts = [];
}