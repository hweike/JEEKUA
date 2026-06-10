'use client';

import { useState } from 'react';
import { X, Upload } from 'lucide-react';

export default function ImportProductsJsonModal({ locale, onClose, onSuccess }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.json')) {
        setError('请上传 JSON 文件（.json）');
        setFile(null);
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过 10MB');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请选择 JSON 文件');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('locale', locale);

    try {
      const res = await fetch('/api/admin/products/importProducts-json', {
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
      setError('网络错误，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">批量导入产品 (JSON)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="mb-4 text-sm text-gray-500">
          <p>请选择 JSON 文件，格式参考产品导出结构。</p>
          <p className="text-xs mt-1">支持最大 10MB，文件扩展名 .json</p>
        </div>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="mb-4 w-full text-sm border rounded p-2"
        />
        {file && (
          <p className="text-xs text-green-600 mb-2">已选择：{file.name}</p>
        )}
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50 transition"
            disabled={uploading}
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                导入中...
              </>
            ) : (
              <>
                <Upload size={16} />
                开始导入
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}