// lib/webbuilder/template-repo.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中的基础前缀
const STORAGE_PREFIX = 'data/webbuilder/templates';

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
  createdAt: string;
  updatedAt: string;
}

// 所有可能的分类列表（用于遍历）
const ALL_CATEGORIES: TemplateCategory[] = [
  'page', 'product', 'product_category', 'document', 'document_library',
  'blog', 'blog_post', 'video_category', 'video', 'product_line'
];

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
      if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
        console.error(`Failed to list templates for category ${cat}:`, error);
      }
    }
  }
  return templates;
}

/**
 * 根据 ID 获取模板（自动遍历所有分类查找）
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
      if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
        console.error(`Error reading template ${id} from category ${cat}:`, error);
      }
    }
  }
  return null;
}

/**
 * 创建新模板
 */
export async function createTemplate(input: {
  name: string;
  category: TemplateCategory;
  data: any;
}): Promise<Template> {
  const storage = getPrivateStorage();
  const id = `template_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const template: Template = {
    id,
    name: input.name,
    category: input.category,
    data: input.data || { root: { props: {} }, content: [], zones: {} },
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
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, 'name' | 'category' | 'data'>>
): Promise<Template | null> {
  const existing = await getTemplateById(id);
  if (!existing) return null;

  const updated: Template = {
    ...existing,
    ...updates,
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