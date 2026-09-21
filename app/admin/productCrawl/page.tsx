// app/admin/productCrawl/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Trash2,
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Edit,
  FolderOpen
} from 'lucide-react';
import Toast from '@/components/Toast';
import dayjs from 'dayjs';
import CategorySelectModal from '@/app/admin/products/manage/components/CategorySelectModal';
import ImportResultModal from './components/ImportResultModal';
import type { ImportResponse } from '@/lib/productCrawl/types';

// ============================================================
// 类型定义
// ============================================================

interface CrawlProduct {
  crawler_id: string;
  site_id: string;
  locale: string;
  product_id: string;
  product_line_id?: string;
  category_id: string;
  series_id?: string;
  parent_product_id?: string;
  sku: string;
  product_name: string;
  brand?: string;
  price_tiers: any;
  currency: string;
  availability: string;
  min_order_quantity: number;
  main_image_url?: string;
  additional_images?: string[];
  description?: string;
  short_description?: string;
  attributes?: Record<string, string>;
  spec_text?: string;
  slug?: string;
  platform: string;
  source_url: string;
  source_product_id?: string;
  source_locale: string;
  collected_at: string;
  collected_by: string;
  import_status: 'pending' | 'imported' | 'skipped' | 'failed';
  imported_at?: string;
  import_error?: string;
  created_at: string;
  updated_at: string;
  sku_list?: any[];
}

interface ProductCrawlStats {
  pending: number;
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

// ============================================================
// 子组件
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '待导入' },
    imported: { bg: 'bg-green-100', text: 'text-green-700', label: '已导入' },
    skipped: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '已跳过' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: '导入失败' }
  };
  const s = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, string> = {
    alibaba: '阿里国际站',
    '1688': '1688',
    amazon: 'Amazon',
    ebay: 'eBay'
  };
  return <span>{config[platform] || platform}</span>;
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ============================================================
// 确认对话框
// ============================================================

