// lib/WebBuilder/utils/publish.ts
import { translateJson } from './translation';
import { savePageData, getPageData } from './storage';

export async function publishToLanguages(
  sourceLang: string,
  targetLangs: string[],
  type: string,
  id: string
) {
  const sourceData = await getPageData(type, id, sourceLang);
  if (!sourceData) throw new Error('Source page not found');

  for (const targetLang of targetLangs) {
    // 调用 DeepSeek 翻译 JSON 中的所有文本字段
    const translatedData = await translateJson(sourceData, targetLang);
    await savePageData(type, id, targetLang, translatedData);
  }
}