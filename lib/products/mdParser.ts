// lib/products/mdParser.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';

/**
 * 获取产品 MD 文件在私有桶中的存储 Key
 */
function getProductMdKey(locale: string, productId: string): string {
  return `data/products/${locale}/products/${productId}.md`;
}

/**
 * 读取产品 MD 文件
 */
export async function readProduct(locale: string, productId: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = getProductMdKey(locale, productId);
  try {
    const fileContent = await storage.read(key, 'utf8');
    const { data, content: markdown } = matter(fileContent as string);
    return { ...data, content: markdown, productId };
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 写入产品 MD 文件
 */
export async function writeProduct(locale: string, productId: string, frontMatter: any, content: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getProductMdKey(locale, productId);
  const fileContent = matter.stringify(content, frontMatter);
  await storage.write(key, fileContent, { contentType: 'text/markdown' });
}

/**
 * 删除产品 MD 文件
 */
export async function deleteProduct(locale: string, productId: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getProductMdKey(locale, productId);
  try {
    await storage.delete(key);
  } catch (error: any) {
    // 如果文件不存在，忽略错误（与原逻辑一致）
    if (!(error?.message?.includes('NoSuchKey') || error?.code === 'NoSuchKey')) {
      throw error;
    }
  }
}