'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function ImportModal({ locale, onClose, onSuccess }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 根据 locale 显示站点名称
  const siteName = locale === 'zh' ? '中文' : '英文';

  const handleImport = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('locale', locale);

    try {
      const res = await fetch('/api/admin/products/categories/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message || '导入成功');
        onSuccess();
        onClose();
      } else {
        alert('导入失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      alert('导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">导入产品分类</h2>

        {/* 1. 当前导入站点提示 */}
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
          {/* 2. 下载模板 + 填写说明链接（新开页面） */}
          <p className="text-sm text-gray-500 mt-2 flex gap-3">
            <a
              href="/api/admin/download-template?file=产品分类导入模板.xlsx"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              下载模板
            </a>
            <span>|</span>
            <a
              href="/admin/help/data-import/category-import"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              📖 填写说明
            </a>
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded" disabled={importing}>
            取消
          </button>
          <button
            onClick={handleImport}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={importing}
          >
            {importing ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
}