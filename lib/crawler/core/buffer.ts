// lib/crawler/core/buffer.ts
import fs from 'fs/promises';
import path from 'path';
import { TASKS_DIR } from '../types';

const BATCH_SIZE = 50;
let pendingProducts: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;

// 辅助函数：生成产品的唯一标识
function getProductKey(product: any): string {
  // 优先使用 model，如果没有则使用 name 或 seriesId
  const identifier = product.model || product.name || product.seriesId;
  return `${product.categoryId}-${identifier}`;
}

// 检查产品是否已存在于 pending 或已持久化的列表中
async function isProductDuplicate(taskId: string, product: any): Promise<boolean> {
  const key = getProductKey(product);
  // 检查 pendingProducts
  if (pendingProducts.some(p => getProductKey(p.rawData) === key)) {
    return true;
  }
  // 检查已持久化的 products.json
  const taskDir = path.join(TASKS_DIR, taskId);
  const productsPath = path.join(taskDir, 'products.json');
  try {
    const content = await fs.readFile(productsPath, 'utf-8');
    const existingProducts = JSON.parse(content);
    if (existingProducts.some((p: any) => getProductKey(p.rawData) === key)) {
      return true;
    }
  } catch {
    // 文件不存在或解析失败，忽略
  }
  return false;
}

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

// flushProducts 函数保持不变
export async function flushProducts(taskId: string) {
  if (pendingProducts.length === 0) return;
  const taskDir = path.join(TASKS_DIR, taskId);
  const productsPath = path.join(taskDir, 'products.json');
  let existingProducts: any[] = [];
  try {
    const content = await fs.readFile(productsPath, 'utf-8');
    existingProducts = JSON.parse(content);
  } catch {}
  existingProducts.push(...pendingProducts);
  const tempPath = productsPath + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(existingProducts, null, 2));
  await fs.rename(tempPath, productsPath);
  pendingProducts = [];
}