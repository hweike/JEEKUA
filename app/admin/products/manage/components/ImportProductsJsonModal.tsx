'use client';

import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ImportResult {
  success: boolean;
  productId?: string;
  error?: string;
}

interface Props {
  locale: string;
  onClose: () => void;
  onSuccess: () => void; // 导入成功后刷新列表
}

export default function ImportProductsJsonModal({ locale, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResults([]);
      setErrorMsg(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setErrorMsg('请先选择 JSON 文件');
      return;
    }

    setImporting(true);
    setErrorMsg(null);
    setResults([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('locale', locale);

    try {
      const res = await fetch('/api/admin/products/importProducts-json', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '导入失败');
      }

      setResults(data.results || []);
      setTotalItems(data.results?.length || 0);

      if (data.failCount === 0) {
        // 全部成功，延迟后关闭并刷新
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '网络错误，请重试');
    } finally {
      setImporting(false);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  const handleReset = () => {
    setFile(null);
    setResults([]);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">导入产品（JSON 格式）</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 文件选择 */}
          <div className="space-y-2">
            <label className="block font-medium">选择 JSON 文件</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="text-sm text-gray-600">
                已选择: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* 导入按钮 & 进度条区域 */}
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {importing ? '导入中...' : '开始导入'}
              </button>
              {(results.length > 0 || errorMsg) && (
                <button
                  onClick={handleReset}
                  disabled={importing}
                  className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
                >
                  重置
                </button>
              )}
            </div>

            {/* 模拟进度条：导入时显示动画条 */}
            {importing && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded flex items-center gap-2">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* 导入结果表格 */}
          {results.length > 0 && (
            <div>
              <div className="mb-3 flex gap-4 text-sm">
                <span className="text-green-600">✅ 成功: {successCount}</span>
                <span className="text-red-600">❌ 失败: {failCount}</span>
                <span className="text-gray-500">总计: {totalItems}</span>
              </div>
              <div className="border rounded overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">产品/系列</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">结果 / 错误</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {results.map((res, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            {res.success ? (
                              <CheckCircle className="text-green-600" size={16} />
                            ) : (
                              <XCircle className="text-red-600" size={16} />
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {res.productId ? (
                              <span className="font-mono text-xs">{res.productId}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {res.success ? (
                              <span className="text-green-600">导入成功</span>
                            ) : (
                              <span className="text-red-600">{res.error || '未知错误'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!importing && results.length === 0 && !errorMsg && (
            <div className="text-center text-gray-400 py-8">
              请选择 JSON 文件后点击“开始导入”
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}