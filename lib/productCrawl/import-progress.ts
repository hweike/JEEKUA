// lib/productCrawl/import-progress.ts

/**
 * 导入进度存储
 * 使用内存存储，适合单机部署
 */

interface ImportProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  current: number;
  currentProduct?: string;
  currentVariant?: string;
  message: string;
  results?: ImportResultItem[];
  startedAt: string;
  updatedAt: string;
}

interface ImportResultItem {
  crawler_id: string;
  sku: string;
  source_url: string;
  status: 'success' | 'skipped' | 'failed' | 'processing';
  product_id?: string;
  message: string;
}

// 内存存储
const progressStore = new Map<string, ImportProgress>();

export function createProgress(taskId: string, total: number): ImportProgress {
  const progress: ImportProgress = {
    taskId,
    status: 'pending',
    total,
    current: 0,
    message: '准备导入...',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  progressStore.set(taskId, progress);
  return progress;
}

export function updateProgress(
  taskId: string,
  data: Partial<ImportProgress>
): ImportProgress | null {
  const progress = progressStore.get(taskId);
  if (!progress) return null;
  
  const updated = {
    ...progress,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  progressStore.set(taskId, updated);
  return updated;
}

export function getProgress(taskId: string): ImportProgress | null {
  return progressStore.get(taskId) || null;
}

export function deleteProgress(taskId: string): void {
  progressStore.delete(taskId);
}

// 清理过期任务（30分钟后删除）
setInterval(() => {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30分钟
  
  for (const [taskId, progress] of progressStore) {
    const updatedAt = new Date(progress.updatedAt).getTime();
    if (now - updatedAt > expireTime) {
      progressStore.delete(taskId);
    }
  }
}, 60 * 1000); // 每分钟清理一次