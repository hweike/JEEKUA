// lib/seo/services/index.ts

// =====================================================
// SEO 服务层导出
// 所有服务类及其单例实例
// =====================================================

export { SeoService, seoService } from './seo.service';
export { strategiesService, StrategiesService } from './strategies.service';
export { analyzerService, AnalyzerService } from './analyzer.service';
export { aiService, AIService } from './ai.service';
export { batchProgressService } from './batchProgress.service';

// =====================================================
// 类型定义
// 所有 SEO 相关类型请从 '@/lib/seo/types' 导入
// =====================================================
// 示例:
// import type {
//   PageSeoData,
//   SeoStrategy,
//   SeoGlobalConfig,
//   GenerateSeoInput,
//   GenerationStatus,
//   AnalyzedContent,
//   RumenxAnalysisResult,
// } from '@/lib/seo/types';