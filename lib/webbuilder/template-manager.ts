// lib/webbuilder/template-manager.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { createHash } from 'crypto';

// 私有桶中的基础前缀（已去掉 data/ 前缀，与其他模块统一）
const STORAGE_PREFIX = 'webbuilder/templates';

// 扩展 TemplateCategory 包含 product_line 和 document_library
export type TemplateCategory =
  | 'page'
  | 'product'
  | 'product_category'
  | 'document'
  | 'document_library'      // 文档库模板
  | 'blog'
  | 'blog_post'
  | 'video_category'
  | 'video'
  | 'product_line';          // 产品线模板

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  isSystem?: boolean;        // 标记为系统模板
  data: any;
  hash?: string;             // 模板数据的 SHA256 哈希（用于版本检测）
  createdAt: string;
  updatedAt: string;
}

// 所有可能的分类列表（用于遍历）
const ALL_CATEGORIES: TemplateCategory[] = [
  'page', 'product', 'product_category', 'document', 'document_library',
  'blog', 'blog_post', 'video_category', 'video', 'product_line'
];

/**
 * 计算模板数据的哈希值（SHA256）
 */
export function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * 获取某个分类下所有模板的存储 Key 前缀
 */
function getCategoryPrefix(category: TemplateCategory): string {
  return `${STORAGE_PREFIX}/${category}/`;
}

/**
 * 获取模板文件的完整 Key
 */
function getTemplateKey(category: TemplateCategory, id: string): string {
  return `${STORAGE_PREFIX}/${category}/${id}.json`;
}

/**
 * 确保目录存在（云存储无需创建，保留空实现以兼容）
 */
async function ensureDir(dir: string): Promise<void> {
  // 云存储不需要创建目录
}

/**
 * 获取所有模板（可选按分类过滤）
 */
export async function getAllTemplates(category?: TemplateCategory | null): Promise<Template[]> {
  const storage = getPrivateStorage();
  const categories = category ? [category] : ALL_CATEGORIES;
  const templates: Template[] = [];

  for (const cat of categories) {
    const prefix = getCategoryPrefix(cat);
    try {
      const keys = await storage.list(prefix);
      const jsonKeys = keys.filter(key => key.endsWith('.json'));
      for (const key of jsonKeys) {
        try {
          const content = await storage.read(key, 'utf8');
          const template = JSON.parse(content as string);
          templates.push(template);
        } catch (err) {
          console.error(`Failed to parse template file ${key}:`, err);
        }
      }
    } catch (error: any) {
      // 增强错误捕获：目录不存在（NoSuchKey）时不报错
      if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404)) {
        console.error(`Failed to list templates for category ${cat}:`, error);
      }
    }
  }
  return templates;
}

/**
 * 根据 ID 获取模板（自动遍历所有分类查找）
 * 返回的模板对象包含 hash 字段（如果模板文件中有）
 */
export async function getTemplateById(id: string): Promise<Template | null> {
  const storage = getPrivateStorage();
  for (const cat of ALL_CATEGORIES) {
    const key = getTemplateKey(cat, id);
    try {
      const content = await storage.read(key, 'utf8');
      return JSON.parse(content as string);
    } catch (error: any) {
      // 文件不存在则继续尝试下一个分类
      if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404)) {
        console.error(`Error reading template ${id} from category ${cat}:`, error);
      }
    }
  }
  return null;
}

/**
 * 创建新模板（注意：此函数不会自动计算 hash，调用方需自行计算）
 */
export async function createTemplate(input: {
  name: string;
  category: TemplateCategory;
  data: any;
  hash?: string;  // 可选，建议传入
}): Promise<Template> {
  const storage = getPrivateStorage();
  const id = `template_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const template: Template = {
    id,
    name: input.name,
    category: input.category,
    data: input.data || { root: { props: {} }, content: [], zones: {} },
    hash: input.hash || computeTemplateHash(input.data),
    createdAt: now,
    updatedAt: now,
  };

  const key = getTemplateKey(input.category, id);
  await storage.write(key, JSON.stringify(template, null, 2), {
    contentType: 'application/json',
  });
  return template;
}

/**
 * 更新模板（支持修改分类、名称、数据）
 * 如果更新了数据，建议调用方更新 hash 字段
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, 'name' | 'category' | 'data' | 'hash'>>
): Promise<Template | null> {
  const existing = await getTemplateById(id);
  if (!existing) return null;

  // 如果更新了 data 但没有更新 hash，则自动计算
  let hash = existing.hash;
  if (updates.data && !updates.hash) {
    hash = computeTemplateHash(updates.data);
  } else if (updates.hash) {
    hash = updates.hash;
  }

  const updated: Template = {
    ...existing,
    ...updates,
    hash,
    updatedAt: new Date().toISOString(),
  };

  const storage = getPrivateStorage();

  // 如果分类变更，删除旧文件
  if (existing.category !== updated.category) {
    const oldKey = getTemplateKey(existing.category, id);
    try {
      await storage.delete(oldKey);
    } catch (err) {
      // 忽略删除失败
      console.warn(`Failed to delete old template file ${oldKey}:`, err);
    }
  }

  const newKey = getTemplateKey(updated.category, id);
  await storage.write(newKey, JSON.stringify(updated, null, 2), {
    contentType: 'application/json',
  });
  return updated;
}

/**
 * 删除模板
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const existing = await getTemplateById(id);
  if (!existing) return false;

  const storage = getPrivateStorage();
  const key = getTemplateKey(existing.category, id);
  try {
    await storage.delete(key);
    return true;
  } catch (err) {
    console.error(`Failed to delete template ${id}:`, err);
    return false;
  }
}