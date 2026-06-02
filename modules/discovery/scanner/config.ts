// modules/discovery/scanner/config.ts
import { PageInfo } from '../types';
import { ContentTypeConfig } from '../types';

export const contentTypes: ContentTypeConfig[] = [
  {
    type: 'product',
    sourceDir: 'products',
    filePattern: /\.md$/,
    urlPrefix: '/products',
    getSlug: (filename, fm) => fm.slug || filename.replace(/\.md$/, ''),
    getTitle: (fm, locale) => fm.title?.[locale] || fm.title || '',
    getContent: (content) => content.replace(/(\*\*|__|\*|_|`|~~)/g, '').slice(0, 500),
  },
  {
    type: 'doc',
    sourceDir: 'docs',
    filePattern: /\.md$/,
    urlPrefix: '/docs',
    getSlug: (filename, fm) => fm.slug || filename.replace(/\.md$/, ''),
    getTitle: (fm, locale) => fm.title?.[locale] || fm.title || '',
  },
  {
    type: 'blog',
    sourceDir: 'blog',
    filePattern: /\.md$/,
    urlPrefix: '/blog',
    getSlug: (filename, fm) => fm.slug || filename.replace(/\.md$/, ''),
    getTitle: (fm, locale) => fm.title?.[locale] || fm.title || '',
  },
  {
    type: 'video',
    sourceDir: 'videos',
    filePattern: /\.md$/,
    urlPrefix: '/videos',
    getSlug: (filename, fm) => fm.slug || filename.replace(/\.md$/, ''),
    getTitle: (fm, locale) => fm.title?.[locale] || fm.title || '',
  },
];

export const categorySources = [
  {
    filePath: 'data/categories.json',
    getItems: (json: any, locale: string): PageInfo[] => {
      if (!Array.isArray(json)) return [];
      return json.map((cat: any) => ({
        id: `category:${cat.slug}`,
        title: cat.name?.[locale] || cat.name || '',
        slug: cat.slug,
        url: `/categories/${cat.slug}`,
        type: 'category',
        content: '',
        seo: {
          metaTitle: cat.seo_title?.[locale] || cat.name,
          metaDescription: cat.seo_description?.[locale] || '',
          metaKeywords: cat.seo_keywords?.[locale] || '',
          canonical: null,
          noindex: false,
          nofollow: false,
        },
        updatedAt: new Date().toISOString(),
      }));
    },
  },
];