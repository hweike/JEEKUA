'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

// =====================================================
// 类型定义
// =====================================================

interface BatchJobProgress {
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

interface BatchProgressModalProps {
  isOpen: boolean;
  jobId: string | null;
  onClose: () => void;
}

// =====================================================
// 主组件
// =====================================================

export function BatchProgressModal({ isOpen, jobId, onClose }: BatchProgressModalProps) {
  const [progress, setProgress] = useState<BatchJobProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchProgress = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/discovery/seo/batch/status/${jobId}`);
      if (!res.ok) throw new Error('获取进度失败');
      const json = await res.json();
      setProgress(json.data);
    } catch (error) {
      console.error('获取批量进度失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 开始轮询
  useEffect(() => {
    if (!isOpen || !jobId) return;

    fetchProgress();

    // 每 2 秒轮询一次
    const interval = setInterval(() => {
      fetchProgress();
    }, 2000);

    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, jobId]);

  // 当任务完成时停止轮询
  useEffect(() => {
    if (progress && (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled')) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [progress?.status]);

  // 清理
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  if (!isOpen) return null;

  // 计算进度
  const completed = progress?.completed || 0;
  const failed = progress?.failed || 0;
  const total = progress?.total || 0;
  const processed = completed + failed;
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中...';
      case 'running':
        return '执行中...';
      case 'completed':
        return '已完成 ✓';
      case 'failed':
        return '执行失败 ✗';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {progress?.status === 'running' ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : progress?.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : progress?.status === 'failed' ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Clock className="w-5 h-5 text-gray-500" />
            )}
            批量任务进度
            {progress && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                {getStatusText(progress.status)}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 进度条 */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>进度</span>
              <span>{processed} / {total} ({percent}%)</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress?.status === 'failed' ? 'bg-red-500' :
                  progress?.status === 'completed' ? 'bg-green-500' :
                  'bg-blue-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* 统计 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-700">{total}</div>
              <div className="text-xs text-gray-500">总数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{completed}</div>
              <div className="text-xs text-green-500">成功</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{failed}</div>
              <div className="text-xs text-red-500">失败</div>
            </div>
          </div>

          {/* 展开/收缩按钮 */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">明细</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? '收起' : '展开'}
            </button>
          </div>

          {/* 明细列表 */}
          {expanded && (
            <div className="border rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500 text-sm">加载中...</span>
                </div>
              ) : progress?.details?.length ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {progress.details.map((item, index) => (
                    <div key={index} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">
                          {item.pageId}
                        </span>
                        {item.locale && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.locale}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${
                            item.status === 'success' ? 'text-green-600' :
                            item.status === 'failed' ? 'text-red-600' :
                            item.status === 'processing' ? 'text-blue-600' :
                            'text-gray-400'
                          }`}
                        >
                          {item.status === 'success' && '✓ 成功'}
                          {item.status === 'failed' && '✗ 失败'}
                          {item.status === 'processing' && '处理中...'}
                          {item.status === 'pending' && '等待中'}
                        </span>
                        {item.error && (
                          <span
                            className="text-xs text-red-500 cursor-help"
                            title={item.error}
                          >
                            <AlertCircle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  暂无明细数据
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex justify-end p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}