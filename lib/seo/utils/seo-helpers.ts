// lib/seo/utils/seo-helpers.ts

import { getTranslations } from 'next-intl/server';

/**
 * 从 next-intl 翻译文件中获取面包屑标签（支持所有已配置的语言）
 * 使用 defaultValue 避免 MISSING_MESSAGE 错误
 */
export async function getBreadcrumbLabels(locale: string): Promise<{
  home: string;
  products: string;
  collections: string;
  docs: string;
}> {
  const defaults = {
    home: 'Home',
    products: 'Products',
    collections: 'Collections',
    docs: 'Docs',
  };
  try {
    const t = await getTranslations({ locale, namespace: 'common' });
    return {
      home: t('home', { defaultValue: 'Home' }),
      products: t('products', { defaultValue: 'Products' }),
      collections: t('collections', { defaultValue: 'Collections' }),
      docs: t('docs', { defaultValue: 'Docs' }),
    };
  } catch {
    return defaults;
  }
}

/** 获取分类描述的简洁版本（用于 ItemList） */
export function getItemDescription(cat: any): string | null {
  if (cat.seoDescription && cat.seoDescription.trim() !== '') {
    return cat.seoDescription.trim();
  }
  if (cat.description && cat.description.trim() !== '') {
    const clean = cat.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return clean.length > 150 ? clean.substring(0, 150) + '...' : clean;
  }
  return null;
}

/** 生成分类页的 meta description（含产品线上下文） */
export function generateCategoryDescription(data: any, locale: string): string {
  if (!data || !data.category) return '';
  const cat = data.category;
  if (cat.seoDescription && cat.seoDescription.trim() !== '') {
    return cat.seoDescription.trim();
  }
  const name = cat.name || '';
  const productLineName = data.productLine?.name || '';
  const specs = cat.description ? cat.description.match(/(\d+-\d+W|\d+W)/)?.[0] || '' : '';
  const industries = 'industrial control, test equipment';
  let desc = `${name} from ${productLineName}. ${specs ? specs + ', ' : ''}Ideal for ${industries}. Browse complete models. Free technical support.`;
  return desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
}

/** 生成集合页的 meta description（纯分类描述） */
export function generateCollectionDescription(data: any, locale: string): string {
  if (!data || !data.category) return '';
  const cat = data.category;
  if (cat.seoDescription && cat.seoDescription.trim() !== '') {
    return cat.seoDescription.trim();
  }
  const name = cat.name || '';
  const specs = cat.description ? cat.description.match(/(\d+-\d+W|\d+W)/)?.[0] || '' : '';
  let desc = `${name}. ${specs ? specs + ', ' : ''}Browse complete models and specifications. Free technical support available.`;
  return desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
}