// =====================================================
// SEO 系统常量
// =====================================================

/**
 * 支持的页面类型列表（与数据库保持一致）
 */
export const PAGE_TYPES = [
  'home',
  'product',
  'productLine',
  'productCollection',
  'page',
  'blog',
  'blogCategory',
  'blogPost',
  'docLibrary',
  'doc',
  'videoCategory',
  'video',
  'inquiry',
  'policy',
] as const;

export type PageType = typeof PAGE_TYPES[number];

/**
 * 页面类型的显示名称（中文）
 */
export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  home: '首页',
  product: '产品',
  productLine: '产品线落地页',
  productCollection: '产品合集',
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

/**
 * 状态枚举
 */
export const GENERATION_STATUS = {
  PENDING: 'pending',
  ANALYZED: 'analyzed',
  AI_GENERATED: 'ai_generated',
  APPROVED: 'approved',
} as const;

export type GenerationStatus = typeof GENERATION_STATUS[keyof typeof GENERATION_STATUS];

/**
 * 任务类型
 */
export const JOB_TYPES = {
  ANALYZE: 'analyze',
  GENERATE_MULTI: 'generate_multi',
} as const;

/**
 * 批量任务状态
 */
export const BATCH_JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

/**
 * 默认长度限制（符合 Google SEO 最佳实践）
 */
export const DEFAULT_SEO_LIMITS = {
  seo_title: {
    min: 30,
    max: 60,
  },
  seo_description: {
    min: 80,
    max: 160,
  },
  seo_keywords: {
    minCount: 3,
    maxCount: 5,
  },
} as const;

/**
 * 批量任务并发数（控制 API 限流）
 */
export const BATCH_CONCURRENCY = 5;

/**
 * 内存进度保留时间（毫秒）
 */
export const PROGRESS_TTL = 10 * 60 * 1000; // 10 分钟