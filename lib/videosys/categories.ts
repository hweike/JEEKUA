import fs from 'fs/promises';
import path from 'path';
import { CategoriesMap, Category } from './types';

const BASE_DIR = path.join(process.cwd(), 'data/videosys');

export async function getCategories(locale: string): Promise<CategoriesMap> {
  const filePath = path.join(BASE_DIR, locale, 'categories.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveCategories(locale: string, categories: CategoriesMap): Promise<void> {
  const dir = path.join(BASE_DIR, locale);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'categories.json');
  await fs.writeFile(filePath, JSON.stringify(categories, null, 2), 'utf-8');
}

export async function getCategory(key: string, locale: string): Promise<Category | null> {
  const categories = await getCategories(locale);
  return categories[key] || null;
}