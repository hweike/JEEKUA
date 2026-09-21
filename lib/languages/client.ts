// lib/languages/client.ts
import { LANGUAGES } from './config';

let cachedLanguages: any[] | null = null;
let fetchPromise: Promise<any[]> | null = null;

export async function getEnabledLanguages(): Promise<any[]> {
  if (cachedLanguages) return cachedLanguages;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/languages/enabled')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch enabled languages');
      return res.json();
    })
    .then((data) => {
      cachedLanguages = data;
      return data;
    })
    .catch((err) => {
      console.error('Failed to load enabled languages, using fallback:', err);
      cachedLanguages = LANGUAGES.map((lang) => ({
        code: lang.code,
        nativeName: lang.nativeName,
        zhName: lang.zhName,
      }));
      return cachedLanguages;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}