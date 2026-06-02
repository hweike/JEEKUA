'use client';

import { useState, useRef } from 'react';
import { getLanguageDisplayName } from '@/lib/languages/config';

export default function ImportProductsModal({ locale, onClose, onSuccess }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 动态获取当前语言的中文名称
  const siteName = getLanguageDisplayName(locale, 'zh');

  const handleUpload = async () => {
    if (!file) {
      setError('请选择文件');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('locale', locale);

    try {
      const res = await fetch('/api/admin/products/importProducts', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || '导入失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">批量导入产品</h2>

        {/* 当前导入站点提示 */}
        <div className="mb-4 text-sm text-gray-700 bg-blue-50 p-2 rounded">
          当前导入站点：<strong>{siteName}</strong>
        </div>

        <div className="mb-4">
          <label className="block mb-1">选择 Excel 文件</label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            ref={fileInputRef}
            className="border rounded w-full p-2"
          />
          {/* 下载模板 + 填写说明链接 */}
          <p className="text-sm text-gray-500 mt-2 flex gap-3">
            <a
              href="/api/admin/download-template?file=产品导入模板.xlsx"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              下载模板
            </a>
            <span>|</span>
            <a
              href="/admin/help/data-import/product-import"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              📖 填写说明
            </a>
          </p>
        </div>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded" disabled={uploading}>
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {uploading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
}