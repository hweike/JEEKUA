'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Loader2,
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
  Search,
  Sparkles,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SeoScoreCard } from './SeoScoreCard';
import { calculateSeoScore, getWeightedLength } from '@/lib/seo/utils/score';
import type { SeoScoreResult } from '@/lib/seo/types';
import { DEFAULT_SEO_LIMITS } from '@/lib/seo/constants';

// =====================================================
// 类型定义
// =====================================================

export type GenerationStatus = 'pending' | 'analyzed' | 'ai_generated' | 'approved';

interface SeoStrategy {
  id?: string;
  page_type: string;
  label: string;
  fields: {
    seo_title: { enabled: boolean; required?: boolean; minLength?: number; maxLength?: number };
    seo_description: { enabled: boolean; required?: boolean; minLength?: number; maxLength?: number };
    seo_keywords: { enabled: boolean; required?: boolean; minCount?: number; maxCount?: number };
  };
}

interface PageSeoData {
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

interface PageListItem {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  locale: string;
  seoStatus?: GenerationStatus;
}

interface Language {
  code: string;
  nativeName: string;
  zhName: string;
}

interface PublishedSeoData {
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seoScore: SeoScoreResult | null;
}

interface EditModalProps {
  page: PageListItem | null;
  seoData: PageSeoData | null;
  strategies: SeoStrategy[];
  languages: Language[];
  loading: boolean;
  onClose: () => void;
  onSave: (data: { seo_title?: string; seo_description?: string; seo_keywords?: string[] }) => Promise<void>;
  onAnalyze: () => Promise<void>;
  onGenerate: (targetLocales: string[]) => Promise<void>;
  onApprove: () => Promise<void>;
}

// =====================================================
// 主组件
// =====================================================

export function EditModal({
  page,
  seoData,
  strategies,
  languages,
  loading,
  onClose,
  onSave,
  onAnalyze,
  onGenerate,
  onApprove,
}: EditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 预览模式状态
  const [isPreview, setIsPreview] = useState(false);
  const [publishedData, setPublishedData] = useState<PublishedSeoData | null>(null);
  const [loadingPublished, setLoadingPublished] = useState(false);

  // 同步数据到表单
  useEffect(() => {
    if (seoData) {
      setTitle(seoData.seo_title || '');
      setDescription(seoData.seo_description || '');
      setKeywords((seoData.seo_keywords || []).join(', '));
    }
  }, [seoData]);

  // ============================================================
  // 🔍 调试日志：监控数据变化
  // ============================================================
  useEffect(() => {
    console.log('========================================');
    console.log('🔍 [EditModal] 调试日志');
    console.log('========================================');
    console.log('📝 description 原始文本:', description);
    console.log('📊 description.length (原始长度):', description.length);
    
    const weightedLen = getWeightedLength(description);
    console.log('📊 getWeightedLength(description):', weightedLen);
    
    // 逐字符分析
    console.log('🔤 字符分析:');
    let weightedTotal = 0;
    for (let i = 0; i < description.length; i++) {
      const char = description[i];
      const code = char.charCodeAt(0);
      const isLatin = (code >= 0x0020 && code <= 0x007F) || 
                      (code >= 0x00C0 && code <= 0x00FF) ||
                      (code >= 0x0100 && code <= 0x017F) ||
                      (code >= 0x0180 && code <= 0x024F) ||
                      (code >= 0x1E00 && code <= 0x1EFF);
      const weight = isLatin ? 1 : 2;
      weightedTotal += weight;
      if (i < 20) { // 只显示前20个字符
        console.log(`  字符[${i}]: '${char}' (U+${code.toString(16).toUpperCase()}) → ${weight} 字符`);
      }
    }
    console.log('📊 手动计算加权总长度:', weightedTotal);
    console.log('📊 getWeightedLength 返回:', weightedLen);
    console.log('✅ 两者是否一致:', weightedTotal === weightedLen ? '✅ 是' : '❌ 否');
    console.log('========================================');
  }, [description]);

  // ========== 加载已发布数据 ==========
  const loadPublishedData = async () => {
    if (!page) return;
    setLoadingPublished(true);
    setError(null);
    try {
      const encodedId = encodeURIComponent(page.id);
      const res = await fetch(
        `/api/discovery/seo/page/${encodedId}/published?locale=${page.locale}`
      );
      if (!res.ok) throw new Error('加载已发布数据失败');
      const json = await res.json();
      setPublishedData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoadingPublished(false);
    }
  };

  // 切换到预览模式时加载数据
  const handleShowPreview = async () => {
    setIsPreview(true);
    if (!publishedData) {
      await loadPublishedData();
    }
  };

  const handleBackToEdit = () => {
    setIsPreview(false);
    setError(null);
  };

  // ========== 实时评分 ==========
  const strategy = strategies.find((s) => s.page_type === page?.type);
  const titleConfig = strategy?.fields?.seo_title;
  const descConfig = strategy?.fields?.seo_description;
  const keywordConfig = strategy?.fields?.seo_keywords;

  // 使用 DEFAULT_SEO_LIMITS 作为回退值
  const seoConfig = {
    titleMinLength: titleConfig?.minLength ?? DEFAULT_SEO_LIMITS.seo_title.min,
    titleMaxLength: titleConfig?.maxLength ?? DEFAULT_SEO_LIMITS.seo_title.max,
    descMinLength: descConfig?.minLength ?? DEFAULT_SEO_LIMITS.seo_description.min,
    descMaxLength: descConfig?.maxLength ?? DEFAULT_SEO_LIMITS.seo_description.max,
    keywordMinCount: keywordConfig?.minCount ?? DEFAULT_SEO_LIMITS.seo_keywords.minCount,
    keywordMaxCount: keywordConfig?.maxCount ?? DEFAULT_SEO_LIMITS.seo_keywords.maxCount,
  };

  // ✅ 计算评分（score.ts 内部已处理字符加权）
  const currentScore = useMemo<SeoScoreResult | null>(() => {
    if (!seoData) return null;

    const titleTrimmed = title.trim();
    const descTrimmed = description.trim();
    const keywordsArray = keywords.split(',').map((k) => k.trim()).filter(Boolean);

    if (!titleTrimmed && !descTrimmed && keywordsArray.length === 0) {
      return null;
    }

    const result = calculateSeoScore(
      title,
      description,
      keywordsArray,
      [],
      seoConfig
    );

    // 🔍 调试日志：评分计算
    console.log('🔍 [评分计算]');
    console.log('  description:', description);
    console.log('  seoConfig.descMinLength:', seoConfig.descMinLength);
    console.log('  seoConfig.descMaxLength:', seoConfig.descMaxLength);
    console.log('  result dimensions:', result?.dimensions);

    return result;
  }, [title, description, keywords, seoConfig]);

  if (!page || !seoData) return null;

  // ✅ 使用加权长度计算字符数
  const titleWeightedLen = getWeightedLength(title);
  const descWeightedLen = getWeightedLength(description);
  const titleRawLen = title.length;
  const descRawLen = description.length;

  // 🔍 调试日志：显示长度
  console.log('🔍 [渲染] descWeightedLen:', descWeightedLen, 'descRawLen:', descRawLen);

  // 显示长度范围
  const titleRangeLabel = `${seoConfig.titleMinLength}-${seoConfig.titleMaxLength}`;
  const descRangeLabel = `${seoConfig.descMinLength}-${seoConfig.descMaxLength}`;
  const keywordRangeLabel = `${seoConfig.keywordMinCount}-${seoConfig.keywordMaxCount}`;

  const getStatusColor = (status: GenerationStatus) => {
    const colors: Record<GenerationStatus, string> = {
      pending: 'bg-gray-100 text-gray-600',
      analyzed: 'bg-blue-100 text-blue-700',
      ai_generated: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-500';
  };

  const getStatusLabel = (status: GenerationStatus) => {
    const labels: Record<GenerationStatus, string> = {
      pending: '待处理',
      analyzed: '已分析',
      ai_generated: 'AI已生成',
      approved: '已确认',
    };
    return labels[status] || status;
  };

  // ✅ 保存草稿
  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await onSave({
        seo_title: title || undefined,
        seo_description: description || undefined,
        seo_keywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
      });
      setSuccess('✅ 草稿保存成功');
      setTimeout(() => setSuccess(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSuccess(null);
    try {
      await onAnalyze();
      setSuccess('✅ 内容分析完成');
      setTimeout(() => setSuccess(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!page) return;
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      await onGenerate([page.locale]);
      setSuccess('✅ AI 生成完成');
      setTimeout(() => setSuccess(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setSuccess(null);
    try {
      await onSave({
        seo_title: title || undefined,
        seo_description: description || undefined,
        seo_keywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
      });
      await onApprove();
      setSuccess('✅ 已确认发布！');
      setTimeout(() => setSuccess(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存或发布失败');
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsApproving(false);
    }
  };

  // ============================================================
  // 渲染：预览模式
  // ============================================================
  if (isPreview) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* 头部 */}
          <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b bg-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToEdit}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回编辑
              </button>
              <h2 className="text-lg font-semibold">📊 已发布 SEO 数据预览</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              ℹ️ 这是当前已发布到线上的 SEO 数据，仅供预览。
            </div>

            {loadingPublished ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : publishedData ? (
              <>
                {publishedData.seoScore && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-700">线上 SEO 评分</h3>
                      <span className="text-xs text-gray-400">只读</span>
                    </div>
                    <SeoScoreCard score={publishedData.seoScore} />
                  </div>
                )}

                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      SEO 标题
                    </label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
                      {publishedData.seo_title || <span className="text-gray-400">未设置</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      SEO 描述
                    </label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap">
                      {publishedData.seo_description || <span className="text-gray-400">未设置</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      SEO 关键词
                    </label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
                      {publishedData.seo_keywords
                        ? publishedData.seo_keywords.split(',').map((k) => k.trim()).filter(Boolean).join(', ')
                        : <span className="text-gray-400">未设置</span>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">暂无已发布数据</div>
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
            <button
              onClick={handleBackToEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回编辑
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 渲染：编辑模式
  // ============================================================
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b bg-white rounded-t-lg">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{page.title}</h2>
            <p className="text-sm text-gray-500">
              {page.typeLabel || page.type} · {page.locale}
              <span
                className={`ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  seoData.generation_status
                )}`}
              >
                {getStatusLabel(seoData.generation_status)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 查看已发布数据链接 */}
        <div className="px-6 pt-4">
          <button
            onClick={handleShowPreview}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4" />
            查看已发布 SEO 数据 →
          </button>
        </div>

        {/* 消息 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2 shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* ========== 分析结果区域 ========== */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2 text-gray-700">
                <Search className="w-4 h-4 text-blue-600" />
                内容分析结果
              </h3>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isAnalyzing ? '分析中...' : '重新分析'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">关键词</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {seoData.analyzed_keywords?.length ? (
                    seoData.analyzed_keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium"
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">
                      暂无关键词，请点击"重新分析"
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">摘要</label>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                  {seoData.analyzed_summary || '暂无摘要'}
                </p>
              </div>
            </div>
          </div>

          {/* ========== AI 生成 ========== */}
          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                  AI 生成 SEO
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  为当前页面（{page.locale}）生成 SEO 标题、描述和关键词
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? '生成中...' : 'AI 生成'}
              </button>
            </div>
          </div>

          {/* ========== SEO 字段编辑 ========== */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  SEO 标题
                  {titleConfig?.required && <span className="text-red-500 ml-1">*</span>}
                  {titleConfig && (
                    <span className="text-xs text-gray-400 ml-2 font-normal">
                      ({titleRangeLabel} 字符)
                    </span>
                  )}
                </label>
                {/* ✅ 显示加权长度 */}
                <span
                  className={`text-xs ${
                    titleWeightedLen > seoConfig.titleMaxLength ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {titleWeightedLen} 字符
                  {titleRawLen !== titleWeightedLen && (
                    <span className="text-gray-400 ml-1">（原始 {titleRawLen}）</span>
                  )}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="输入 SEO 标题"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  SEO 描述
                  {descConfig?.required && <span className="text-red-500 ml-1">*</span>}
                  {descConfig && (
                    <span className="text-xs text-gray-400 ml-2 font-normal">
                      ({descRangeLabel} 字符)
                    </span>
                  )}
                </label>
                {/* ✅ 显示加权长度 */}
                <span
                  className={`text-xs ${
                    descWeightedLen > seoConfig.descMaxLength ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {descWeightedLen} 字符
                  {descRawLen !== descWeightedLen && (
                    <span className="text-gray-400 ml-1">（原始 {descRawLen}）</span>
                  )}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="输入 SEO 描述"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  SEO 关键词
                  {keywordConfig?.required && <span className="text-red-500 ml-1">*</span>}
                  {keywordConfig && (
                    <span className="text-xs text-gray-400 ml-2 font-normal">
                      ({keywordRangeLabel} 个)
                    </span>
                  )}
                </label>
              </div>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="用逗号分隔关键词，如：电源, 开关电源, 导轨电源"
              />
              <p className="text-xs text-gray-400 mt-1">多个关键词用英文逗号分隔</p>
            </div>
          </div>

          {/* ========== SEO 评分卡片 ========== */}
          {seoData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">📊 草稿 SEO 评分</h3>
                <span className="text-xs text-gray-400">
                  基于当前草稿数据计算
                </span>
              </div>
              {currentScore ? (
                <SeoScoreCard score={currentScore} />
              ) : (
                <div className="border rounded-lg p-8 bg-gray-50 text-center">
                  <div className="text-gray-400">
                    <span className="block text-3xl mb-3">✏️</span>
                    <p className="text-sm">请填写 SEO 标题、描述或关键词后查看评分</p>
                    <p className="text-xs text-gray-400 mt-1">评分将根据您填写的内容实时计算</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 提示 */}
          <div className="text-xs text-gray-400 border-t pt-3">
            💡 当前评分基于草稿数据计算。确认发布后，线上评分将更新为草稿评分。
          </div>
        </div>

        {/* ========== 底部操作栏 ========== */}
        <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 min-w-[120px] justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存草稿
              </>
            )}
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || isApproving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 min-w-[120px] justify-center"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                发布中...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                确认发布
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}