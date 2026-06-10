'use client';

import { useState, useEffect } from 'react';
import { Loader2, Download, TreeDeciduous, Package, AlertCircle } from 'lucide-react';

interface TaskStatus {
  taskId: string;
  status: string;
  categories?: any[];
  products?: any[];
  latestProducts?: any[];
  progress?: string;
  error?: string;
}

export default function CrawlerAdmin() {
  const [rules, setRules] = useState<{ id: string; name: string }[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [logContent, setLogContent] = useState('');

  useEffect(() => {
    fetch('/api/crawler/rule')
      .then(res => res.json())
      .then(data => {
        setRules(data);
        if (data.length > 0 && !selectedRule) {
          setSelectedRule(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/crawler/status?taskId=${taskId}`);
      const data = await res.json();
      setTaskStatus(data);
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [taskId]);

  // 轮询日志
  useEffect(() => {
    if (!taskId) return;
    const logInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/crawler/log?taskId=${taskId}`);
        const data = await res.json();
        setLogContent(data.log || '');
        const logDiv = document.getElementById('crawler-log');
        if (logDiv) logDiv.scrollTop = logDiv.scrollHeight;
      } catch (e) {
        console.error('获取日志失败', e);
      }
    }, 2000);
    return () => clearInterval(logInterval);
  }, [taskId]);

  const startCrawl = async () => {
    if (!selectedRule) return;
    setLoading(true);
    setTaskStatus(null);
    setLogContent('');
    try {
      const res = await fetch('/api/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: selectedRule }),
      });
      // 检查响应状态
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`服务器错误 (${res.status}): ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      if (!data || !data.taskId) {
        throw new Error('响应缺少 taskId 字段');
      }
      setTaskId(data.taskId);
    } catch (err: any) {
      console.error('启动爬取失败:', err);
      alert(`启动失败: ${err.message}`);
      setLoading(false);
    }
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">通用爬取管理后台</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择爬取规则</label>
              <select
                value={selectedRule}
                onChange={(e) => setSelectedRule(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {rules.map(rule => (
                  <option key={rule.id} value={rule.id}>{rule.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={startCrawl}
              disabled={loading || !selectedRule}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              开始爬取
            </button>
          </div>

          {taskStatus && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  taskStatus.status === 'completed' ? 'bg-green-500' :
                  taskStatus.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                }`} />
                <span className="font-medium">状态: {taskStatus.status}</span>
                {taskStatus.progress && <span className="text-gray-500">- {taskStatus.progress}</span>}
              </div>

              {taskStatus.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  {taskStatus.error}
                </div>
              )}

              {taskStatus.categories && taskStatus.categories.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <TreeDeciduous className="w-5 h-5" /> 分类树 ({taskStatus.categories.length})
                    </h2>
                    <button
                      onClick={() => downloadJSON(taskStatus.categories, 'categories.json')}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> 下载 JSON
                    </button>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-md max-h-64 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(taskStatus.categories, null, 2)}</pre>
                  </div>
                </div>
              )}

              {taskStatus.products && taskStatus.products.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" /> 产品列表 ({taskStatus.products.length})
                    </h2>
                    <button
                      onClick={() => downloadJSON(taskStatus.products, 'products.json')}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> 下载 JSON
                    </button>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-md max-h-96 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(taskStatus.products.slice(0, 20), null, 2)}</pre>
                    {taskStatus.products.length > 20 && <p className="text-gray-500 mt-2">... 仅显示前20条</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 实时日志区域 */}
        {taskId && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">📋 实时日志(任务ID: {taskId})</h2>
            <div
              id="crawler-log"
              className="bg-gray-900 text-green-400 p-4 rounded-md h-64 overflow-auto font-mono text-xs"
            >
              {logContent.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {!logContent && <div className="text-gray-500">等待日志输出...</div>}
            </div>
          </div>
        )}

        {/* 最新产品预览区域 */}
        {taskStatus?.latestProducts && taskStatus.latestProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">🆕 最新抓取产品（最近5条）</h2>
            <div className="space-y-2">
              {taskStatus.latestProducts.map((prod, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded">
                  <p className="font-medium">{prod.parent_product_name || prod.model || prod.name}</p>
                  <p className="text-sm text-gray-600 truncate">分类: {prod.categoryName}</p>
                  <p className="text-xs text-gray-400">
                    抓取时间: {new Date(prod.crawledAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}