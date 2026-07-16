'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

import { EditModal } from '../components/EditModal';
import { BatchProgressModal } from '../components/BatchProgressModal';
import { BatchGenerateModal } from '../components/BatchGenerateModal';
import { SEOFilterBar } from './components/SEOFilterBar';
import { SEOTable } from './components/SEOTable';
import { SEOPagination } from './components/SEOPagination';
import { useSEOData } from './hooks/useSEOData';
import type { PageListItem, PageSeoData, SeoStrategy } from './types';

// =====================================================
// 主组件
// =====================================================

export default function SEOManagementPage() {
  // 使用自定义 Hook 管理数据
  const {
    pages,
    total,
    totalPages,
    loading,
    error,
    setError,
    currentPage,
    selectedLocale,
    filterStatus,
    filterType,
    searchQuery,
    PAGE_SIZE,
    languages,
    loadPages,
    goToPage,
    handleLocaleChange,
    handleStatusChange,
    handleTypeChange,
    handleSearchChange,
    typeOptions,
  } = useSEOData();

  // 本地状态
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [strategies, setStrategies] = useState<SeoStrategy[]>([]);

  // 编辑弹窗
  const [selectedPage, setSelectedPage] = useState<PageListItem | null>(null);
  const [selectedSeoData, setSelectedSeoData] = useState<PageSeoData | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // 批量任务
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [showBatchGenerate, setShowBatchGenerate] = useState(false);
  const [batchMode, setBatchMode] = useState<'selected' | 'all'>('selected');

  // ========== 加载策略 ==========
  useEffect(() => {
    const loadStrategies = async () => {
      try {
        const res = await fetch('/api/discovery/seo/strategies');
        if (!res.ok) throw new Error('加载策略失败');
        const json = await res.json();
        setStrategies(json.data || []);
      } catch (err) {
        console.error('加载策略失败:', err);
      }
    };
    loadStrategies();
  }, []);

  // ========== 全选逻辑 ==========
  const allSelected = pages.length > 0 && pages.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // ========== 编辑弹窗 ==========
  const openEditModal = async (page: PageListItem) => {
    setSelectedPage(page);
    setEditModalOpen(true);
    setModalLoading(true);
    setError(null);
    try {
      const encodedId = encodeURIComponent(page.id);
      const res = await fetch(`/api/discovery/seo/page/${encodedId}?locale=${page.locale}`);
      if (!res.ok) throw new Error('获取页面 SEO 数据失败');
      const json = await res.json();
      setSelectedSeoData(json.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 SEO 数据失败');
    } finally {
      setModalLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedPage(null);
    setSelectedSeoData(null);
    setError(null);
  };

  // ========== 保存草稿 ==========
  const handleSaveDraft = async (data: { seo_title?: string; seo_description?: string; seo_keywords?: string[] }) => {
    if (!selectedPage) return;
    const res = await fetch('/api/discovery/seo/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: selectedPage.id,
        locale: selectedPage.locale,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        seo_keywords: data.seo_keywords,
      }),
    });
    if (!res.ok) throw new Error('保存草稿失败');
    const json = await res.json();
    setSelectedSeoData(json.data);
    await loadPages();
  };

  // ========== 分析 ==========
  const handleAnalyze = async () => {
    if (!selectedPage) return;
    const res = await fetch('/api/discovery/seo/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: selectedPage.id,
        locale: selectedPage.locale,
      }),
    });
    if (!res.ok) throw new Error('分析失败');
    const json = await res.json();
    setSelectedSeoData(json.data);
    await loadPages();
  };

  // ========== AI 生成 ==========
  const handleGenerate = async (targetLocales: string[]) => {
    if (!selectedPage) return;
    const res = await fetch('/api/discovery/seo/generate-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: selectedPage.id,
        sourceLocale: selectedPage.locale,
        targetLocales,
      }),
    });
    if (!res.ok) throw new Error('AI 生成失败');
    const json = await res.json();
    const currentResult = json.data?.[selectedPage.locale];
    if (currentResult?.success && currentResult.data) {
      setSelectedSeoData((prev) => ({
        ...prev!,
        seo_title: currentResult.data.seo_title || '',
        seo_description: currentResult.data.seo_description || '',
        seo_keywords: currentResult.data.seo_keywords || [],
        generation_status: 'ai_generated' as any,
        source_locale: selectedPage.locale,
      }));
    }
    await loadPages();
  };

  // ========== 确认发布 ==========
  const handleApprove = async () => {
    if (!selectedPage) return;
    const res = await fetch('/api/discovery/seo/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: selectedPage.id,
        locale: selectedPage.locale,
      }),
    });
    if (!res.ok) throw new Error('发布失败');
    await loadPages();
    setSelectedSeoData((prev) => (prev ? { ...prev, generation_status: 'approved' as any } : null));
  };

  // ========== 批量生成 ==========
  const handleBatchGenerate = async (fields: { title: boolean; description: boolean; keywords: boolean }) => {
    const targetIds = batchMode === 'all' ? pages.map((p) => p.id) : Array.from(selectedIds);
    if (targetIds.length === 0) {
      setError('没有可选的页面');
      return;
    }

    const fieldNames: string[] = [];
    if (fields.title) fieldNames.push('SEO 标题');
    if (fields.description) fieldNames.push('SEO 描述');
    if (fields.keywords) fieldNames.push('SEO 关键词');

    if (!confirm(
      `⚠️ 批量生成将覆盖所选页面原来的 SEO 信息（${fieldNames.join('、')}），可能对页面的搜索引擎排名产生影响，请谨慎操作！\n\n` +
      `将对 ${targetIds.length} 个页面执行：分析 → AI 生成 → 确认发布（一气呵成）\n\n` +
      `确定要继续吗？`
    )) return;

    setIsBatchRunning(true);
    setError(null);
    setShowBatchGenerate(false);

    try {
      // 批量分析
      const analyzeRes = await fetch('/api/discovery/seo/batch/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: targetIds, locale: selectedLocale }),
      });
      if (!analyzeRes.ok) throw new Error('批量分析失败');
      const analyzeJson = await analyzeRes.json();
      await waitForJob(analyzeJson.jobId);

      // AI 生成
      const generateRes = await fetch('/api/discovery/seo/batch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageIds: targetIds,
          sourceLocale: selectedLocale,
          targetLocales: [selectedLocale],
        }),
      });
      if (!generateRes.ok) throw new Error('AI 生成失败');
      const generateJson = await generateRes.json();
      await waitForJob(generateJson.jobId);

      // 逐个确认发布
      let approved = 0,
        failed = 0;
      for (const pageId of targetIds) {
        try {
          const approveRes = await fetch('/api/discovery/seo/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageId, locale: selectedLocale }),
          });
          if (approveRes.ok) approved++;
          else failed++;
        } catch {
          failed++;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setSuccess(`批量生成完成！成功 ${approved} 个，失败 ${failed} 个`);
      setTimeout(() => setSuccess(null), 5000);
      await loadPages();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量生成失败');
    } finally {
      setIsBatchRunning(false);
    }
  };

  const waitForJob = (jobId: string) =>
    new Promise((resolve) => {
      const checkComplete = setInterval(async () => {
        const statusRes = await fetch(`/api/discovery/seo/batch/status/${jobId}`);
        const statusJson = await statusRes.json();
        if (statusJson.data?.status === 'completed' || statusJson.data?.status === 'failed') {
          clearInterval(checkComplete);
          resolve(true);
        }
      }, 3000);
    });

  // ========== 渲染 ==========
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              SEO 管理
            </h1>
            <p className="text-gray-600 text-sm">管理所有页面的 SEO 元数据，支持 AI 分析生成</p>
          </div>
          <button
            onClick={() => loadPages()}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 消息 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 筛选栏 */}
        <SEOFilterBar
          selectedLocale={selectedLocale}
          languages={languages}
          onLocaleChange={handleLocaleChange}
          filterStatus={filterStatus}
          onStatusChange={handleStatusChange}
          filterType={filterType}
          typeOptions={typeOptions}
          onTypeChange={handleTypeChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedCount={selectedIds.size}
          totalCount={total}
          isBatchRunning={isBatchRunning}
          onBatchGenerate={() => {
            if (selectedIds.size === 0) {
              setError('请先选择要生成的页面');
              return;
            }
            setBatchMode('selected');
            setShowBatchGenerate(true);
          }}
          onBatchAll={() => {
            if (total === 0) {
              setError('当前没有页面');
              return;
            }
            setBatchMode('all');
            setShowBatchGenerate(true);
          }}
        />

        {/* 表格 */}
        <SEOTable
          pages={pages}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          onEdit={openEditModal}
          loading={loading}
        />

        {/* 分页 */}
        <SEOPagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={goToPage}
        />
      </div>

      {/* 编辑弹窗 */}
      {editModalOpen && selectedPage && selectedSeoData && (
        <EditModal
          page={selectedPage}
          seoData={selectedSeoData}
          strategies={strategies}
          languages={languages}
          loading={modalLoading}
          onClose={closeEditModal}
          onSave={handleSaveDraft}
          onAnalyze={handleAnalyze}
          onGenerate={handleGenerate}
          onApprove={handleApprove}
        />
      )}

      {/* 批量进度 */}
      <BatchProgressModal
        isOpen={batchModalOpen}
        jobId={batchJobId}
        onClose={() => {
          setBatchModalOpen(false);
          setBatchJobId(null);
        }}
      />

      {/* 批量生成选择 */}
      {showBatchGenerate && (
        <BatchGenerateModal
          isOpen={showBatchGenerate}
          mode={batchMode}
          count={batchMode === 'all' ? total : selectedIds.size}
          onClose={() => setShowBatchGenerate(false)}
          onConfirm={handleBatchGenerate}
          loading={isBatchRunning}
        />
      )}
    </div>
  );
}