'use client';

import { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  value: string | string[];               // 兼容字符串和数组
  onChange: (url: string | string[]) => void;
  maxCount?: number;
  label?: string;
  hint?: string;
  className?: string;
  previewAspectRatio?: '1:1' | '16:9';
}

export default function ImageUploader({
  value,
  onChange,
  maxCount = 9,
  label = '图片',
  hint,
  className = '',
  previewAspectRatio = '1:1',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass = previewAspectRatio === '16:9' ? 'aspect-video' : 'aspect-square';

  // 统一转为数组便于渲染
  const isArrayMode = Array.isArray(value);
  const imageList = isArrayMode ? value : (value ? [value] : []);

  // 更新数据时，根据原始模式决定返回类型
  const updateImages = (newList: string[]) => {
    if (isArrayMode) {
      onChange(newList);
    } else {
      // 单图模式：最多保留第一张
      onChange(newList[0] || '');
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('上传失败');
    const data = await res.json();
    return data.url;
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imageList.length + files.length > maxCount) {
      setErrorMsg(`最多只能上传 ${maxCount} 张图片，当前已有 ${imageList.length} 张`);
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFile(files[i]);
        newUrls.push(url);
      }
      updateImages([...imageList, ...newUrls]);
    } catch (err) {
      setErrorMsg('部分图片上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddNetworkImage = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    if (imageList.length >= maxCount) {
      setErrorMsg(`最多只能添加 ${maxCount} 张图片`);
      return;
    }

    setDownloading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/download-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '下载失败');
      }
      const data = await res.json();
      updateImages([...imageList, data.url]);
      setUrlInput('');
      setShowUrlModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || '网络图片添加失败，请检查URL');
    } finally {
      setDownloading(false);
    }
  };

  const removeImage = (index: number) => {
    const newList = [...imageList];
    newList.splice(index, 1);
    updateImages(newList);
  };

  return (
    <div className={className}>
      {label && <label className="block font-medium mb-1">{label}</label>}

      {/* 多图预览网格（单图模式下同样适用） */}
      <div className="flex flex-wrap gap-3 mb-3">
        {imageList.map((url, idx) => (
          <div key={idx} className={`relative w-32 ${aspectClass} border rounded overflow-hidden bg-gray-50 group`}>
            <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* 添加图片占位符（未超过最大数量时显示） */}
        {imageList.length < maxCount && (
          <div
            className={`w-32 ${aspectClass} border border-dashed rounded bg-gray-50 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} />
            <span className="text-xs mt-1">点击上传</span>
          </div>
        )}
      </div>

      {/* 操作按钮组 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          本地图片
        </button>
        <button
          type="button"
          onClick={() => setShowUrlModal(true)}
          disabled={downloading}
          className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm flex items-center gap-1 disabled:opacity-50"
        >
          <LinkIcon size={14} /> 网络图片
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleLocalUpload}
        className="hidden"
      />

      {uploading && <p className="text-xs text-gray-500 mt-1">上传中...</p>}
      {downloading && <p className="text-xs text-gray-500 mt-1">正在下载图片到服务器...</p>}
      {errorMsg && <p className="text-xs text-red-500 mt-1">{errorMsg}</p>}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}

      {/* 网络图片模态框 */}
      {showUrlModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUrlModal(false)}
        >
          <div className="bg-white rounded-lg p-6 w-[500px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">从网络地址添加图片</h3>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="border rounded p-2 w-full mb-4"
              disabled={downloading}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddNetworkImage()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUrlModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
                disabled={downloading}
              >
                取消
              </button>
              <button
                onClick={handleAddNetworkImage}
                disabled={downloading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-1"
              >
                {downloading && <Loader2 size={14} className="animate-spin" />}
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}