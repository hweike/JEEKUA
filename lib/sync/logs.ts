// lib/sync-logs/index.ts
import { getPrivateStorage } from '@/lib/storage/factory';

export interface SyncLog {
  id: string;
  syncType: string;   // page, menu, header, footer, videoCategory, video, productCategory, product, doc, blog, blogPost
  sourceLocale: string;
  targetLocale: string;
  status: 'success' | 'failed';
  errorMsg?: string;
  operator: string;
  createdAt: string;
  itemId?: string;
}

// 私有桶中的存储 Key
const LOGS_KEY = 'data/sync-logs/logs.json';

/**
 * 读取所有日志（从私有桶）
 */
async function readLogs(): Promise<SyncLog[]> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(LOGS_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return [];
    }
    throw error;
  }
}

/**
 * 写入日志数组到私有桶
 */
async function writeLogs(logs: SyncLog[]): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(LOGS_KEY, JSON.stringify(logs, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 添加一条日志（自动保留最近1000条）
 */
export async function addLog(log: SyncLog): Promise<void> {
  const logs = await readLogs();
  logs.unshift(log);
  if (logs.length > 1000) logs.length = 1000;
  await writeLogs(logs);
}

/**
 * 获取日志列表（支持过滤）
 * @param filter 可选过滤条件：syncType, targetLocale, sourceLocale
 */
export async function getLogs(filter?: Partial<SyncLog>): Promise<SyncLog[]> {
  let logs = await readLogs();
  if (filter) {
    logs = logs.filter(l => 
      (!filter.syncType || l.syncType === filter.syncType) &&
      (!filter.targetLocale || l.targetLocale === filter.targetLocale) &&
      (!filter.sourceLocale || l.sourceLocale === filter.sourceLocale)
    );
  }
  return logs;
}

/**
 * 清除指定类型的日志
 * @param syncType 要清除的同步类型
 */
export async function clearLogsByType(syncType: string): Promise<void> {
  const logs = await readLogs();
  const filtered = logs.filter(log => log.syncType !== syncType);
  await writeLogs(filtered);
}