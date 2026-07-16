// lib/discovery/translate.ts
import { translateText } from './deepseek';
import { getPrivateStorage } from '@/lib/storage/factory';

let cachedConfig: Record<string, { fields: string[]; prompt?: string }> | null = null;

async function loadTranslationConfig(): Promise<Record<string, { fields: string[]; prompt?: string }>> {
  if (cachedConfig) return cachedConfig;
  const storage = getPrivateStorage();
  const key = 'discovery/translation-config.json';
  try {
    const content = await storage.read(key, 'utf8');
    cachedConfig = JSON.parse(content as string);
    return cachedConfig;
  } catch (error: any) {
    // 如果文件不存在，给出明确提示
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey') {
      throw new Error('翻译配置文件不存在，请先通过「翻译配置」页面完善配置后再进行多语言同步。');
    }
    // 其他错误（如 JSON 解析失败）直接抛出
    throw error;
  }
}

/**
 * 递归翻译对象中的指定字段
 * @param data - 待翻译的数据对象（或数组）
 * @param pageType - 页面类型（如 'productCollection'）
 * @param targetLocale - 目标语言代码
 * @param fieldMapping - 可选字段名映射（配置字段名 → 实际数据字段名）
 * @returns 翻译后的新对象（浅拷贝）
 */
export async function translateFields(
  data: any,
  pageType: string,
  targetLocale: string,
  fieldMapping?: Record<string, string>
): Promise<any> {
  if (!data || typeof data !== 'object') return data;
  if (targetLocale === 'en') return data; // 英文不做翻译

  const config = await loadTranslationConfig();
  const typeConfig = config[pageType];
  if (!typeConfig || !typeConfig.fields || typeConfig.fields.length === 0) {
    return data;
  }

  // 处理数组
  if (Array.isArray(data)) {
    return Promise.all(data.map(item => translateFields(item, pageType, targetLocale, fieldMapping)));
  }

  const result = { ...data };
  const customPrompt = typeConfig.prompt; // 可能为 undefined

  for (const field of typeConfig.fields) {
    const sourceField = fieldMapping?.[field] || field;
    const value = data[sourceField];
    if (value && typeof value === 'string' && value.trim()) {
      try {
        result[sourceField] = await translateText(value, targetLocale, customPrompt);
      } catch (err) {
        console.error(`翻译字段 ${sourceField} 失败:`, err);
        // 保留原值
      }
    } else if (value && typeof value === 'object') {
      // 递归处理嵌套对象（如 series）
      result[sourceField] = await translateFields(value, pageType, targetLocale, fieldMapping);
    }
  }
  return result;
}