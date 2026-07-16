'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

interface MigrationResult {
  url: string;
  success: boolean;
  newUrl?: string;
  error?: string;
  isExisting?: boolean;
  displayName?: string;
}

export default function ImageMigrationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        let urlList: string[] = [];
        if (Array.isArray(parsed)) {
          urlList = parsed;
        } else if (parsed.urls && Array.isArray(parsed.urls)) {
          urlList = parsed.urls;
        } else {
          alert('JSON 格式错误，需要包含 urls 数组或直接为数组');
          return;
        }
        setUrls(urlList);
        setResults([]);
        setCurrentIndex(0);
        alert(`成功读取 ${urlList.length} 个图片链接`);
      } catch (err) {
        alert('解析 JSON 失败');
      }
    };
    reader.readAsText(selectedFile);
  };

  const processSingleUrl = async (url: string): Promise<MigrationResult> => {
    try {
      const res = await fetch('/api/admin/files/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '处理失败');
      return {
        url,
        success: true,
        newUrl: data.url,
        isExisting: data.isExisting,
        displayName: data.displayName,
      };
    } catch (err: any) {
      return {
        url,
        success: false,
        error: err.message,
      };
    }
  };

  const startMigration = async () => {
    if (urls.length === 0) {
      alert('请先上传包含图片链接的 JSON 文件');
      return;
    }
    setRunning(true);
    setResults([]);
    setCurrentIndex(0);

    const resultsArray: MigrationResult[] = new Array(urls.length);
    let nextIndex = 0;

    const runTask = async () => {
      const idx = nextIndex++;
      if (idx >= urls.length) return;
      setCurrentIndex(idx + 1);
      const result = await processSingleUrl(urls[idx]);
      resultsArray[idx] = result;
      setResults([...resultsArray]);
      await runTask();
    };

    const workers = Array(Math.min(concurrency, urls.length))
      .fill(null)
      .map(() => runTask());

    await Promise.all(workers);
    setRunning(false);
  };

  const reset = () => {
    setFile(null);
    setUrls([]);
    setResults([]);
    setCurrentIndex(0);
  };

  const successCount = results.filter(r => r?.success).length;
  const failCount = results.filter(r => r && !r.success).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">产品图片搬家工具</h1>

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-medium">使用说明</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>上传包含图片 URL 列表的 JSON 文件（数组格式 或 {"{ urls: [...] }"}）</li>
              <li>工具会自动下载图片并上传到服务器，返回新地址</li>
              <li>新文件名会自动从 URL 中提取，便于后续与产品关联</li>
              <li>支持批量处理，可设置并发数控制速度</li>
              <li>已存在的图片（哈希相同）不会重复上传，仅记录引用</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <label className="block font-medium mb-2">1. 上传 JSON 文件 (图片 URL 列表)</label>
          <input type="file" accept=".json" onChange={handleFileChange} disabled={running} />
          {file && <p className="text-sm text-gray-500 mt-1">已选择: {file.name}</p>}
          {urls.length > 0 && (
            <p className="text-sm text-green-600 mt-1">已加载 {urls.length} 个图片链接</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-2">2. 并发数 (建议 3~5，避免过载)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className="border rounded px-3 py-1 w-24"
            disabled={running}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={startMigration}
            disabled={running || urls.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? `迁移中 ${currentIndex}/${urls.length}` : '开始迁移'}
          </button>
          <button
            onClick={reset}
            disabled={running}
            className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
          >
            重置
          </button>
        </div>

        {(successCount > 0 || failCount > 0) && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p>✅ 成功: {successCount} &nbsp;|&nbsp; ❌ 失败: {failCount}</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">原地址</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">新文件名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">结果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((res, idx) => {
                  // 跳过尚未完成的任务（undefined 元素）
                  if (!res) return null;
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-2">
                        {res.success ? (
                          <CheckCircle className="text-green-600" size={16} />
                        ) : (
                          <XCircle className="text-red-600" size={16} />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm break-all max-w-xs truncate">{res.url}</td>
                      <td className="px-4 py-2 text-sm">{res.displayName || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {res.success ? (
                          <div>
                            <a href={res.newUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              查看图片
                            </a>
                            {res.isExisting && <span className="ml-2 text-xs text-gray-500">(已存在)</span>}
                          </div>
                        ) : (
                          <span className="text-red-600">{res.error}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}