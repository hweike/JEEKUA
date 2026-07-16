'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Toast from '@/components/common/Toast';
import { getSiteSettings } from '@/lib/getSiteSettings';

interface SitemapStatus {
  locale: string;
  status: 'pending' | 'completed' | 'failed';
  totalPages: number;
  generated: number;
  lastRun?: string;
  error?: string;
}

export default function SitemapAdmin() {
  const [statuses, setStatuses] = useState<SitemapStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [lastRun, setLastRun] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 加载站点设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSiteSettings();
        const url = (settings.websiteUrl || '').replace(/\/+$/, '');
        setBaseUrl(url);
      } catch (err) {
        console.error('加载站点设置失败:', err);
      }
    };
    loadSettings();
  }, []);

  // 加载状态
  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/discovery/sitemap/status');
      if (!res.ok) throw new Error('加载状态失败');
      const data = await res.json();
      setStatuses(data);
      // 提取最后一次生成时间（从第一个有 lastRun 的记录获取）
      const latest = data.find((s: SitemapStatus) => s.lastRun);
      if (latest) {
        setLastRun(latest.lastRun || null);
      }
    } catch (err) {
      console.error(err);
      setToast({ message: '加载状态失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // 生成站点地图
  const generateSitemap = async () => {
    if (generating) return;

    if (!confirm('确定要重新生成站点地图吗？这将覆盖现有的 Sitemap 文件。')) return;

    setGenerating(true);
    setToast(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/discovery/sitemap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        // 无需 body
      });

      if (!response.ok) {
        throw new Error(`API 返回错误: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              // 更新进度（简单提示）
              if (data.message) {
                setToast({ message: data.message, type: 'info' });
              }
            } else if (data.type === 'complete') {
              setToast({ message: '✅ 站点地图生成成功！', type: 'success' });
              await loadStatus(); // 刷新状态
            } else if (data.type === 'error') {
              setToast({ message: `❌ ${data.message}`, type: 'error' });
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setToast({ message: '生成已取消', type: 'info' });
      } else {
        setToast({ message: `生成失败: ${error.message}`, type: 'error' });
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const cancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setGenerating(false);
      setToast({ message: '正在取消...', type: 'info' });
    }
  };

  const isCompleted = statuses.some((s) => s.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 头部 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-600" />
          站点地图管理
        </h1>
        <p className="text-gray-600 text-sm mt-1">管理多语言 Sitemap（所有语言集成在同一个 Sitemap 中）</p>
      </div>

      {/* 主操作卡片 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">生成站点地图</h2>
            <p className="text-sm text-gray-500">
              点击生成将重新生成站点地图，自动包含所有语言的 <code className="bg-gray-100 px-1 rounded">hreflang</code> 标签
            </p>
            {lastRun && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                上次生成：{new Date(lastRun).toLocaleString()}
              </p>
            )}
            {baseUrl && (
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Sitemap 地址：
                <a
                  href={`${baseUrl}/sitemap/sitemap-index.xml`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800"
                >
                  {baseUrl}/sitemap/sitemap-index.xml
                </a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {generating ? (
              <>
                <button
                  onClick={cancelGenerate}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  取消生成
                </button>
                <span className="text-sm text-blue-600 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </span>
              </>
            ) : (
              <button
                onClick={generateSitemap}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                生成站点地图
              </button>
            )}
            <button
              onClick={loadStatus}
              disabled={loading || generating}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 状态汇总 */}
        {!loading && statuses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">状态：</span>
              {isCompleted ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  已生成（包含 {statuses.length} 个语言版本）
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  待生成
                </span>
              )}
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">总页面：{statuses.reduce((sum, s) => sum + s.totalPages, 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 详细状态列表（可选） */}
      {!loading && statuses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">语言版本状态</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {statuses.map((item) => (
              <div key={item.locale} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800">{item.locale}</span>
                  <span className="text-sm text-gray-500">{item.totalPages} 页</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'completed' ? (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      已生成
                    </span>
                  ) : (
                    <span className="text-yellow-600 text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      待生成
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && statuses.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>暂无站点地图数据</p>
          <p className="text-sm">请点击「生成站点地图」创建</p>
        </div>
      )}
    </div>
  );
}