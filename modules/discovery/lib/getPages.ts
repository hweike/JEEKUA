// modules/discovery/lib/getPages.ts
import fs from 'fs';
import path from 'path';
import { PageInfo } from '../types';

let cache: Record<string, { data: PageInfo[]; timestamp: number }> = {};
const CACHE_TTL = 60 * 1000; // 1分钟

export function getPages(locale: string): PageInfo[] {
  const now = Date.now();
  if (cache[locale] && now - cache[locale].timestamp < CACHE_TTL) {
    return cache[locale].data;
  }
  const filePath = path.join(process.cwd(), 'data', 'discovery', `pages-${locale}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const pages = JSON.parse(content) as PageInfo[];
  cache[locale] = { data: pages, timestamp: now };
  return pages;
}

export function clearCache(locale?: string) {
  if (locale) delete cache[locale];
  else cache = {};
}