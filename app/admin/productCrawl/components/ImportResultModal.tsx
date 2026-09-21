// app/admin/productCrawl/components/ImportResultModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, SkipForward, Loader2, Package, RefreshCw } from 'lucide-react';

interface ImportResultItem {
  crawler_id: string;
  sku: string;
  source_url: string;
  status: 'success' | 'skipped' | 'failed' | 'processing';
  product_id?: string;
  message: string;
}

interface ImportProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  current: number;
  currentProduct?: string;
  currentVariant?: string;
  message: string;
  results?: ImportResultItem[];
  startedAt: string;
  updatedAt: string;
}

interface ImportResultModalProps {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onComplete?: () => void;
}

export default function ImportResultModal({ open, taskId, onClose, onComplete }: ImportResultModalProps) {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 轮询获取进度
  useEffect(() => {
    if (!open || !taskId) {
      setProgress(null);
      setLoading(true);
      return;
    }

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;
    let isCompleted = false;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/admin/productCrawl/import/progress?taskId=${taskId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('任务不存在或已过期');
            setLoading(false);
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!isMounted) return;
        
        setProgress(data);
        setLoading(false);
        setError(null);

        // 🔥 检查是否完成
        if (data.status === 'completed' || data.status === 'failed') {
          isCompleted = true;
          if (onComplete) {
            setTimeout(onComplete, 1000);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('获取进度失败:', err);
        setError(err instanceof Error ? err.message : '获取进度失败');
        setLoading(false);
      }
    };

    // 立即获取一次
    fetchProgress();

    // 如果已完成，不轮询
    if (isCompleted) {
      return () => { isMounted = false; };
    }

    // 每 1.5 秒轮询一次
    pollInterval = setInterval(fetchProgress, 1500);

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [open, taskId, onComplete]);

  // 计算统计
  const getStats = () => {
    if (!progress?.results) {
      return { imported: 0, skipped: 0, failed: 0, processing: 0 };
    }
    
    return {
      imported: progress.results.filter(r => r.status === 'success').length,
      skipped: progress.results.filter(r => r.status === 'skipped').length,
      failed: progress.results.filter(r => r.status === 'failed').length,
      processing: progress.results.filter(r => r.status === 'processing').length,
    };
  };

  const stats = getStats();
  const isProcessing = progress?.status === 'pending' || progress?.status === 'processing';
  const isCompleted = progress?.status === 'completed' || progress?.status === 'failed';
  const percent = progress?.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[750px] max-w-[90vw] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            📊 导入进度
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`p-1 rounded hover:bg-gray-100 transition-colors text-gray-500 ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-500">加载进度...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              重新加载
            </button>
          </div>
        ) : (
          <>
            {/* 进度条 */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {isProcessing ? '导入中...' : progress?.status === 'failed' ? '导入失败' : '导入完成'}
                </span>
                <span className="text-sm text-gray-500">
                  {progress?.current || 0} / {progress?.total || 0} ({percent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    progress?.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {progress?.message || '准备中...'}
              </div>
              {progress?.currentProduct && (
                <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  当前产品: {progress.currentProduct}
                  {progress.currentVariant && (
                    <span className="text-gray-400"> → 变体: {progress.currentVariant}</span>
                  )}
                </div>
              )}
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-100">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{stats.imported}</div>
                <div className="text-xs text-green-700">成功导入</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">{stats.skipped}</div>
                <div className="text-xs text-yellow-700">已跳过</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-xs text-red-700">失败</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{stats.processing}</div>
                <div className="text-xs text-blue-700">处理中</div>
              </div>
            </div>

            {/* 结果列表（只显示已完成的） */}
            <div className="flex-1 overflow-auto p-4">
              {progress?.results && progress.results.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 text-xs font-medium">状态</th>
                        <th className="px-3 py-2 text-left text-gray-600 text-xs font-medium">SKU</th>
                        <th className="px-3 py-2 text-left text-gray-600 text-xs font-medium">信息</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {progress.results.map((item, index) => {
                        const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
                          success: { icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-600', label: '成功' },
                          skipped: { icon: <SkipForward className="w-4 h-4 text-yellow-500" />, color: 'text-yellow-600', label: '跳过' },
                          failed: { icon: <AlertCircle className="w-4 h-4 text-red-500" />, color: 'text-red-600', label: '失败' },
                          processing: { icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />, color: 'text-blue-600', label: '处理中' },
                        };
                        const config = statusConfig[item.status] || statusConfig.processing;
                        return (
                          <tr key={item.crawler_id || index} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {config.icon}
                                <span className={config.color}>{config.label}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.sku || '-'}</td>
                            <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                              {item.message || '-'}
                              {item.product_id && item.status === 'success' && (
                                <span className="ml-1 text-gray-400">(ID: {item.product_id})</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end p-4 border-t border-gray-200">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  正在导入，请勿关闭窗口...
                </div>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  确认
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}