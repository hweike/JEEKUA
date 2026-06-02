'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Plus, Eye, X } from 'lucide-react';
import WebBuilderClient from '@/components/webbuilder/WebBuilderClient';
import { toast } from 'sonner';

// 模板分类（全量，用于类型推断）
const CATEGORIES = [
  { value: 'page',              label: '页面' },
  { value: 'product',           label: '产品' },
  { value: 'product_category',  label: '产品合集' },   // 改名
  { value: 'product_line',      label: '产品线' },
  { value: 'document',          label: '文档' },       // 隐藏
  { value: 'document_library',  label: '文档库' },
  { value: 'blog',              label: '博客' },
  { value: 'blog_post',         label: '博客文章' },   // 隐藏
  { value: 'video_category',    label: '视频合集' },   // 改名
  { value: 'video',             label: '视频' },       // 隐藏
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

// 需要在前端隐藏的分类
const HIDDEN_CATEGORIES: Category[] = ['document', 'blog_post', 'video'];

// 用于界面显示的过滤后分类
const VISIBLE_CATEGORIES = CATEGORIES.filter(c => !HIDDEN_CATEGORIES.includes(c.value));

interface Template {
  id: string;
  name: string;
  category: Category;
  updatedAt: string;
  isSystem?: boolean;
}

export default function AdminWebBuilderPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<Category>('page');
  const [activeCategory, setActiveCategory] = useState<Category>('page');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetch('/api/webbuilder')
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('加载模板失败', err);
        setLoading(false);
      });
  }, []);

  const refreshTemplates = async () => {
    const res = await fetch('/api/webbuilder');
    const data = await res.json();
    setTemplates(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此模板吗？')) return;
    const res = await fetch(`/api/webbuilder?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('删除成功');
    } else {
      toast.error('删除失败');
    }
  };

  const handleSaveOnly = async () => {
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
      const newTemplate = result;
      setTemplates((prev) => [...prev, newTemplate]);
      closeModal();
      toast.success('模板已保存');
    } else {
      toast.error(result.error || '创建失败');
    }
  };

  const handleCreateAndDesign = async () => {
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
      const newTemplate = result;
      setTemplates((prev) => [...prev, newTemplate]);
      closeModal();
      setEditingTemplate(newTemplate);
    } else {
      toast.error(result.error || '创建失败');
    }
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateCategory('page');
  };

  const filteredTemplates = templates.filter((t) => t.category === activeCategory);

  const getCategoryLabel = (cat: Category) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">加载中...</div>;
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
              onClick={() => setEditingTemplate(null)}
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
              onSave={async (puckData) => {
                const pageTitle = puckData?.root?.props?.title || editingTemplate.name;
                const res = await fetch('/api/webbuilder', {
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
                const result = await res.json();
                refreshTemplates();
              }}
              onPublish={async (puckData) => {
                const pageTitle = puckData?.root?.props?.title || editingTemplate.name;
                const res = await fetch('/api/webbuilder', {
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
                const result = await res.json();
                refreshTemplates();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}