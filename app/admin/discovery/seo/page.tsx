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
import LanguageSelector from '@/components/common/LanguageSelector';

// =====================================================
// 主组件
// =====================================================

export default function SEOManagementPage() {
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
    category,
    setCategory,
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
  
  // ✅ 两个按钮独立状态
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isBatchAllRunning, setIsBatchAllRunning] = useState(false);
  
  const [showBatchGenerate, setShowBatchGenerate] = useState(false);
  const [batchMode, setBatchMode] = useState<'selected' | 'all'>('selected');

  // 标签定义
  const tabs = [
    { key: 'product', label: '产品' },
    { key: 'blog', label: '博客' },
    { key: 'doc', label: '文档' },
    { key: 'video', label: '视频' },
    { key: 'page', label: '页面' },
  ];
  const currentTab = tabs.some(t => t.key === category) ? category : tabs[0]?.key || 'product';

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

  // ========== 批量生成（选中项） ==========
  const handleBatchGenerate = async (fields: { title: boolean; description: boolean; keywords: boolean }) => {
    // ✅ 使用选中的页面 ID（当前页的选中项）
    const targetIds = Array.from(selectedIds);
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
      await runBatchProcess(targetIds);
      await loadPages();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量生成失败');
    } finally {
      setIsBatchRunning(false);
    }
  };

  // ========== 一键全部生成（当前语言下所有页面） ==========
  const handleBatchGenerateAll = async (fields: { title: boolean; description: boolean; keywords: boolean }) => {
    // ✅ 获取当前语言下的所有页面 ID（调用 API 获取全部，不只是当前页）
    setIsBatchAllRunning(true);
    setError(null);
    setShowBatchGenerate(false);

    try {
      // 获取所有页面 ID（不分页）
      const allPageIds = await fetchAllPageIds(selectedLocale);
      
      if (allPageIds.length === 0) {
        setError('当前语言下没有页面');
        setIsBatchAllRunning(false);
        return;
      }

      const fieldNames: string[] = [];
      if (fields.title) fieldNames.push('SEO 标题');
      if (fields.description) fieldNames.push('SEO 描述');
      if (fields.keywords) fieldNames.push('SEO 关键词');

      if (!confirm(
        `⚠️ 一键全部生成将覆盖当前语言（${selectedLocale}）下所有页面的 SEO 信息（${fieldNames.join('、')}），可能对页面的搜索引擎排名产生影响，请谨慎操作！\n\n` +
        `将对 ${allPageIds.length} 个页面执行：分析 → AI 生成 → 确认发布（一气呵成）\n\n` +
        `确定要继续吗？`
      )) {
        setIsBatchAllRunning(false);
        return;
      }

      await runBatchProcess(allPageIds);
      await loadPages();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '一键全部生成失败');
    } finally {
      setIsBatchAllRunning(false);
    }
  };

  /**
   * 获取当前语言下的所有页面 ID
   */
  const fetchAllPageIds = async (locale: string): Promise<string[]> => {
    let allIds: string[] = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          locale: locale,
          status: 'all',
          type: '',
          keyword: '',
        });
        const res = await fetch(`/api/discovery/seo/pages?${params.toString()}`);
        if (!res.ok) break;
        const json = await res.json();
        const ids = (json.data || []).map((item: any) => item.id);
        allIds = allIds.concat(ids);
        if (ids.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (err) {
        console.error('获取页面列表失败:', err);
        hasMore = false;
      }
    }

    return allIds;
  };

  /**
   * 执行批量处理流程
   */
  const runBatchProcess = async (targetIds: string[]) => {
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
      let approved = 0, failed = 0;
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
    } catch (err) {
      throw err;
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

  // ========== 标签切换 ==========
  const handleTabClick = (tabKey: string) => {
    setCategory(tabKey);
    handleTypeChange('all');
  };

  // ========== 打开批量生成弹窗 ==========
  const openBatchGenerate = (mode: 'selected' | 'all') => {
    if (mode === 'selected' && selectedIds.size === 0) {
      setError('请先选择要生成的页面');
      return;
    }
    setBatchMode(mode);
    setShowBatchGenerate(true);
  };

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
          <div className="flex items-center gap-2">
            <LanguageSelector
              currentLocale={selectedLocale}
              onLocaleChange={handleLocaleChange}
              displayMode="zh"
            />
            <button
              onClick={() => loadPages()}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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

        {/* 标签栏 */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="页面类型标签">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    currentTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 筛选栏 */}
        <SEOFilterBar
          filterStatus={filterStatus}
          onStatusChange={handleStatusChange}
          filterType={filterType}
          typeOptions={typeOptions}
          onTypeChange={handleTypeChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
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
          onConfirm={batchMode === 'all' ? handleBatchGenerateAll : handleBatchGenerate}
          loading={batchMode === 'all' ? isBatchAllRunning : isBatchRunning}
        />
      )}

      {/* 底部悬浮条 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-700">
            已选择 <span className="font-semibold">{selectedIds.size}</span> 个页面
            <span className="ml-2 text-gray-400">（共 {total} 个）</span>
          </span>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 border rounded hover:bg-gray-50 transition text-gray-700"
            >
              取消选择
            </button>
            <button
              onClick={() => openBatchGenerate('selected')}
              disabled={isBatchRunning || isBatchAllRunning || selectedIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isBatchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              批量生成（{selectedIds.size}）
            </button>
            <button
              onClick={() => openBatchGenerate('all')}
              disabled={isBatchRunning || isBatchAllRunning || total === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isBatchAllRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              一键全部生成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}