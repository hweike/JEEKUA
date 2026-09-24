// lib/products/utils/slug.tsx
import sql from '@/lib/db/admin';

export async function getProductSlug(productId: string): Promise<string | null> {
  if (!productId) return null;

  try {
    const rows = await sql<{ slug: string | null }[]>`
      SELECT slug FROM public.products
      WHERE "productId" = ${productId}
      LIMIT 1
    `;
    if (!rows[0]) {
      console.warn('[getProductSlug] 未找到产品:', productId);
      return null;
    }
    return rows[0].slug || null;
  } catch (error: any) {
    console.warn('[getProductSlug] 查询失败:', error.message);
    return null;
  }
}

export async function getProductSlugs(productIds: string[]): Promise<Record<string, string>> {
  if (!productIds || productIds.length === 0) return {};

  const uniqueIds = [...new Set(productIds)];

  try {
    const data = await sql<{ productId: string; slug: string | null }[]>`
      SELECT "productId", slug FROM public.products
      WHERE "productId" IN ${sql(uniqueIds)}
    `;
    const map: Record<string, string> = {};
    data.forEach(item => {
      if (item.productId && item.slug) {
        map[item.productId] = item.slug;
      }
    });
    return map;
  } catch (error: any) {
    console.warn('[getProductSlugs] 查询失败:', error.message);
    return {};
  }
}

export async function getProductInfo(productId: string): Promise<{
  id: string;
  slug: string;
  product_name: string;
  main_image_url?: string;
} | null> {
  if (!productId) return null;

  try {
    const rows = await sql<{ productId: string; slug: string | null; product_name: string | null; main_image_url: string | null }[]>`
      SELECT "productId", slug, product_name, main_image_url FROM public.products
      WHERE "productId" = ${productId}
      LIMIT 1
    `;
    if (!rows[0]) {
      console.warn('[getProductInfo] 未找到产品:', productId);
      return null;
    }
    const data = rows[0];
    return {
      id: data.productId,
      slug: data.slug || '',
      product_name: data.product_name || '',
      main_image_url: data.main_image_url || '',
    };
  } catch (error: any) {
    console.warn('[getProductInfo] 查询失败:', error.message);
    return null;
  }
}

export async function getProductInfos(productIds: string[]): Promise<Record<string, {
  id: string;
  slug: string;
  product_name: string;
  main_image_url?: string;
}>> {
  if (!productIds || productIds.length === 0) return {};

  const uniqueIds = [...new Set(productIds)];

  try {
    const data = await sql<{ productId: string; slug: string | null; product_name: string | null; main_image_url: string | null }[]>`
      SELECT "productId", slug, product_name, main_image_url FROM public.products
      WHERE "productId" IN ${sql(uniqueIds)}
    `;
    const map: Record<string, { id: string; slug: string; product_name: string; main_image_url?: string }> = {};
    data.forEach(item => {
      if (item.productId) {
        map[item.productId] = {
          id: item.productId,
          slug: item.slug || '',
          product_name: item.product_name || '',
          main_image_url: item.main_image_url || '',
        };
      }
    });
    return map;
  } catch (error: any) {
    console.warn('[getProductInfos] 查询失败:', error.message);
    return {};
  }
}

export async function getProductIdBySlug(slug: string): Promise<string | null> {
  if (!slug) return null;

  try {
    const rows = await sql<{ productId: string }[]>`
      SELECT "productId" FROM public.products
      WHERE slug = ${slug}
      LIMIT 1
    `;
    if (!rows[0]) {
      console.warn('[getProductIdBySlug] 未找到产品:', slug);
      return null;
    }
    return rows[0].productId || null;
  } catch (error: any) {
    console.warn('[getProductIdBySlug] 查询失败:', error.message);
    return null;
  }
}

export async function buildProductUrl(
  productId: string,
  locale: string = 'en',
  slug?: string
): Promise<string | null> {
  if (!productId) return null;

  try {
    let productSlug = slug;
    if (!productSlug) {
      const result = await getProductSlug(productId);
      if (!result) return null;
      productSlug = result;
    }
    return `/${locale}/product/${productSlug}`;
  } catch (error) {
    console.error('[buildProductUrl] 异常:', error);
    return null;
  }
}