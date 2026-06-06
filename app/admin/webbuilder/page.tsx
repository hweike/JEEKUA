'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Plus, Eye, X } from 'lucide-react';
import WebBuilderClient from '@/components/webbuilder/WebBuilderClient';
import { toast } from 'sonner';

// 模板分类（全量，用于类型推断）
const CATEGORIES = [
  { value: 'page', label: '页面' },
  { value: 'product', label: '产品' },
  { value: 'product_category', label: '产品合集' },
  { value: 'product_line', label: '产品线' },
  { value: 'document', label: '文档' },
  { value: 'document_library', label: '文档库' },
  { value: 'blog', label: '博客' },
  { value: 'blog_post', label: '博客文章' },
  { value: 'video_category', label: '视频合集' },
  { value: 'video', label: '视频' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

const HIDDEN_CATEGORIES: Category[] = ['document', 'blog_post', 'video'];
const VISIBLE_CATEGORIES = CATEGORIES.filter(c => !HIDDEN_CATEGORIES.includes(c.value));

interface Template {
  id: string;
  name: string;
  category: Category;
  updatedAt: string;
  isSystem?: boolean;
  data?: any;
}

// 缓存配置
const CACHE_KEY = 'webbuilder_templates_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

interface CacheData {
  data: Template[];
  timestamp: number;
}

// 读取缓存
function getCachedTemplates(): Template[] | null {
  if (typeof window === 'undefined') return null;
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    const { data, timestamp }: CacheData = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.warn('解析缓存失败', e);
  }
  return null;
}

// 写入缓存
function setCachedTemplates(data: Template[]) {
  if (typeof window === 'undefined') return;
  const cacheData: CacheData = { data, timestamp: Date.now() };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

// 清除缓存
function clearTemplatesCache() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CACHE_KEY);
}

export default function AdminWebBuilderPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<Category>('page');
  const [activeCategory, setActiveCategory] = useState<Category>('page');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // 用于取消请求的 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const loadTemplates = useCallback(async (skipCache = false) => {
    // 先检查缓存（除非强制跳过）
    if (!skipCache) {
      const cached = getCachedTemplates();
      if (cached) {
        setTemplates(cached);
        setLoading(false);
        return;
      }
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    try {
      const res = await fetch('/api/webbuilder', { signal: controller.signal });
      const data = await res.json();
      // 只处理最新请求的结果
      if (currentRequestId === requestIdRef.current) {
        setTemplates(data);
        setCachedTemplates(data);
        setLoading(false);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('加载模板失败', err);
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
        toast.error('加载模板失败，请刷新页面重试');
      }
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadTemplates();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTemplates]);

  const refreshTemplates = useCallback(async () => {
    clearTemplatesCache();
    setLoading(true);
    await loadTemplates(true); // 强制跳过缓存
  }, [loadTemplates]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定删除此模板吗？')) return;
    const res = await fetch(`/api/webbuilder?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshTemplates();
      toast.success('删除成功');
    } else {
      toast.error('删除失败');
    }
  }, [refreshTemplates]);

  // 关闭编辑器并刷新模板列表
  const handleCloseEditor = useCallback(async () => {
    setEditingTemplate(null);
    await refreshTemplates();
  }, [refreshTemplates]);

  const handleSaveOnly = useCallback(async () => {
    if (!newTemplateName.trim()) {
      alert('请输入模板名称');
      return;
    }
    const res = await fetch('/api/webbuilder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTemplateName.trim(),
        category: newTemplateCategory,
        data: {
          root: { props: { title: newTemplateName.trim() } },
          content: [],
          zones: {},
        },
        action: 'save',
      }),
    });
    const result = await res.json();
    if (result.success) {
      await refreshTemplates();
      closeModal();
      toast.success('模板已保存');
    } else {
      toast.error(result.error || '创建失败');
    }
  }, [newTemplateName, newTemplateCategory, refreshTemplates]);

  const handleCreateAndDesign = useCallback(async () => {
    if (!newTemplateName.trim()) {
      alert('请输入模板名称');
      return;
    }
    const res = await fetch('/api/webbuilder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTemplateName.trim(),
        category: newTemplateCategory,
        data: {
          root: { props: { title: newTemplateName.trim() } },
          content: [],
          zones: {},
        },
        action: 'save',
      }),
    });
    const result = await res.json();
    if (result.success) {
      await refreshTemplates();
      closeModal();
      setEditingTemplate(result);
    } else {
      toast.error(result.error || '创建失败');
    }
  }, [newTemplateName, newTemplateCategory, refreshTemplates]);

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateCategory('page');
  };

  // 使用 useMemo 缓存过滤后的模板，避免每次渲染重新计算
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => t.category === activeCategory);
  }, [templates, activeCategory]);

  const getCategoryLabel = (cat: Category) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  // 加载状态优化
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 w-full">
            {VISIBLE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className="px-4 py-2 text-sm font-medium text-gray-500 border-transparent border-b-2 -mb-px"
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition ml-4 shrink-0 opacity-50 cursor-not-allowed">
            <Plus className="w-4 h-4" />
            <span>新建模板</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-lg p-5 shadow-sm bg-gray-50 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面头部：标签切换 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 w-full">
          {VISIBLE_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeCategory === cat.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition ml-4 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>新建模板</span>
        </button>
      </div>

      {/* 模板卡片列表 */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border rounded-lg bg-gray-50">
          暂无{getCategoryLabel(activeCategory)}分类的模板
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {template.name}
                    {template.isSystem && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">系统</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {getCategoryLabel(template.category)}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    更新于 {new Date(template.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
                    title={template.isSystem ? '查看系统模板' : '编辑模板'}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <Link
                    href={`/webbuilder/${template.id}`}
                    target="_blank"
                    className="p-2 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50 transition"
                    title="预览模板"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  {!template.isSystem && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition"
                      title="删除模板"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建模板模态框 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">新建页面模板</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">模板名称即为页面名称，请填写以下信息。</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                  <input
                    type="text"
                    placeholder="例如：首页"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {VISIBLE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-lg">
              <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition">
                取消
              </button>
              <div className="flex gap-2">
                <button onClick={handleSaveOnly} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition">
                  保存
                </button>
                <button onClick={handleCreateAndDesign} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition">
                  设计模板
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏编辑器覆盖层 */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
            <span className="text-sm text-gray-700">
              正在编辑：<span className="font-medium">{editingTemplate.name}</span>
            </span>
            <button
              onClick={handleCloseEditor}
              className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>返回模板列表</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <WebBuilderClient
              data={editingTemplate.data}
              initialTitle={editingTemplate.name}
              initialCategory={editingTemplate.category}
              onSave={async (puckData: any) => {
                const pageTitle = puckData?.root?.props?.title || editingTemplate.name;
                await fetch('/api/webbuilder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: editingTemplate.id,
                    title: pageTitle,
                    category: editingTemplate.category,
                    data: puckData,
                    action: 'save',
                  }),
                });
                // 不再立即刷新模板列表
               
              }}
              onPublish={async (puckData: any) => {
                const pageTitle = puckData?.root?.props?.title || editingTemplate.name;
                await fetch('/api/webbuilder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: editingTemplate.id,
                    title: pageTitle,
                    category: editingTemplate.category,
                    data: puckData,
                    action: 'publish',
                  }),
                });
                // 不再立即刷新模板列表
               
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}