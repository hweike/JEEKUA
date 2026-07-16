// app/admin/discovery/seo/strategies/constants/index.ts

import type { Strategy, StrategyFields } from '../types';

export const PAGE_TYPES = [
  { key: 'home', label: '首页' },
  { key: 'productLine', label: '产品线落地页' },
  { key: 'productCollection', label: '产品合集' },
  { key: 'product', label: '产品' },
  { key: 'page', label: '页面' },
  { key: 'blog', label: '博客落地页' },
  { key: 'blogCategory', label: '博客合集' },
  { key: 'blogPost', label: '博客文章' },
  { key: 'docLibrary', label: '文档库' },
  { key: 'doc', label: '文档' },
  { key: 'videoCategory', label: '视频合集' },
  { key: 'video', label: '视频' },
  { key: 'inquiry', label: '询盘' },
  { key: 'policy', label: '政策' },
];

export const FIELD_CONFIGS: {
  key: FieldKey;
  label: string;
  description: string;
  isKeyword?: boolean;
}[] = [
  {
    key: 'seo_title',
    label: 'SEO 标题 (seo_title)',
    description: '搜索结果中显示的标题',
  },
  {
    key: 'seo_description',
    label: 'SEO 描述 (seo_description)',
    description: '搜索结果中显示的描述',
  },
  {
    key: 'seo_keywords',
    label: 'SEO 关键词 (seo_keywords)',
    description: '页面关键词（Google 已弃用，但可作为 AI 生成依据）',
    isKeyword: true,
  },
];

export const DEFAULT_FIELD_CONFIG = {
  seo_title: {
    enabled: true,
    required: true,
    minLength: 30,
    maxLength: 60,
    promptTemplate: '',
  },
  seo_description: {
    enabled: true,
    required: true,
    minLength: 80,
    maxLength: 160,
    promptTemplate: '',
  },
  seo_keywords: {
    enabled: false,
    required: false,
    minCount: 1,
    maxCount: 5,
    promptTemplate: '',
  },
} as const;

export const createDefaultStrategy = (pageType: string, label: string): Strategy => ({
  site_id: null,
  page_type: pageType,
  label: label,
  use_global_context: true,
  fields: {
    seo_title: { ...DEFAULT_FIELD_CONFIG.seo_title },
    seo_description: { ...DEFAULT_FIELD_CONFIG.seo_description },
    seo_keywords: { ...DEFAULT_FIELD_CONFIG.seo_keywords },
  },
});

export const API_BASE = '/api/discovery/seo';