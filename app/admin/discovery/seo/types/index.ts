// app/admin/discovery/seo/types/index.ts

import type { GenerationStatus } from '../../components/StatusBadge';

export interface PageListItem {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  locale: string;
  url?: string;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  seoStatus: GenerationStatus;
  seoScore?: number;
  seoLevel?: string;
  seoColor?: string;
  seoLabel?: string;
  updatedAt?: string;
}

export interface SeoStrategy {
  id?: string;
  page_type: string;
  label: string;
  fields: {
    seo_title: { enabled: boolean; required?: boolean; minLength?: number; maxLength?: number };
    seo_description: { enabled: boolean; required?: boolean; minLength?: number; maxLength?: number };
    seo_keywords: { enabled: boolean; required?: boolean; minCount?: number; maxCount?: number };
  };
}

export interface PageSeoData {
  id?: string;
  site_id: string;
  page_id: string;
  locale: string;
  page_type: string;
  analyzed_keywords?: string[];
  analyzed_summary?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  generation_status: GenerationStatus;
  source_locale?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Language {
  code: string;
  nativeName: string;
  zhName: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const PAGE_TYPE_LABELS: Record<string, string> = {
  home: '首页',
  productLine: '产品线落地页',
  productCollection: '产品合集',
  product: '产品',
  page: '页面',
  blog: '博客落地页',
  blogCategory: '博客合集',
  blogPost: '博客文章',
  docLibrary: '文档库',
  doc: '文档',
  videoCategory: '视频合集',
  video: '视频',
  inquiry: '询盘',
  policy: '政策',
};