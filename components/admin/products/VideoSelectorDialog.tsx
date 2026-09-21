'use client';

import { useState, useEffect } from 'react';
import { X, Search, VideoIcon } from 'lucide-react';

interface Category {
  key: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration?: number;
}

interface VideoSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedVideoIds: string[]) => void;
  maxSelection?: number;
  initialSelectedIds?: string[];
  locale: string;
}

export default function VideoSelectorDialog({
  open,
  onClose,
  onConfirm,
  maxSelection = 10,
  initialSelectedIds = [],
  locale,
}: VideoSelectorDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchTerm, setSearchTerm] = useState('');

  // 加载分类树
  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(`/api/admin/videosys-categories?locale=${locale}`);
      const data = await res.json();
      const items = Object.entries(data).map(([key, cat]: [string, any]) => ({
        key,
        name: cat.name,
      }));
      setCategories(items);
      if (items.length > 0 && !selectedCategory) {
        setSelectedCategory(items[0].key);
      }
    };
    fetchCategories();
  }, [locale]);

  // 加载视频列表
  useEffect(() => {
    if (!selectedCategory) return;
    const fetchVideos = async () => {
      setLoading(true);
      const url = `/api/admin/videosys-videos?locale=${locale}&category=${selectedCategory}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      setVideos(data.items || []);
      setLoading(false);
    };
    fetchVideos();
  }, [selectedCategory, locale]);

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (videoId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      }
      if (prev.length >= maxSelection) {
        alert(`最多选择 ${maxSelection} 个视频`);
        return prev;
      }
      return [...prev, videoId];
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="text-base font-semibold">选择视频</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex h-[420px]">
          {/* 左侧分类 */}
          <div className="w-48 border-r p-3 overflow-y-auto flex-shrink-0">
            <h3 className="font-medium text-sm mb-2">视频分类</h3>
            <ul className="space-y-1">
              {categories.map(cat => (
                <li
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded cursor-pointer text-sm ${
                    selectedCategory === cat.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </li>
              ))}
            </ul>
          </div>

          {/* 右侧视频列表 */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索视频..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">加载中...</div>
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">暂无视频</div>
              ) : (
                <div className="space-y-2">
                  {filteredVideos.map(video => (
                    <div
                      key={video.id}
                      onClick={() => toggleSelect(video.id)}
                      className={`border rounded-lg p-2 cursor-pointer transition flex items-center gap-3 ${
                        selectedIds.includes(video.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-400'
                      }`}
                    >
                      {video.thumbnail ? (
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(video.thumbnail)}`}
                          alt={video.title}
                          className="w-16 h-12 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <VideoIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-2">{video.title}</div>
                        {video.duration && (
                          <div className="text-xs text-gray-500 mt-0.5">{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button onClick={onClose} className="px-4 py-1.5 border rounded hover:bg-gray-50 text-sm">
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            确定（已选 {selectedIds.length}/{maxSelection}）
          </button>
        </div>
      </div>
    </div>
  );
}