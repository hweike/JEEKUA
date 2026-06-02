// lib/webbuilder/template-utils.ts

interface TemplateBrief {
  id: string;
  name: string;
}

// 用于从API获取模板名称的缓存
const templateNameCache: Map<string, string> = new Map();

/**
 * 获取模板的显示名称
 * @param templateId 模板ID
 * @param templatesMap 可选，包含 {id, name} 的数组或Map，优先从该映射查找
 * @returns 模板名称或原始ID（如找不到）
 */
export async function getTemplateDisplayName(
  templateId: string,
  templatesMap?: Map<string, string> | TemplateBrief[]
): Promise<string> {
  if (!templateId) return '';

  // 1. 优先从传入的映射中查找
  if (templatesMap) {
    if (templatesMap instanceof Map) {
      const name = templatesMap.get(templateId);
      if (name) return name;
    } else if (Array.isArray(templatesMap)) {
      const found = templatesMap.find(t => t.id === templateId);
      if (found) return found.name;
    }
  }

  // 2. 其次从本地缓存查找
  if (templateNameCache.has(templateId)) {
    return templateNameCache.get(templateId)!;
  }

  // 3. 通过API获取
  try {
    const res = await fetch(`/api/templates?id=${templateId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.name) {
        templateNameCache.set(templateId, data.name);
        return data.name;
      }
    }
  } catch (error) {
    console.error('获取模板名称失败:', error);
  }

  // 4. 兜底返回原始ID
  return templateId;
}

/**
 * 批量加载模板名称到缓存（常用于列表页预加载）
 * @param templateIds 模板ID数组
 */
export async function preloadTemplateNames(templateIds: string[]) {
  const uniqueIds = [...new Set(templateIds.filter(Boolean))];
  const promises = uniqueIds.map(id => getTemplateDisplayName(id));
  await Promise.all(promises);
}