import fs from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'data/webbuilder/templates');

// 扩展 TemplateCategory 包含 product_line 和 document_library
export type TemplateCategory =
  | 'page'
  | 'product'
  | 'product_category'
  | 'document'
  | 'document_library'      // 新增：文档库模板
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

// 确保目录存在
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function getAllTemplates(category?: TemplateCategory | null): Promise<Template[]> {
  await ensureDir(TEMPLATES_DIR);
  const templates: Template[] = [];
  
  // 所有可能的分类列表（包含 product_line 和 document_library）
  const allCategories: TemplateCategory[] = [
    'page', 'product', 'product_category', 'document', 'document_library',
    'blog', 'blog_post', 'video_category', 'video', 'product_line'
  ];
  const categories = category ? [category] : allCategories;

  for (const cat of categories) {
    const catDir = path.join(TEMPLATES_DIR, cat);
    try {
      const files = await fs.readdir(catDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(catDir, file), 'utf-8');
          templates.push(JSON.parse(content));
        }
      }
    } catch {
      // 目录不存在则跳过
    }
  }
  return templates;
}

export async function getTemplateById(id: string): Promise<Template | null> {
  await ensureDir(TEMPLATES_DIR);
  // 所有可能的分类列表（包含 product_line 和 document_library）
  const allCategories: TemplateCategory[] = [
    'page', 'product', 'product_category', 'document', 'document_library',
    'blog', 'blog_post', 'video_category', 'video', 'product_line'
  ];
  for (const cat of allCategories) {
    const filePath = path.join(TEMPLATES_DIR, cat, `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // 继续尝试下一个分类
    }
  }
  return null;
}

export async function createTemplate(input: {
  name: string;
  category: TemplateCategory;
  data: any;
}): Promise<Template> {
  await ensureDir(TEMPLATES_DIR);
  const catDir = path.join(TEMPLATES_DIR, input.category);
  await ensureDir(catDir);

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

  await fs.writeFile(
    path.join(catDir, `${id}.json`),
    JSON.stringify(template, null, 2)
  );
  return template;
}

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

  const catDir = path.join(TEMPLATES_DIR, updated.category);
  await ensureDir(catDir);

  // 如果分类变更，删除旧文件
  if (existing.category !== updated.category) {
    const oldPath = path.join(TEMPLATES_DIR, existing.category, `${id}.json`);
    try {
      await fs.unlink(oldPath);
    } catch {
      // 忽略删除失败
    }
  }

  await fs.writeFile(
    path.join(catDir, `${id}.json`),
    JSON.stringify(updated, null, 2)
  );
  return updated;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const existing = await getTemplateById(id);
  if (!existing) return false;

  const filePath = path.join(TEMPLATES_DIR, existing.category, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}