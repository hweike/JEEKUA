// lib/discovery/deepseek.ts
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function translateText(text: string, targetLocale: string): Promise<string> {
  if (!text.trim()) return '';
  const targetLangName = targetLocale === 'zh' ? '中文' : targetLocale === 'en' ? 'English' : targetLocale;
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: `You are a professional translator. Translate the following text to ${targetLangName}. Only return the translated text, no explanations.` },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}