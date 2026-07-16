// lib/seo/services/index.ts

export { SeoService, seoService } from './seo.service';
export { strategiesService, StrategiesService } from './strategies.service';
export { analyzerService, AnalyzerService } from './analyzer.service';
export { aiService, AIService } from './ai.service';  // ✅ 恢复 AI 服务导出

// 批量进度管理
export { batchProgressService } from './batchProgress.service';

export type {
  PageSeoData,
  SeoStrategy,
  SeoGlobalConfig,
  GenerateSeoInput,
  GenerationStatus,
  AnalyzedContent,
  RumenxAnalysisResult,
} from '../types';