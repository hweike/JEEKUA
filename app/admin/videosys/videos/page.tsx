'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import { getLanguageDisplayName } from '@/lib/languages/config';
import AiHelperVideoModal from './components/AiHelperVideoModal';

interface Video {
  id: string;
  title: string;
  category_key: string;
  thumbnail: string;
  published_at: string;
  source_type: 'youtube' | 'vimeo' | 'bilibili';
  video_id: string;
  visible?: number;
  locale: string;
}

interface VideoGroup {
  id: string;
  versions: Record<string, Video | null>;
}

export default function VideosList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, Video[]>>({});
  const [groups, setGroups] = useState<VideoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<{ key: string; name: string }[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);

  const initialLoadRef = useRef(false);

  // 获取所有启用的语言
  const fetchAvailableLocales = useCallback(async () => {
    try {
      const res = await fetch('/api/languages/enabled');
      const data = await res.json();
      let locales: string[] = [];
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'string') {
          locales = data;
        } else {
          locales = data.map((item: any) => item.code || item);
        }
      } else if (data && Array.isArray(data.locales)) {
        locales = data.locales;
      }
      setAvailableLocales(locales.length > 0 ? locales : ['zh', 'en']);
    } catch (error) {
      console.error('获取语言列表失败:', error);
      setAvailableLocales(['zh', 'en']);
    }
  }, []);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/videosys-categories?locale=${locale}`);
      const data = await res.json();
      const items = Object.entries(data).map(([key, cat]: [string, any]) => ({
        key,
        name: cat.name,
      }));
      setCategories(items);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }, [locale]);

  // 加载所有语言的视频数据
  const loadAllVideos = useCallback(async () => {
    if (availableLocales.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/videosys-videos?locales=${availableLocales.join(',')}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      const cleaned: Record<string, Video[]> = {};
      Object.keys(data).forEach(loc => {
        cleaned[loc] = Array.isArray(data[loc]) ? data[loc] : [];
      });
      setAllData(cleaned);
    } catch (error) {
      showToast('加载视频失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [availableLocales, showToast]);

  // 初始化
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchAvailableLocales();
    }
  }, [fetchAvailableLocales]);

  useEffect(() => {
    if (locale) {
      loadCategories();
    }
  }, [locale, loadCategories]);

  useEffect(() => {
    if (availableLocales.length > 0) {
      loadAllVideos();
    }
  }, [availableLocales]);

  // 聚合分组
  useEffect(() => {
    const allLocaleCodes = Array.from(new Set([
      ...availableLocales,
      ...Object.keys(allData)
    ]));

    const idMap: Record<string, VideoGroup> = {};

    allLocaleCodes.forEach((loc) => {
      const list = allData[loc] || [];
      list.forEach((video) => {
        if (!idMap[video.id]) {
          idMap[video.id] = { id: video.id, versions: {} };
          allLocaleCodes.forEach((l) => { idMap[video.id].versions[l] = null; });
        }
        idMap[video.id].versions[loc] = video;
      });
    });

    const groupsArray = Object.values(idMap);
    groupsArray.sort((a, b) => {
      const titleA = a.versions[locale]?.title || '';
      const titleB = b.versions[locale]?.title || '';
      if (!titleA && !titleB) return 0;
      if (!titleA) return 1;
      if (!titleB) return -1;
      return titleA.localeCompare(titleB);
    });
    setGroups(groupsArray);
  }, [allData, availableLocales, locale]);

  const getCurrentVideo = (group: VideoGroup): Video | null => {
    return group.versions[locale] || null;
  };

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && current.title.toLowerCase().includes(lower);
      });
    }
    if (selectedCategory) {
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && current.category_key === selectedCategory;
      });
    }
    return result;
  }, [groups, searchTerm, selectedCategory, locale]);

  const currentLocaleVideos = useMemo(() => {
    return allData[locale] || [];
  }, [allData, locale]);

  const filteredSimple = useMemo(() => {
    let result = currentLocaleVideos;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(v => v.title.toLowerCase().includes(lower));
    }
    if (selectedCategory) {
      result = result.filter(v => v.category_key === selectedCategory);
    }
    return result;
  }, [currentLocaleVideos, searchTerm, selectedCategory]);

  const handleDelete = async (id: string, locale: string, title: string) => {
    if (!confirm(`确定删除视频“${title}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/videosys-videos?locale=${locale}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      showToast('删除成功', 'success');
      await loadAllVideos();
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    router.push(`/admin/videosys/videos?locale=${newLocale}`);
  };

  const isCollapsibleMode = locale === 'zh' || locale === 'en';

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

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
            <Plus size={18} /> 发布视频
          </Link>
        </div>
      </div>

      {/* 搜索与分类筛选 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜索当前语言视频标题..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
        <button className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-1">
          <Search size={16} /> 搜索
        </button>
      </div>

      {/* 表格 - 使用 table-fixed 控制宽度 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[50%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                标题
              </th>
              <th className="w-[17%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                分类
              </th>
              <th className="w-[13%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                发布时间
              </th>
              <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isCollapsibleMode ? (
              filteredGroups.map((group) => {
                const current = getCurrentVideo(group);
                const isExpanded = expandedIds.has(group.id);
                const hasChildren = Object.values(group.versions).some(v => v !== null);
                const otherLocales = Array.from(new Set([...availableLocales, ...Object.keys(allData)])).filter(loc => loc !== locale);

                return (
                  <React.Fragment key={group.id}>
                    {/* 父行 */}
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(group.id)}
                    >
                      <td className="px-6 py-4 w-[50%] min-w-0 overflow-hidden">
                        <div className="flex items-center min-w-0">
                          {hasChildren && (
                            <button className="mr-2 flex-shrink-0 focus:outline-none">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span
                            className="font-medium text-gray-900 truncate"
                            title={current?.title || ''}
                          >
                            {current?.title || `${getLanguageDisplayName(locale, 'zh')}（未设置）`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 truncate">
                        {current ? getCategoryName(current.category_key) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate">
                        {current ? formatDate(current.published_at) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {current ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {(locale === 'zh' || locale === 'en') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVideo({ id: group.id, title: current.title });
                                  setShowAiHelper(true);
                                }}
                                className="text-purple-600 hover:text-purple-800 whitespace-nowrap"
                              >
                                🤖 AI翻译
                              </button>
                            )}
                            <Link
                              href={`/admin/videosys/videos/${group.id}/edit?locale=${locale}`}
                              className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil size={16} className="inline" /> 编辑
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(group.id, locale, current.title); }}
                              className="text-red-600 hover:text-red-800 whitespace-nowrap"
                            >
                              <Trash2 size={16} className="inline" /> 删除
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/admin/videosys/videos/new?locale=${locale}&id=${group.id}`}
                            className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus size={16} className="inline" /> 新增
                          </Link>
                        )}
                      </td>
                    </tr>

                    {/* 子行 */}
                    {isExpanded &&
                      otherLocales.map((loc) => {
                        const video = group.versions[loc] || null;
                        const exists = video !== null;
                        const isZhOrEn = loc === 'zh' || loc === 'en';

                        return (
                          <tr key={`${group.id}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-3 pl-12 w-[50%] min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-16 flex-shrink-0">
                                  {getLanguageDisplayName(loc, 'zh')}
                                </span>
                                <span
                                  className={`text-sm ${exists ? 'text-gray-900' : 'text-gray-400'} truncate`}
                                  title={exists ? video.title : ''}
                                >
                                  {exists ? video.title : '（未设置）'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-700 truncate">
                              {exists ? getCategoryName(video.category_key) : '-'}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500 truncate">
                              {exists ? formatDate(video.published_at) : '-'}
                            </td>
                            <td className="px-6 py-3 text-sm">
                              {exists ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {(locale === 'zh' || locale === 'en') && (
                                    <button
                                      onClick={() => {
                                        setSelectedVideo({ id: group.id, title: video.title });
                                        setShowAiHelper(true);
                                      }}
                                      className="text-purple-600 hover:text-purple-800 whitespace-nowrap"
                                    >
                                      🤖 AI翻译
                                    </button>
                                  )}
                                  <Link
                                    href={`/admin/videosys/videos/${group.id}/edit?locale=${loc}`}
                                    className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                  >
                                    <Pencil size={14} className="inline" /> 编辑
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(group.id, loc, video.title)}
                                    className="text-red-600 hover:text-red-800 whitespace-nowrap"
                                  >
                                    <Trash2 size={14} className="inline" /> 删除
                                  </button>
                                </div>
                              ) : (
                                isZhOrEn ? (
                                  <Link
                                    href={`/admin/videosys/videos/new?locale=${loc}&id=${group.id}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap"
                                  >
                                    <Plus size={14} className="inline" /> 新增
                                  </Link>
                                ) : null
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            ) : (
              // 普通模式（非 zh/en）
              filteredSimple.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 w-[50%] min-w-0 overflow-hidden">
                    <span className="font-medium text-gray-900 truncate block" title={video.title}>
                      {video.title}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 truncate">
                    {getCategoryName(video.category_key)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate">
                    {formatDate(video.published_at)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap items-center gap-1">
                      {(locale === 'zh' || locale === 'en') && (
                        <button
                          onClick={() => {
                            setSelectedVideo({ id: video.id, title: video.title });
                            setShowAiHelper(true);
                          }}
                          className="text-purple-600 hover:text-purple-800 whitespace-nowrap"
                        >
                          🤖 AI翻译
                        </button>
                      )}
                      <Link
                        href={`/admin/videosys/videos/${video.id}/edit?locale=${locale}`}
                        className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                      >
                        <Pencil size={16} className="inline" /> 编辑
                      </Link>
                      <button
                        onClick={() => handleDelete(video.id, locale, video.title)}
                        className="text-red-600 hover:text-red-800 whitespace-nowrap"
                      >
                        <Trash2 size={16} className="inline" /> 删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {isCollapsibleMode
              ? filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      暂无视频，点击“发布视频”创建
                    </td>
                  </tr>
                )
              : filteredSimple.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      该语言暂无视频
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {/* AI 翻译模态框 */}
      {showAiHelper && selectedVideo && (
        <AiHelperVideoModal
          sourceLocale={locale}
          videoId={selectedVideo.id}
          videoTitle={selectedVideo.title}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            loadAllVideos();
            setShowAiHelper(false);
          }}
        />
      )}
    </div>
  );
}