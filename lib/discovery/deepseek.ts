// lib/discovery/deepseek.ts
import { getLanguageDisplayName } from '@/lib/languages/config';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const API_URL = `${BASE_URL}/v1/chat/completions`;

/**
 * 翻译文本（带自定义提示词）
 * @param text - 待翻译文本
 * @param targetLocale - 目标语言代码（如 'zh', 'de'）
 * @param customPrompt - 自定义系统提示词（可选，来自翻译配置）
 * @returns 翻译后的文本
 */
export async function translateText(
  text: string,
  targetLocale: string,
  customPrompt?: string
): Promise<string> {
  if (!text.trim()) return '';

  // 从语言配置中获取目标语言名称（中文显示名）
  const targetLangName = getLanguageDisplayName(targetLocale, 'zh');
  // 如果未找到，回退到语言代码本身
  const langName = targetLangName || targetLocale;

  // 构建系统提示词
  const systemPrompt = customPrompt
    ? `${customPrompt} 目标语言：${langName}。只返回翻译结果，不要解释。`
    : `You are a professional translator. Translate the following text to ${langName}. Only return the translated text, no explanations.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepseek API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    return translated || text;
  } catch (error) {
    console.error('Translation error:', error);
    // 发生错误时返回原文，不中断流程
    return text;
  }
}