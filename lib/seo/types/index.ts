// lib/seo/types/index.ts

// =====================================================
// 1. 核心数据模型（对应数据库表）
// =====================================================

export interface SeoGlobalConfig {
  site_id: string;
  site_name: string;
  brand_name: string;
  site_url: string;
  default_locale: string;
  supported_locales: string[];
  target_audience?: string;
  core_values?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface FieldConfig {
  enabled: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minCount?: number;
  maxCount?: number;
  promptTemplate: string;
}

export interface StrategyFields {
  seo_title: FieldConfig;
  seo_description: FieldConfig;
  seo_keywords: FieldConfig;
}

export interface SeoStrategy {
  id?: string;
  site_id: string | null;
  page_type: string;
  label: string;
  use_global_context: boolean;
  fields: StrategyFields;
  created_at?: string;
  updated_at?: string;
}

export type GenerationStatus = 'pending' | 'analyzed' | 'ai_generated' | 'approved';

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
  source_analysis_ref?: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// 2. 批量任务
// =====================================================

export interface SeoBatchJob {
  id?: string;
  site_id: string;
  job_type: 'analyze' | 'generate_multi';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_count: number;
  completed_count: number;
  failed_count: number;
  source_locale?: string;
  target_locales?: string[];
  page_ids: string[];
  error_summary?: string;
  started_at?: string;
  finished_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BatchJobResponse {
  jobId: string;
  total: number;
}

// =====================================================
// 3. AI 生成
// =====================================================

export interface GenerateSeoInput {
  site_id: string;
  page_id: string;
  page_type: string;
  locale: string;
  source_locale: string;
  page_title: string;
  analyzed_keywords?: string[];
  analyzed_summary?: string;
  globalConfig: SeoGlobalConfig;
  strategy: SeoStrategy;
  customPrompt?: string;
}

export interface GeneratedSeo {
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
}

export interface MultiLanguageGenerateRequest {
  site_id: string;
  page_id: string;
  source_locale: string;
  target_locales: string[];
  customPrompt?: string;
}

// =====================================================
// 4. 分析服务
// =====================================================

export interface RumenxAnalysisResult {
  textContent: string;
  keywords: string[];
  wordCount: number;
  readingTime: number;
  seoMetrics: {
    score: number;
    [key: string]: any;
  };
  headings?: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images?: {
    total: number;
    withAlt: number;
    withoutAlt: number;
  };
  links?: {
    total: number;
    internal: number;
    external: number;
  };
}

export interface AnalyzedContent {
  keywords: string[];
  summary: string;
  wordCount: number;
  raw?: RumenxAnalysisResult;
}

// =====================================================
// 5. AI 服务
// =====================================================

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerateOptions {
  targetLanguage: string;
  customPrompt?: string;
  timeout?: number;
  retries?: number;
}

export interface AIParseResult {
  success: boolean;
  data?: GeneratedSeo;
  raw?: string;
  error?: string;
}

// =====================================================
// 6. 工具类型
// =====================================================

export interface PromptVariables {
  page_title?: string;
  page_type?: string;
  brand_name?: string;
  site_name?: string;
  target_audience?: string;
  core_values?: string;
  analyzed_keywords?: string;
  analyzed_summary?: string;
  target_language?: string;
  minLength?: number;
  maxLength?: number;
  minCount?: number;
  maxCount?: number;
  [key: string]: any;
}

// =====================================================
// 7. 内存进度管理
// =====================================================

export interface BatchJobProgress {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  completed: number;
  failed: number;
  details: {
    pageId: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
    locale?: string;
    error?: string;
  }[];
  startTime: number;
  updateTime: number;
}

// =====================================================
// 8. SEO 评分相关
// =====================================================

export interface SeoScoreConfig {
  titleMinLength?: number;
  titleMaxLength?: number;
  descMinLength?: number;
  descMaxLength?: number;
  keywordMinCount?: number;
  keywordMaxCount?: number;
}

export interface SeoScoreCheck {
  label: string;
  passed: boolean;
  suggestion?: string;
}

export interface SeoScoreDimension {
  score: number;
  maxScore: number;
  checks: SeoScoreCheck[];
}

export interface SeoScoreResult {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  label: string;
  dimensions: {
    seo_title: SeoScoreDimension;
    seo_description: SeoScoreDimension;
    seo_keywords: SeoScoreDimension;
  };
  suggestions: string[];
}