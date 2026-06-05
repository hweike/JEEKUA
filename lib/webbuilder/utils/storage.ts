// lib/WebBuilder/utils/storage.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中的基础前缀（对应原 lib/WebBuilder/data/templates）
const STORAGE_PREFIX = 'data/webbuilder/templates';

/**
 * 获取模板 JSON 文件在私有桶中的完整 Key
 */
function getTemplateKey(typeId: string, templateId: string, locale: string): string {
  return `${STORAGE_PREFIX}/${locale}/${typeId}_${templateId}.json`;
}

/**
 * 获取模板数据（若不存在返回 null）
 */
export async function getTemplateData(typeId: string, templateId: string, locale: string) {
  const storage = getPrivateStorage();
  const key = getTemplateKey(typeId, templateId, locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 保存模板数据（自动更新 updatedAt 字段）
 */
export async function saveTemplateData(typeId: string, templateId: string, locale: string, data: any) {
  const storage = getPrivateStorage();
  const key = getTemplateKey(typeId, templateId, locale);
  const dataToSave = { ...data, updatedAt: new Date().toISOString() };
  await storage.write(key, JSON.stringify(dataToSave, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 列出某类型的所有模板（按 updatedAt 降序）
 * 注意：原实现通过 stat.mtime 获取更新时间，现改为从 JSON 内容中读取 updatedAt 字段
 */
export async function listTemplates(typeId: string, locale: string = 'zh') {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_PREFIX}/${locale}/`;
  try {
    const keys = await storage.list(prefix);
    const pattern = new RegExp(`^${typeId}_(.+)\\.json$`);
    const templateKeys = keys.filter(key => pattern.test(key.split('/').pop() || ''));
    const templates = await Promise.all(
      templateKeys.map(async (key) => {
        const fileName = key.split('/').pop() || '';
        const match = fileName.match(pattern);
        const id = match ? match[1] : '';
        let name = id;
        let updatedAt = new Date(0);
        try {
          const content = await storage.read(key, 'utf8');
          const data = JSON.parse(content as string);
          name = data.root?.title || data.root?.name || id;
          updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date(0);
        } catch {
          // 忽略读取失败
        }
        return { id, name, updatedAt };
      })
    );
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return [];
    }
    throw error;
  }
}

/**
 * 删除模板
 */
export async function deleteTemplate(typeId: string, templateId: string, locale: string = 'zh') {
  const storage = getPrivateStorage();
  const key = getTemplateKey(typeId, templateId, locale);
  try {
    await storage.delete(key);
    return true;
  } catch (error) {
    console.error('删除失败', error);
    return false;
  }
}

/**
 * 获取默认模板（新建时使用，不涉及文件存储）
 */
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