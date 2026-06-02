'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Plus, Search, Video as VideoIcon, X } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import VideoPlayer from '@/components/videosys-front/VideoPlayer';

interface Video {
  id: string;
  title: string;
  category_key: string;
  thumbnail: string;
  published_at: string;
  source_type: 'youtube' | 'vimeo' | 'bilibili';
  video_id: string;
  visible?: number;
}

interface Category {
  key: string;
  name: string;
}

export default function VideosList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [playingVideo, setPlayingVideo] = useState<{ title: string; source: string; videoId: string } | null>(null);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    const res = await fetch(`/api/admin/videosys-categories?locale=${locale}`);
    const data = await res.json();
    const items = Object.entries(data).map(([key, cat]: [string, any]) => ({
      key,
      name: cat.name,
    }));
    setCategories(items);
  }, [locale]);

  // 加载视频列表
  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        locale,
        limit: '50',
      });
      if (searchTitle) params.append('title', searchTitle);
      if (selectedCategory) params.append('category', selectedCategory);
      const res = await fetch(`/api/admin/videosys-videos?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVideos(data.items || []);
    } catch (err) {
      showToast('加载视频失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [locale, searchTitle, selectedCategory, showToast]);

  useEffect(() => {
    loadCategories();
    loadVideos();
  }, [loadCategories, loadVideos, locale]);

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    router.push(`/admin/videosys/videos?locale=${newLocale}`);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除视频“${title}”吗？`)) return;
    try {
      const res = await fetch(`/api/admin/videosys-videos?locale=${locale}&id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('删除成功', 'success');
        loadVideos();
      } else {
        const data = await res.json();
        showToast(data.error || '删除失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    }
  };

  const getCategoryName = (key: string) => {
    const cat = categories.find(c => c.key === key);
    return cat ? cat.name : key;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  };

  const handleSearch = () => {
    loadVideos();
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">视频管理</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
          <Link
            href={`/admin/videosys/videos/new?locale=${locale}`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 发布视频
          </Link>
        </div>
      </div>

      {/* 搜索栏 - 样式已调整 */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        className="mb-6 flex flex-wrap items-center gap-3"
      >
        <input
          type="text"
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          placeholder="按标题搜索..."
          className="border rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部分类</option>
          {categories.map(cat => (
            <option key={cat.key} value={cat.key}>{cat.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-1 transition"
        >
          <Search className="w-4 h-4" /> 搜索
        </button>
      </form>

      {/* 视频列表表格 */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无视频，请点击“发布视频”创建</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">缩略图</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发布时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {videos.map((video) => (
                <tr key={video.id}>
                  <td className="px-6 py-4">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-16 h-12 object-cover rounded"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <VideoIcon className="w-16 h-12 text-gray-300" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setPlayingVideo({
                        title: video.title,
                        source: video.source_type,
                        videoId: video.video_id,
                      })}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium"
                    >
                      {video.title}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm">{getCategoryName(video.category_key)}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(video.published_at)}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/admin/videosys/videos/${video.id}/edit?locale=${locale}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Pencil className="w-4 h-4 inline" /> 编辑
                    </Link>
                    <button onClick={() => handleDelete(video.id, video.title)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4 inline" /> 删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 播放视频模态框 */}
      {playingVideo && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{playingVideo.title}</h3>
              <button onClick={() => setPlayingVideo(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video">
              <VideoPlayer
                source={playingVideo.source as any}
                videoId={playingVideo.videoId}
                title={playingVideo.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}