// lib/discovery/services/business-register-pages.service.ts
/**
 * 业务端 → pages 表注册服务
 * 职责：在业务模块（产品、分类、博客等）新增或更新数据后，将页面元数据（标题、URL、SEO等）异步注册到 pages 表。
 * 调用方式：业务服务中调用 registerEntity()，无需 await（异步执行）。
 */

import { upsertPage, PageData, SITE_ID } from '../register';
import {
  mapProductLineToPageData,
  mapCategoryToPageData,
  mapSeriesToPageData,
  mapProductToPageData,
  mapBlogCategoryToPageData,
  mapBlogPostToPageData,
  mapDocLibraryToPageData,
  mapDocToPageData,
  mapVideoCategoryToPageData,
  mapVideoToPageData,
  mapStaticPageToPageData,
} from '../mappers';
import { getProductLines, getCategories } from '@/lib/products/services';
// import { getProduct } from '@/lib/products/services/product.service';
// ... 其他业务服务

type BusinessType =
  | 'product'
  | 'productLine'
  | 'productCollection'
  | 'blogPost'
  | 'blogCategory'
  | 'doc'
  | 'docLibrary'
  | 'video'
  | 'videoCategory'
  | 'page'
  | 'policy';

export interface RegisterEntityParams {
  type: BusinessType;
  id: string;
  locale: string;
  data?: any;               // 可选：如果调用方已持有业务数据，可直接传入
  updatedAt?: string;       // 可选：强制更新时间戳，默认当前时间
  parentId?: string;        // 可选：用于子级分类（series）的父级 ID
  parentSlug?: string;      // 可选：用于子级分类的父级 slug
}

/**
 * 根据业务类型和 ID 获取业务数据（若未传入）
 */
async function fetchBusinessData(type: BusinessType, id: string, locale: string): Promise<any> {
  switch (type) {
    case 'product':
      // return getProduct(locale, id);
      throw new Error(`fetchBusinessData not implemented for type: ${type}`);
    case 'productLine': {
      const lines = await getProductLines(locale);
      const found = lines.find((line) => line.id === id);
      if (!found) throw new Error(`ProductLine ${id} not found in ${locale}`);
      return found;
    }
    case 'productCollection': {
      const categories = await getCategories(locale);
      const found = categories.find((cat) => cat.id === id);
      if (!found) throw new Error(`Category ${id} not found in ${locale}`);
      return found;
    }
    // 其他类型...
    default:
      throw new Error(`Unsupported business type: ${type}`);
  }
}

/**
 * 将业务数据映射为 PageData（复用 mapper 函数）
 * 注意：对于子级分类，需单独调用 mapSeriesToPageData，此函数只处理普通情况。
 */
function mapToPageData(
  type: BusinessType,
  bizData: any,
  locale: string,
  updatedAt: string,
  parentId?: string,
  parentSlug?: string
): PageData {
  switch (type) {
    case 'product': {
      const pageData = mapProductToPageData(bizData, {}, '', updatedAt);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'productLine': {
      const pageData = mapProductLineToPageData(bizData);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'productCollection': {
      if (parentId && parentSlug) {
        // 子级（series）
        return mapSeriesToPageData(parentId, parentSlug, bizData);
      } else {
        // 父级
        const pageData = mapCategoryToPageData(bizData);
        pageData.updatedAt = updatedAt;
        return pageData;
      }
    }
    case 'blogCategory': {
      const pageData = mapBlogCategoryToPageData(bizData);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'blogPost': {
      const mdContent = bizData.content_full || '';
      const pageData = mapBlogPostToPageData(bizData, {}, mdContent);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'docLibrary': {
      const pageData = mapDocLibraryToPageData(bizData);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'doc': {
      const mdContent = bizData.content_full || '';
      const libSlug = bizData.lib_slug || bizData.lib_id || 'default';
      const pageData = mapDocToPageData(bizData, {}, libSlug, mdContent);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'videoCategory': {
      const pageData = mapVideoCategoryToPageData(bizData, bizData.id);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'video': {
      const categorySlug = bizData.category_slug || bizData.category_key || 'default';
      const pageData = mapVideoToPageData(bizData, {}, '', categorySlug);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    case 'page':
    case 'policy': {
      const mdContent = bizData.content || '';
      const pageData = mapStaticPageToPageData(bizData, mdContent);
      pageData.updatedAt = updatedAt;
      return pageData;
    }
    default:
      throw new Error(`Mapping not implemented for type: ${type}`);
  }
}

/**
 * 注册业务实体到 pages 表（异步执行，不阻塞调用方）
 */
export async function registerEntity(params: RegisterEntityParams): Promise<void> {
  const { type, id, locale, data: providedData, updatedAt = new Date().toISOString(), parentId, parentSlug } = params;

  try {
    let bizData = providedData;
    if (!bizData) {
      bizData = await fetchBusinessData(type, id, locale);
    }
    if (!bizData) {
      throw new Error(`Business data not found for ${type}:${id} (${locale})`);
    }

    const pageData = mapToPageData(type, bizData, locale, updatedAt, parentId, parentSlug);
    await upsertPage(pageData, locale);
  } catch (error) {
    console.error(`Failed to register entity ${type}:${id} (${locale}):`, error);
  }
}