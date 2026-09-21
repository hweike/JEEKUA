// lib/seo/page-fetchers.ts

// 这些是占位实现，当实际业务模块未实现时返回 null 并警告
// 注意：getProductBySlug 已移至 product.config.ts 内联，避免重复定义冲突

export async function getBlogIndex(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getBlogIndex not implemented for slug: ${slug}`);
  return null;
}

export async function getBlogPostBySlug(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getBlogPostBySlug not implemented for slug: ${slug}`);
  return null;
}

export async function getDocBySlug(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getDocBySlug not implemented for slug: ${slug}`);
  return null;
}

export async function getDocLibraryBySlug(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getDocLibraryBySlug not implemented for slug: ${slug}`);
  return null;
}

export async function getVideoBySlug(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getVideoBySlug not implemented for slug: ${slug}`);
  return null;
}

export async function getVideoCollectionBySlug(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getVideoCollectionBySlug not implemented for slug: ${slug}`);
  return null;
}

export async function getBlogCategoryBySlug(locale: string, slug: string): Promise<any> {
  console.warn(`[SEO] getBlogCategoryBySlug not implemented for slug: ${slug}`);
  return null;
}