// components/ImageUpload.tsx
'use client';

import { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Image, Loader2, Plus } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import ImageLibraryPicker from '@/components/files/ImageLibraryPicker';

function getDisplayImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/api/proxy-image')) {
    return url;
  }
  return getImageUrl(url);
}

interface ImageUploaderProps {
  value: string | string[];
  onChange: (url: string | string[]) => void;
  maxCount?: number;
  label?: string;
  hint?: string;
  className?: string;
  previewAspectRatio?: '1:1' | '16:9';
  referenceType?: string;
  referenceId?: number;
  // ✅ 新增：账单模式 - 简化UI，只显示小图 + 点击上传
  billMode?: boolean;
  // ✅ 新增：是否显示上传按钮（billMode为true时默认隐藏）
  showUploadButtons?: boolean;
}

export default function ImageUploader({
  value,
  onChange,
  maxCount = 9,
  label = '图片',
  hint,
  className = '',
  previewAspectRatio = '1:1',
  referenceType,
  referenceId,
  billMode = false,
  showUploadButtons = true,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isArrayMode = Array.isArray(value);
  const imageList = isArrayMode ? value : (value ? [value] : []);

  const updateImages = (newList: string[]) => {
    if (isArrayMode) {
      onChange(newList);
    } else {
      onChange(newList[0] || '');
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    if (referenceType) formData.append('referenceType', referenceType);
    if (referenceId !== undefined) formData.append('referenceId', String(referenceId));

    const res = await fetch('/api/images', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('上传失败');
    const data = await res.json();
    return data.url;
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // ✅ billMode 模式下，如果已有图片则替换（单图模式）
    if (billMode) {
      // 账单模式只支持单图
      setUploading(true);
      setErrorMsg(null);
      try {
        const url = await uploadFile(files[0]);
        updateImages([url]);
      } catch (err) {
        setErrorMsg('图片上传失败，请重试');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    // 普通模式：多图上传
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
      const body: any = { url: trimmedUrl };
      if (referenceType) body.referenceType = referenceType;
      if (referenceId !== undefined) body.referenceId = referenceId;

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const handleLibrarySelect = (urls: string[]) => {
    if (isArrayMode) {
      const currentUrls = Array.isArray(value) ? value : [];
      const newUrls = urls.filter(url => !currentUrls.includes(url));
      if (currentUrls.length + newUrls.length > maxCount) {
        alert(`最多只能上传 ${maxCount} 张图片`);
        return;
      }
      updateImages([...currentUrls, ...newUrls]);
    } else {
      updateImages([urls[0]]);
    }
    setShowLibrary(false);
  };

  // ============================================================
  // ✅ 账单模式渲染 - 只显示图片 + 点击上传
  // ============================================================
  if (billMode) {
    const hasImage = imageList.length > 0;
    const imageUrl = hasImage ? imageList[0] : '';

    return (
      <div className={className}>
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLocalUpload}
          className="hidden"
        />

        {hasImage ? (
          // 有图片：显示图片 + hover 显示更换/删除按钮
          <div className="relative group inline-block">
            <img
              src={getDisplayImageUrl(imageUrl)}
              alt="商品图片"
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-white text-xs bg-white/20 hover:bg-white/40 rounded px-2 py-0.5 transition"
                title="更换图片"
              >
                <Upload size={12} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(0);
                }}
                className="text-white text-xs bg-white/20 hover:bg-white/40 rounded px-2 py-0.5 transition"
                title="删除图片"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          // 无图片：显示上传占位
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : (
              <Plus size={16} className="text-gray-400" />
            )}
          </div>
        )}

        {errorMsg && <p className="text-xs text-red-500 mt-1">{errorMsg}</p>}
      </div>
    );
  }

  // ============================================================
  // 普通模式渲染（原有逻辑保持不变）
  // ============================================================
  return (
    <div className={className}>
      {label && <label className="block font-medium mb-1">{label}</label>}

      <div className="flex flex-wrap gap-3 mb-3">
        {imageList.map((url, idx) => (
          <div
            key={idx}
            className="relative border rounded overflow-hidden bg-gray-50 group"
            style={{ width: '150px', height: 'auto' }}
          >
            <img
              src={getDisplayImageUrl(url)}
              alt={`preview-${idx}`}
              className="w-full h-auto object-contain"
            />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {imageList.length < maxCount && (
          <div
            className="border border-dashed rounded bg-gray-50 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition"
            style={{ width: '150px', height: '150px' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} />
            <span className="text-xs mt-1">点击上传</span>
          </div>
        )}
      </div>

      {showUploadButtons && (
        <div className="flex gap-2 flex-wrap">
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
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
          >
            <Image size={14} /> 图片库
          </button>
        </div>
      )}

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

      {/* 图片库选择器 */}
      {showLibrary && (
        <ImageLibraryPicker
          open={showLibrary}
          onClose={() => setShowLibrary(false)}
          onSelect={handleLibrarySelect}
          mode={isArrayMode ? 'multiple' : 'single'}
          maxSelect={isArrayMode ? maxCount - imageList.length : 1}
          initialSelected={imageList}
        />
      )}
    </div>
  );
}