'use client';
import { useState } from 'react';
import { X, Link as LinkIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface UrlFileUploaderProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UrlFileUploader({ open, onClose, onUploadSuccess }: UrlFileUploaderProps) {
  const [urlInput, setUrlInput] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUrlUpload = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    setDownloading(true);
    setProgress(0);
    setResult(null);

    // 模拟下载进度（因为后端下载进度无法精确获取，这里用模拟递增）
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const res = await fetch('/api/admin/files/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '下载失败');
      }
      const data = await res.json();
      setResult({ success: true, message: `网络图片已保存：${data.displayName}` });
      onUploadSuccess();
      setTimeout(() => {
        onClose();
        setUrlInput('');
        setResult(null);
        setProgress(0);
      }, 2000);
    } catch (err: any) {
      clearInterval(progressInterval);
      setResult({ success: false, message: err.message });
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => onClose()}>
      <div className="bg-white rounded-lg p-6 w-[500px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">从网络地址添加图片</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="border rounded p-2 w-full mb-4"
          disabled={downloading}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
        />
        {downloading && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 size={14} className="animate-spin" />
              下载中 {progress}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded" disabled={downloading}>
            取消
          </button>
          <button
            onClick={handleUrlUpload}
            disabled={downloading || !urlInput.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-1"
          >
            {downloading && <Loader2 size={14} className="animate-spin" />}
            {downloading ? '下载中...' : '添加'}
          </button>
        </div>
        {result && (
          <div className={`mt-4 p-2 rounded flex items-center gap-2 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}