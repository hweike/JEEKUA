'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import SeoFields from '@/components/common/SeoFields';
import ImageUpload from '@/components/ImageUpload';
import VideoUrlModal from './VideoUrlModal';
import VideoPreviewModal from './VideoPreviewModal';
import ResourceAssociation from '@/components/admin/products/ResourceAssociation';
import { VideoIcon } from 'lucide-react';

// 动态导入富文本编辑器，禁用 SSR
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface Category {
  key: string;
  name: string;
}

interface VideoFormProps {
  mode: 'new' | 'edit';
  locale: string;
  initialData?: any;
  videoId?: string;
}

export default function VideoForm({ mode, locale, initialData, videoId }: VideoFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // 表单状态
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sourceType, setSourceType] = useState<'youtube' | 'vimeo' | 'bilibili'>('youtube');
  const [videoIdState, setVideoIdState] = useState('');
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isDurationAuto, setIsDurationAuto] = useState(false);
  const [content, setContent] = useState('');
  const [visible, setVisible] = useState<boolean>(true);
  const [thumbnail, setThumbnail] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [flagged, setFlagged] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);

  // SEO 状态
  const [slug, setSlug] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // 当前视频 ID（用于关联商品）
  const currentVideoId = mode === 'edit' ? videoId : null;

  // 加载分类
  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(`/api/admin/videosys-categories?locale=${locale}`);
      const data = await res.json();
      const items = Object.entries(data).map(([key, cat]: [string, any]) => ({
        key,
        name: cat.name,
      }));
      setCategories(items);
    };
    fetchCategories();
  }, [locale]);

  // 编辑模式回填
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title ?? '');
      setVideoUrl(initialData.video_url ?? '');
      setSourceType(initialData.source_type ?? 'youtube');
      setVideoIdState(initialData.video_id ?? '');
      const totalSec = initialData.duration ?? 0;
      setDurationHours(Math.floor(totalSec / 3600));
      setDurationMinutes(Math.floor((totalSec % 3600) / 60));
      setDurationSeconds(totalSec % 60);
      setIsDurationAuto(!!initialData.duration && initialData.duration > 0);
      setContent(initialData.content ?? '');
      setVisible(initialData.visible === 1);
      setThumbnail(initialData.thumbnail ?? '');
      setCategoryKey(initialData.category_key ?? '');
      setFlagged(initialData.flagged === 1);
      setSlug(initialData.slug ?? '');
      setSeoKeywords(initialData.seo_keywords ?? '');
      setSeoTitle(initialData.seo_title ?? '');
      setSeoDescription(initialData.seo_description ?? '');
      // 处理 tags（存储为 JSON 字符串）
      if (initialData.tags) {
        try {
          setTags(JSON.parse(initialData.tags));
        } catch {
          setTags([]);
        }
      } else {
        setTags([]);
      }
    } else {
      resetForm();
    }
  }, [mode, initialData]);

  const resetForm = () => {
    setTitle('');
    setVideoUrl('');
    setSourceType('youtube');
    setVideoIdState('');
    setDurationHours(0);
    setDurationMinutes(0);
    setDurationSeconds(0);
    setIsDurationAuto(false);
    setContent('');
    setVisible(true);
    setThumbnail('');
    setCategoryKey('');
    setFlagged(false);
    setSlug('');
    setSeoKeywords('');
    setSeoTitle('');
    setSeoDescription('');
    setTags([]);
    setTagInput('');
  };

  // 通过后端 API 获取视频信息
  const fetchVideoInfo = async (url: string) => {
    const res = await fetch('/api/video-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      setSourceType(data.source);
      setVideoIdState(data.videoId);
      setVideoUrl(url);
      if (data.duration !== null && data.duration > 0) {
        const totalSec = data.duration;
        setDurationHours(Math.floor(totalSec / 3600));
        setDurationMinutes(Math.floor((totalSec % 3600) / 60));
        setDurationSeconds(totalSec % 60);
        setIsDurationAuto(true);
      } else {
        setDurationHours(0);
        setDurationMinutes(0);
        setDurationSeconds(0);
        setIsDurationAuto(false);
        alert('未能自动获取视频时长，请手动填写');
      }
      if (data.thumbnail && !thumbnail) {
        setThumbnail(data.thumbnail);
      }
      return true;
    } else {
      const error = await res.json();
      alert(error.error || '获取视频信息失败');
      return false;
    }
  };

  const handleVideoUrlConfirm = async (url: string) => {
    const success = await fetchVideoInfo(url);
    if (success) {
      setErrors((prev) => ({ ...prev, videoId: '' }));
    }
  };

  const handleSeoChange = (seoData: any) => {
    if (seoData.slug !== undefined) setSlug(seoData.slug);
    if (seoData.seoKeywords !== undefined) setSeoKeywords(seoData.seoKeywords);
    if (seoData.seoTitle !== undefined) setSeoTitle(seoData.seoTitle);
    if (seoData.seoDescription !== undefined) setSeoDescription(seoData.seoDescription);
  };

  // 处理标签输入
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = '标题不能为空';
    if (!slug.trim()) newErrors.slug = 'URL Slug 不能为空';
    if (!categoryKey) newErrors.category = '请选择分类';
    if (!videoIdState) newErrors.videoId = '请先添加有效的视频源';
    if (!isDurationAuto && (durationHours === 0 && durationMinutes === 0 && durationSeconds === 0)) {
      newErrors.duration = '请填写视频时长';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const totalSeconds = durationHours * 3600 + durationMinutes * 60 + durationSeconds;
    const videoData: any = {
      title: title.trim(),
      slug: slug.trim(),
      video_url: videoUrl,
      source_type: sourceType,
      video_id: videoIdState,
      duration: totalSeconds,
      content,
      seo_keywords: seoKeywords,
      seo_title: seoTitle,
      seo_description: seoDescription,
      visible: visible ? 1 : 0,
      thumbnail,
      category_key: categoryKey,
      flagged: flagged ? 1 : 0,
      template: '',
      tags: JSON.stringify(tags), // 存储为 JSON 数组字符串
    };
    if (mode === 'edit' && videoId) videoData.id = videoId;
    const res = await fetch('/api/admin/videosys-videos', {
      method: mode === 'new' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, ...videoData }),
    });
    if (res.ok) {
      router.push(`/admin/videosys/videos?locale=${locale}`);
    } else {
      const { error } = await res.json();
      alert(error || '保存失败');
    }
    setSaving(false);
  };

  const titleText = mode === 'new' ? `发布视频 (站点: ${locale})` : `编辑视频 (站点: ${locale})`;
  const hasValidVideo = !!videoIdState;

  const getDisplayThumbnail = (url: string) => {
    if (!url) return '';
    if (url.startsWith('/uploads') || url.includes('localhost')) return url;
    if (url.startsWith('http')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return url;
  };
  const displayThumbnail = getDisplayThumbnail(thumbnail);

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{titleText}</h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="flex gap-6">
          {/* 左侧 65% */}
          <div className="w-2/3 space-y-6">
            {/* 基本信息卡片 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">基本信息</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">标题 *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                {/* 视频源卡片 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium mb-2">视频源 *</label>
                  <div className="flex gap-4 items-start">
                    <div
                      className={`w-32 h-24 bg-white rounded border overflow-hidden relative cursor-pointer ${
                        hasValidVideo ? 'group' : ''
                      }`}
                      onClick={() => hasValidVideo && setIsPreviewModalOpen(true)}
                    >
                      {thumbnail && hasValidVideo ? (
                        <img
                          src={displayThumbnail}
                          alt="视频封面"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
                          }}
                        />
                      ) : hasValidVideo ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <VideoIcon className="w-8 h-8 text-gray-500" />
                          <p className="text-xs mt-1 capitalize">{sourceType}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <VideoIcon className="w-8 h-8" />
                          <p className="text-xs mt-1">未添加</p>
                        </div>
                      )}
                      {hasValidVideo && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center">
                          <span className="text-white text-xs opacity-0 group-hover:opacity-100">点击播放</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsUrlModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                      >
                        网络视频
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        支持 YouTube、Vimeo、Bilibili
                      </p>
                      {videoIdState && (
                        <p className="text-xs text-green-600 mt-1">
                          已识别：{sourceType} - {videoIdState}
                        </p>
                      )}
                    </div>
                  </div>
                  {errors.videoId && <p className="text-red-500 text-xs mt-2">{errors.videoId}</p>}
                </div>

                {/* 时长 */}
                <div>
                  <label className="block text-sm font-medium">时长</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={durationHours}
                      onChange={(e) => {
                        if (!isDurationAuto) setDurationHours(Number(e.target.value));
                      }}
                      disabled={isDurationAuto}
                      className={`w-24 border p-2 rounded ${isDurationAuto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="时"
                    />
                    <span>时</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationMinutes}
                      onChange={(e) => {
                        if (!isDurationAuto) setDurationMinutes(Number(e.target.value));
                      }}
                      disabled={isDurationAuto}
                      className={`w-24 border p-2 rounded ${isDurationAuto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="分"
                    />
                    <span>分</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationSeconds}
                      onChange={(e) => {
                        if (!isDurationAuto) setDurationSeconds(Number(e.target.value));
                      }}
                      disabled={isDurationAuto}
                      className={`w-24 border p-2 rounded ${isDurationAuto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="秒"
                    />
                    <span>秒</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isDurationAuto ? '自动获取，不可编辑' : '请手动填写视频时长'}
                  </p>
                  {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
                </div>

                {/* 视频介绍：富文本编辑器 */}
                <div>
                  <label className="block text-sm font-medium">视频介绍 *</label>
                  <RichTextEditor
                    key={mode === 'edit' ? videoId : 'new'}   // 视频 ID 变化时重建编辑器
                    value={content}
                    onChange={(val) => setContent(val)}
                  /> 
                </div>
              </div>
            </div>

            {/* 相关商品卡片 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">相关商品</h2>
              {currentVideoId ? (
                <ResourceAssociation
                  resourceType="video"
                  resourceId={currentVideoId}
                  locale={locale}
                />
              ) : (
                <div className="text-gray-400 text-sm text-center py-4 border border-dashed rounded">
                  保存视频后即可关联商品
                </div>
              )}
            </div>

            {/* SEO 卡片 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">搜索引擎优化</h2>
              <SeoFields
                slug={slug}
                seoKeywords={seoKeywords}
                seoTitle={seoTitle}
                seoDescription={seoDescription}
                onChange={handleSeoChange}
                autoGenerateFrom={title}
                showSlug
                showKeywords
                showTitle
                showDescription
              />
              {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
            </div>
          </div>

          {/* 右侧 30% */}
          <div className="w-1/3 space-y-6">
            {/* 可见性 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">可见性</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="visible" checked={visible} onChange={() => setVisible(true)} /> 可见
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="visible" checked={!visible} onChange={() => setVisible(false)} /> 隐藏
                </label>
              </div>
            </div>

            {/* 视频封面 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">视频封面</h2>
              <ImageUpload
                value={displayThumbnail}
                onChange={(url) => setThumbnail(url)}
                maxCount={1}
                label=""
                hint="支持上传本地图片或输入网络图片地址"
              />
            </div>

            {/* 分类、标记卡片 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">视频分类 & 标记</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">视频分类 *</label>
                  <select
                    value={categoryKey}
                    onChange={(e) => setCategoryKey(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                  >
                    <option value="">请选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                </div>

                {/* 标记（tags） */}
                <div>
                  <label className="block text-sm font-medium mb-1">标记</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-sm group hover:bg-red-50 transition"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-gray-400 hover:text-red-600 focus:outline-none"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="输入标签后按回车添加"
                    className="w-full border rounded p-2"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} /> 标记为推荐/精选
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 悬浮按钮条 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded transition"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50 transition"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 模态框 */}
      <VideoUrlModal isOpen={isUrlModalOpen} onClose={() => setIsUrlModalOpen(false)} onConfirm={handleVideoUrlConfirm} />
      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        source={sourceType}
        videoId={videoIdState}
        title={title}
      />
    </div>
  );
}