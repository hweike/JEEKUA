// lib/WebBuilder/utils/storage.ts
import fs from 'fs/promises';
import path from 'path';

const DATA_ROOT = path.join(process.cwd(), 'lib/WebBuilder/data/templates');

// 获取模板数据
export async function getTemplateData(typeId: string, templateId: string, locale: string) {
  const filePath = path.join(DATA_ROOT, locale, `${typeId}_${templateId}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// 保存模板数据
export async function saveTemplateData(typeId: string, templateId: string, locale: string, data: any) {
  const dir = path.join(DATA_ROOT, locale);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${typeId}_${templateId}.json`);
  await fs.writeFile(filePath, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2));
}

// 列出某类型的所有模板
export async function listTemplates(typeId: string, locale: string = 'zh') {
  const dir = path.join(DATA_ROOT, locale);
  try {
    const files = await fs.readdir(dir);
    const pattern = new RegExp(`^${typeId}_(.+)\\.json$`);
    const templates = await Promise.all(
      files.filter(f => pattern.test(f)).map(async (file) => {
        const match = file.match(pattern);
        const id = match![1];
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        let name = id;
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          name = data.root?.title || data.root?.name || id;
        } catch {}
        return { id, name, updatedAt: stat.mtime };
      })
    );
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch {
    return [];
  }
}

// 删除模板
export async function deleteTemplate(typeId: string, templateId: string, locale: string = 'zh') {
  const filePath = path.join(DATA_ROOT, locale, `${typeId}_${templateId}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('删除失败', error);
    return false;
  }
}

// 获取默认模板（新建时使用）
export async function getDefaultTemplate(typeId: string) {
  return {
    content: [],
    root: {
      props: {
        title: `新建${typeId}模板`,
      },
    },
  };
}