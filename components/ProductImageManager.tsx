'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, Link as LinkIcon, GripVertical, Loader2 } from 'lucide-react';

interface ProductImageManagerProps {
  mainImage: string;
  additionalImages: string[];
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
}

export default function ProductImageManager({
  mainImage,
  additionalImages,
  onMainImageChange,
  onAdditionalImagesChange,
}: ProductImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);  // 新增：网络图片下载中状态
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlList, setUrlList] = useState('');
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);  // 新增：错误提示
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allImages = useCallback(() => {
    const rawImages = [mainImage, ...additionalImages].filter(url => url && url.trim() !== '');
    const seen = new Set<string>();
    return rawImages.filter(url => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [mainImage, additionalImages])();

  const maxImages = 9;

  const updateImages = useCallback((newImages: string[]) => {
    const newMain = newImages[0] || '';
    const newAdditional = newImages.slice(1);
    onMainImageChange(newMain);
    onAdditionalImagesChange(newAdditional);
  }, [onMainImageChange, onAdditionalImagesChange]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('上传失败');
    const data = await res.json();
    return data.url;
  };

  // 下载单张网络图片到服务器
  const downloadNetworkImage = async (url: string): Promise<string> => {
    const res = await fetch('/api/download-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '下载失败');
    }
    const data = await res.json();
    return data.url; // 本地路径，如 '/uploads/xxx.jpg'
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remainingSlots = maxImages - allImages.length;
    const toUpload = files.slice(0, remainingSlots);
    if (toUpload.length === 0) {
      setErrorMsg(`最多只能上传 ${maxImages} 张图片`);
      return;
    }
    setUploading(true);
    setErrorMsg(null);
    try {
      const uploadedUrls = await Promise.all(toUpload.map(uploadFile));
      const newImages = [...allImages, ...uploadedUrls].slice(0, maxImages);
      updateImages(newImages);
    } catch (err) {
      setErrorMsg('上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 修改：网络图片添加，先下载再保存
  const handleAddNetworkImages = async () => {
    const urls = urlList.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;
    const remainingSlots = maxImages - allImages.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`最多只能添加 ${maxImages} 张图片`);
      return;
    }
    const toAdd = urls.slice(0, remainingSlots);
    
    setDownloading(true);
    setErrorMsg(null);
    const downloadedUrls: string[] = [];
    const failedUrls: string[] = [];

    // 依次下载（避免并发过大，也可以改为 Promise.all，但建议串行以减轻服务器压力）
    for (const url of toAdd) {
      try {
        const localUrl = await downloadNetworkImage(url);
        if (localUrl) {
          downloadedUrls.push(localUrl);
        } else {
          failedUrls.push(url);
        }
      } catch (err: any) {
        console.error(`下载失败 ${url}:`, err);
        failedUrls.push(url);
      }
    }

    setDownloading(false);

    if (downloadedUrls.length === 0) {
      setErrorMsg('所有网络图片下载失败，请检查URL是否有效');
      return;
    }

    if (failedUrls.length > 0) {
      setErrorMsg(`成功添加 ${downloadedUrls.length} 张，失败 ${failedUrls.length} 张（请检查URL）`);
    }

    const newImages = [...allImages, ...downloadedUrls].slice(0, maxImages);
    updateImages(newImages);
    setUrlList('');
    setShowUrlModal(false);
  };

  const removeImage = (index: number) => {
    const newImages = allImages.filter((_, i) => i !== index);
    updateImages(newImages);
  };

  const handleDragStart = (index: number) => {
    setDragSrcIndex(index);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (targetIndex: number) => {
    if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
    const newImages = [...allImages];
    const [removed] = newImages.splice(dragSrcIndex, 1);
    newImages.splice(targetIndex, 0, removed);
    updateImages(newImages);
    setDragSrcIndex(null);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || downloading}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleLocalUpload}
          className="hidden"
        />
        {(uploading || downloading) && (
          <span className="text-sm text-gray-500">
            {uploading ? '上传中...' : '下载网络图片中...'}
          </span>
        )}
      </div>
      {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}

      <div className="grid grid-cols-3 gap-3">
        {allImages.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            className="relative aspect-square border rounded overflow-hidden bg-gray-50 group cursor-move"
          >
            <img
              src={url}
              alt={`产品图${idx + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.png';
                e.currentTarget.onerror = null;
              }}
            />
            {idx === 0 && (
              <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">主图</div>
            )}
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute bottom-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
            <div className="absolute top-1 right-1 text-gray-500">
              <GripVertical size={16} />
            </div>
          </div>
        ))}
        {allImages.length < maxImages && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400"
          >
            <Upload size={24} />
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        最多 {maxImages} 张图片，第一张为主图。拖动图片可调整顺序，点击图片右下角删除。
      </p>

      {showUrlModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => !downloading && setShowUrlModal(false)}
        >
          <div className="bg-white rounded-lg p-6 w-[600px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">从网络地址添加图片</h3>
            <textarea
              value={urlList}
              onChange={(e) => setUrlList(e.target.value)}
              rows={6}
              className="border rounded p-2 w-full mb-4"
              placeholder="请填写图片URL地址，多个地址用回车换行"
              disabled={downloading}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
                disabled={downloading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddNetworkImages}
                disabled={downloading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-1"
              >
                {downloading && <Loader2 size={14} className="animate-spin" />}
                {downloading ? '下载中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}