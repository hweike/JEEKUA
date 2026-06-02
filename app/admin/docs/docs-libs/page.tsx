'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import { useToast } from '@/contexts/ToastContext';

interface DocsLib {
  id: string;
  name: string;
  description?: string;
  templateId?: string | null;
  slug?: string;
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  createdAt: string;
}

export default function DocsLibsAdmin() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [libs, setLibs] = useState<DocsLib[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLib, setEditingLib] = useState<DocsLib | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    templateId: '',
    slug: '',
  });
  const { showToast } = useToast();
  const [firstTemplateId, setFirstTemplateId] = useState<string | null>(null);

  // 获取模板列表并记录第一个模板 ID（用于新建时默认选中）
  useEffect(() => {
    fetch(`/api/admin/templates?category=document_library&locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        if (data.templates && data.templates.length > 0) {
          setFirstTemplateId(data.templates[0].id);
        }
      })
      .catch(err => console.warn('获取模板列表失败', err));
  }, [locale]);

  const loadLibs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/docs-libs?locale=${locale}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLibs(data);
    } catch (err) {
      showToast('加载文档库失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibs();
  }, [locale]);

  const openCreateModal = () => {
    setEditingLib(null);
    setForm({
      name: '',
      description: '',
      templateId: firstTemplateId || '',
      slug: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (lib: DocsLib) => {
    setEditingLib(lib);
    setForm({
      name: lib.name,
      description: lib.description || '',
      templateId: lib.templateId || '',
      slug: lib.slug || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('请填写名称', 'error');
      return;
    }
    if (!form.templateId) {
      showToast('请选择关联模板', 'error');
      return;
    }
    if (!form.slug.trim()) {
      showToast('请填写 URL 名称', 'error');
      return;
    }
    try {
      let url = '/api/admin/docs-libs';
      let method = 'POST';
      const body: any = {
        locale,
        name: form.name,
        description: form.description,
        templateId: form.templateId,
        slug: form.slug,
        // 其他SEO字段暂时不开放，传递空值
        seo_keywords: '',
        seo_title: '',
        seo_description: '',
      };
      if (editingLib) {
        url += `?id=${editingLib.id}`;
        method = 'PUT';
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast(editingLib ? '更新成功' : '创建成功', 'success');
      setModalOpen(false);
      await loadLibs();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该文档库吗？其下所有文档将被永久删除。')) return;
    try {
      const res = await fetch(`/api/admin/docs-libs?id=${id}&locale=${locale}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      showToast('删除成功', 'success');
      await loadLibs();
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">文档库管理</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={setLocale}
            displayMode="zh"
          />
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> 新建文档库
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : libs.length === 0 ? (
        <div className="text-center text-gray-400 py-12">暂无文档库，请点击“新建文档库”</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {libs.map((lib) => (
            <div
              key={lib.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition p-4 flex flex-col"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{lib.name}</h3>
                  {lib.description && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {lib.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    创建于 {new Date(lib.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => openEditModal(lib)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="编辑"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(lib.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 模态框 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingLib ? '编辑文档库' : '新建文档库'}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="名称 *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="描述（可选）"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  关联模板 <span className="text-red-500">*</span>
                </label>
                <TemplateSelector
                  category="document_library"
                  value={form.templateId}
                  onChange={val => setForm({ ...form, templateId: val })}
                  placeholder="选择模板"
                />
              </div>

              {/* 搜索引擎优化 - 仅显示 URL 名称，必填 */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <h3 className="font-medium text-md mb-2">搜索引擎优化</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    URL 名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="请输入 URL 名称"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}