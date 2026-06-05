// lib/crawler/core/task.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { CrawlerRule, TaskData } from '../types';

// 私有桶中的存储前缀（对应原 data/crawler/）
const STORAGE_PREFIX = 'data/crawler';

/**
 * 获取规则文件在私有桶中的完整 key
 */
function getRuleKey(ruleId: string): string {
  return `${STORAGE_PREFIX}/rules/${ruleId}.json`;
}

/**
 * 获取任务 meta 文件在私有桶中的完整 key
 */
function getTaskMetaKey(taskId: string): string {
  return `${STORAGE_PREFIX}/tasks/${taskId}/meta.json`;
}

/**
 * 确保存储路径可用（云存储无需实际创建目录，保留此函数以便兼容）
 */
export async function ensureDirs() {
  // 云存储无需创建目录，但保留空实现以兼容原有调用
}

/**
 * 获取爬虫规则
 */
export async function getRule(ruleId: string): Promise<CrawlerRule | null> {
  const storage = getPrivateStorage();
  const key = getRuleKey(ruleId);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`读取规则失败 [${ruleId}]:`, error);
    throw error;
  }
}

/**
 * 保存任务数据（创建或更新）
 */
export async function saveTask(taskId: string, data: Partial<TaskData>) {
  const storage = getPrivateStorage();
  const metaKey = getTaskMetaKey(taskId);

  // 读取现有任务数据（如果存在）
  let existing: TaskData = {
    taskId,
    ruleId: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  try {
    const content = await storage.read(metaKey, 'utf8');
    existing = JSON.parse(content as string);
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      console.error(`读取任务元数据失败 [${taskId}]:`, error);
      throw error;
    }
  }

  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await storage.write(metaKey, JSON.stringify(merged, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 获取任务数据
 */
export async function getTask(taskId: string): Promise<TaskData | null> {
  const storage = getPrivateStorage();
  const metaKey = getTaskMetaKey(taskId);
  try {
    const content = await storage.read(metaKey, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`读取任务失败 [${taskId}]:`, error);
    throw error;
  }
}