function ConfirmDialog({
  open,
  title,
  content,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{content}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 分页组件
// ============================================================

function Pagination({
  current,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: {
  current: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-500">
        共 <span className="font-medium">{total}</span> 条
      </div>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value={10}>10条/页</option>
          <option value={20}>20条/页</option>
          <option value={50}>50条/页</option>
          <option value={100}>100条/页</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={current === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(current - 1)}
            disabled={current === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm px-3">
            {current} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(current + 1)}
            disabled={current === totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={current === totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function ProductCrawlPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CrawlProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ProductCrawlStats>({
    pending: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    total: 0
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => {}
  });

  // 分类选择相关状态
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingImportIds, setPendingImportIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // 导入结果相关状态
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // 🔥 异步任务相关状态
  const [importTaskId, setImportTaskId] = useState<string | null>(null);
  const [showImportProgress, setShowImportProgress] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState({
    status: 'all',
    keyword: '',
    platform: '',
    page: 1,
    pageSize: 20
  });

  // ============================================================
  // 数据加载
  // ============================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filters.status,
        page: String(filters.page),
        size: String(filters.pageSize),
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.platform && { platform: filters.platform })
      });

      const response = await fetch(`/api/admin/productCrawl?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '加载失败');
      }

      setData(result.items || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('加载数据失败:', error);
      setToast({ message: '加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/productCrawl/stats');
      const result = await response.json();
      if (response.ok) {
        setStats(result);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStats();
  }, [loadData, loadStats]);

  // ============================================================
  // 导入操作
  // ============================================================

  // 🔥 点击导入按钮：只允许 pending 状态的数据导入
  const handleImportClick = useCallback((crawlerIds?: string[]) => {
    const ids = crawlerIds || Array.from(selectedIds);
    // 过滤出 pending 状态的数据
    const pendingIds = data
      .filter(item => ids.includes(item.crawler_id) && item.import_status === 'pending')
      .map(item => item.crawler_id);

    if (pendingIds.length === 0) {
      setToast({ 
        message: '选中的数据中没有待导入的数据，请选择状态为"待导入"的数据', 
        type: 'warning' 
      });
      return;
    }

    setPendingImportIds(pendingIds);
    setShowCategoryModal(true);
  }, [selectedIds, data]);

  // 🔥 修改：分类选择回调 - 异步任务模式
  const handleCategorySelect = useCallback(async (categoryId: string, seriesId: string) => {
    setShowCategoryModal(false);
    setIsImporting(true);

    try {
      const response = await fetch('/api/admin/productCrawl/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crawlerIds: pendingImportIds,
          categoryId,
          seriesId,
          locale: 'zh',
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '导入失败');
      }

      // 🔥 获取 taskId，打开进度弹窗
      if (result.taskId) {
        setImportTaskId(result.taskId);
        setShowImportProgress(true);
      } else {
        // 兼容旧版本（同步模式）
        setImportResult(result);
        setShowResultModal(true);
      }
      
      setSelectedIds(new Set());
      setPendingImportIds([]);
      
    } catch (error) {
      console.error('导入失败:', error);
      setToast({
        message: '导入失败: ' + (error instanceof Error ? error.message : '未知错误'),
        type: 'error'
      });
    } finally {
      setIsImporting(false);
    }
  }, [pendingImportIds]);

  const handleCategoryModalClose = useCallback(() => {
    setShowCategoryModal(false);
    setPendingImportIds([]);
  }, []);

  // 同步模式结果弹窗关闭
  const handleResultModalClose = useCallback(() => {
    setShowResultModal(false);
    if (importResult && importResult.imported_count > 0) {
      loadData();
      loadStats();
    }
  }, [importResult, loadData, loadStats]);

  // 🔥 进度完成回调
  const handleImportComplete = useCallback(() => {
    loadData();
    loadStats();
    setImportTaskId(null);
    setShowImportProgress(false);
  }, [loadData, loadStats]);

  // 🔥 进度弹窗关闭
  const handleProgressClose = useCallback(() => {
    setShowImportProgress(false);
    setImportTaskId(null);
    loadData();
    loadStats();
  }, [loadData, loadStats]);

  // ============================================================
  // 删除操作
  // ============================================================

  const handleDelete = useCallback(async (crawlerIds?: string[]) => {
    const ids = crawlerIds || Array.from(selectedIds);
    if (ids.length === 0) {
      setToast({ message: '请选择要删除的数据', type: 'warning' });
      return;
    }

    setConfirmDialog({
      open: true,
      title: '确认删除',
      content: `确定要删除选中的 ${ids.length} 条采集数据吗？此操作不可恢复！`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        try {
          const response = await fetch('/api/admin/productCrawl', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crawlerIds: ids })
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || '删除失败');
          }

          setToast({ message: `成功删除 ${result.deleted_count || ids.length} 条数据`, type: 'success' });
          setSelectedIds(new Set());
          loadData();
          loadStats();
        } catch (error) {
          console.error('删除失败:', error);
          setToast({ message: '删除失败: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' });
        }
      }
    });
  }, [selectedIds, loadData, loadStats]);

  const handleEdit = (crawlerId: string) => {
    router.push(`/admin/productCrawl/edit/${crawlerId}`);
  };

  // ============================================================
  // 选择逻辑
  // ============================================================

  // 🔥 全选所有数据（不限状态）
  const handleSelectAll = () => {
    const allIds = data.map(item => item.crawler_id);
    if (selectedIds.size === allIds.length && allIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // ============================================================
  // 渲染
  // ============================================================

  // 🔥 判断选中数据的状态
  const selectedItems = data.filter(item => selectedIds.has(item.crawler_id));
  const hasPending = selectedItems.some(item => item.import_status === 'pending');

  const allIds = data.map(item => item.crawler_id);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />

      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard title="待导入" value={stats.pending} color="text-blue-600" />
        <StatCard title="已导入" value={stats.imported} color="text-green-600" />
        <StatCard title="已跳过" value={stats.skipped} color="text-yellow-600" />
        <StatCard title="导入失败" value={stats.failed} color="text-red-600" />
        <StatCard title="总计" value={stats.total} color="text-gray-700" />
      </div>

      {/* ===== 操作栏 ===== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* 状态筛选 */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">全部</option>
            <option value="pending">待导入</option>
            <option value="imported">已导入</option>
            <option value="skipped">已跳过</option>
            <option value="failed">导入失败</option>
          </select>

          {/* 平台筛选 */}
          <select
            value={filters.platform}
            onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value, page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部平台</option>
            <option value="alibaba">阿里国际站</option>
            <option value="1688">1688</option>
            <option value="amazon">Amazon</option>
            <option value="ebay">eBay</option>
          </select>

          {/* 搜索 */}
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
            <input
              type="text"
              placeholder="搜索商品名称或SKU..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value, page: 1 }))}
              className="px-3 py-2 text-sm outline-none w-48"
            />
            <button className="px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
              <Search className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1" />

          {/* 操作按钮 */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            onClick={() => handleImportClick()}
            disabled={!hasPending || isImporting}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasPending ? '请选择状态为"待导入"的数据' : ''}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderOpen className="w-4 h-4" />
            )}
            {isImporting ? '导入中...' : `选择分类导入 (${selectedIds.size})`}
          </button>

          <button
            onClick={() => handleDelete()}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            批量删除 ({selectedIds.size})
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            清空选择
          </button>
        </div>
      </div>

      {/* ===== 数据表格 ===== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>暂无采集数据</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">商品名称</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">品牌</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">平台</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">价格</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">采集时间</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.crawler_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.crawler_id)}
                          onChange={() => handleSelectRow(item.crawler_id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(item.crawler_id)}
                          className="text-blue-600 hover:underline text-left max-w-[200px] truncate"
                        >
                          {item.product_name}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-3">{item.brand || '-'}</td>
                      <td className="px-4 py-3"><PlatformBadge platform={item.platform} /></td>
                      <td className="px-4 py-3">
                        {item.price_tiers?.[0]?.price ? `${item.price_tiers[0].currency || 'USD'} ${item.price_tiers[0].price}` : '-'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={item.import_status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {dayjs(item.collected_at).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item.crawler_id)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {/* 🔥 所有状态都显示删除按钮，不再只显示 pending */}
                          <button
                            onClick={() => handleDelete([item.crawler_id])}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="px-4 py-3 border-t border-gray-200">
              <Pagination
                current={filters.page}
                pageSize={filters.pageSize}
                total={total}
                onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                onPageSizeChange={(size) => setFilters(prev => ({ ...prev, pageSize: size, page: 1 }))}
              />
            </div>
          </>
        )}
      </div>

      {/* ===== 分类选择弹窗 ===== */}
      {showCategoryModal && (
        <CategorySelectModal
          locale="zh"
          onSelect={handleCategorySelect}
          onClose={handleCategoryModalClose}
          confirmText="导入"
        />
      )}

      {/* ===== 导入结果弹窗（同步模式兼容） ===== */}
      <ImportResultModal
        open={showResultModal}
        result={importResult}
        onClose={handleResultModalClose}
      />

      {/* ===== 导入进度弹窗（异步任务模式） ===== */}
      {showImportProgress && importTaskId && (
        <ImportResultModal
          open={showImportProgress}
          taskId={importTaskId}
          onClose={handleProgressClose}
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
}