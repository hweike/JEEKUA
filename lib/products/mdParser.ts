// lib/products/mdParser.ts
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const PRODUCTS_DIR = path.join(process.cwd(), 'data/products');

export async function readProduct(locale: string, productId: string): Promise<any> {
  const filePath = path.join(PRODUCTS_DIR, locale, 'products', `${productId}.md`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: markdown } = matter(content);
    return { ...data, content: markdown, productId };
  } catch {
    return null;
  }
}

export async function writeProduct(locale: string, productId: string, frontMatter: any, content: string) {
  const filePath = path.join(PRODUCTS_DIR, locale, 'products', `${productId}.md`);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const fileContent = matter.stringify(content, frontMatter);
  await fs.writeFile(filePath, fileContent, 'utf-8');
}

export async function deleteProduct(locale: string, productId: string) {
  const filePath = path.join(PRODUCTS_DIR, locale, 'products', `${productId}.md`);
  try {
    await fs.unlink(filePath);
  } catch {}
}