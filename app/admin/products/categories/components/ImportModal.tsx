'use client';

import { useState, useRef } from 'react';

interface ImportModalProps {
  locale: string;
  onClose: () => void;
  onSuccess: () => void;          // 原有回调，用于刷新数据
  onImportResult?: (message: string, type: 'success' | 'error' | 'warning') => void; // 新增：传递提示信息给父页面
}

export default function ImportModal({ locale, onClose, onSuccess, onImportResult }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 根据 locale 显示站点名称
  const siteName = locale === 'zh' ? '中文' : '英文';

  const handleImport = async () => {
    if (!file) {
      if (onImportResult) onImportResult('请选择文件', 'error');
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
        // 导入成功（可能有部分跳过）
        let message = result.message || '导入完成';
        let type: 'success' | 'error' | 'warning' = 'success';
        if (result.errors && result.errors.length > 0) {
          type = 'warning';
          // 错误详情只显示前3条避免过长
          const errorDetails = result.errors.slice(0, 3).join('；');
          message = `${result.message}${errorDetails ? `（${errorDetails}）` : ''}`;
          if (result.errors.length > 3) message += `等${result.errors.length}条错误`;
        } else if (result.successCount === 0 && result.skipCount > 0) {
          type = 'warning';
        }
        if (onImportResult) onImportResult(message, type);
        onSuccess();   // 刷新列表
        onClose();     // 关闭模态框
      } else {
        if (onImportResult) onImportResult(`导入失败：${result.error || '未知错误'}`, 'error');
      }
    } catch (err) {
      if (onImportResult) onImportResult('网络错误，导入失败', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">导入产品分类</h2>

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