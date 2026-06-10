// lib/crawler/core/buffer.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { getTask, saveTask } from './task';

const BATCH_SIZE = 50;
let pendingProducts: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;

function getTaskProductsKey(taskId: string): string {
  return `crawler/tasks/${taskId}/products.json`;
}

async function readProducts(taskId: string): Promise<any[]> {
  const storage = getPrivateStorage();
  const key = getTaskProductsKey(taskId);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 全面捕获所有表示“文件不存在”的错误
    const isNotFound = error?.code === 'NoSuchKey' ||
                       error?.Code === 'NoSuchKey' ||
                       error?.$metadata?.httpStatusCode === 404 ||
                       error?.message?.includes('not found') ||
                       error?.message?.includes('NoSuchKey');
    if (isNotFound) {
      return [];
    }
    console.error(`读取 products.json 失败 [${taskId}]:`, error);
    throw error;
  }
}

async function writeProducts(taskId: string, products: any[]): Promise<void> {
  const storage = getPrivateStorage();
  const key = getTaskProductsKey(taskId);
  await storage.write(key, JSON.stringify(products, null, 2), {
    contentType: 'application/json',
  });
}

function getProductKey(product: any): string {
  const identifier = product.model || product.name || product.seriesId;
  // 防止 parent_product_id 为 undefined
  const parentId = product.parent_product_id || '';
  return `${product.categoryId}-${parentId}`;
}

async function isProductDuplicate(taskId: string, product: any): Promise<boolean> {
  const key = getProductKey(product);
  // 检查内存缓冲区
  if (pendingProducts.some(p => getProductKey(p.rawData) === key)) {
    return true;
  }
  // 检查已持久化的文件
  const existingProducts = await readProducts(taskId);
  if (existingProducts.some((p: any) => getProductKey(p.rawData) === key)) {
    return true;
  }
  return false;
}

export async function addProduct(taskId: string, product: any): Promise<boolean> {
  try {
    if (await isProductDuplicate(taskId, product)) {
      console.log(`⏭️ 跳过重复产品: ${product.parent_product_name || product.model}`);
      return false;
    }

    pendingProducts.push({
      taskId,
      categoryId: product.categoryId,
      rawData: product,
      crawledAt: new Date().toISOString(),
    });

    // 更新最新产品预览
    const taskData = await getTask(taskId);
    if (taskData) {
      let latest = taskData.latestProducts || [];
      latest.push(product);
      if (latest.length > 5) latest = latest.slice(-5);
      await saveTask(taskId, { latestProducts: latest });
    }

    if (pendingProducts.length >= BATCH_SIZE) {
      if (batchTimer) clearTimeout(batchTimer);
      await flushProducts(taskId);
    } else if (!batchTimer) {
      batchTimer = setTimeout(async () => {
        await flushProducts(taskId);
        batchTimer = null;
      }, 5000);
    }
    return true;
  } catch (err) {
    console.error(`添加产品失败 (taskId=${taskId}):`, err);
    return false; // 不抛出，避免中断爬虫
  }
}

export async function flushProducts(taskId: string) {
  if (pendingProducts.length === 0) return;
  let existingProducts = await readProducts(taskId);
  existingProducts.push(...pendingProducts);
  await writeProducts(taskId, existingProducts);
  pendingProducts = [];
}