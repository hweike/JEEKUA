'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import { useToast } from '@/contexts/ToastContext';
import DocsTreeAdmin from '@/components/DocsTreeAdmin';
import LanguageSelector from '@/components/common/LanguageSelector';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLibId, setSelectedLibId] = useState<string | null>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const loadLibs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/docs-libs');
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
  }, []);

  useEffect(() => {
    if (!selectedLibId) {
      setTree([]);
      return;
    }
    setTreeLoading(true);
    fetch(`/api/admin/docs/tree?locale=${locale}&docsLibId=${selectedLibId}`)
      .then(res => res.json())
      .then(data => {
        setTree(data);
      })
      .catch(() => showToast('加载文档树失败', 'error'))
      .finally(() => setTreeLoading(false));
  }, [selectedLibId, locale, showToast]);

  // 拖拽排序（跨语言同步）
  const handleTreeChange = async (newTree: any[]) => {
  const flatten = (nodes: any[], parentId: string | null = null): any[] => {
    let result: any[] = [];
    nodes.forEach((node, idx) => {
      result.push({ id: node.id, parentId, order: idx });
      if (node.children?.length) {
        result = result.concat(flatten(node.children, node.id));
      }
    });
    return result;
  };
  const updates = flatten(newTree);

  try {
    const res = await fetch('/api/admin/docs/reorder-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docsLibId: selectedLibId,
        items: updates,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      showToast('保存排序失败: ' + (err.error || '未知错误'), 'error');
      // 回滚：重新加载树
      const reloadRes = await fetch(`/api/admin/docs/tree?locale=${locale}&docsLibId=${selectedLibId}`);
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        setTree(data);
      }
    } else {
      // 成功，更新本地树
      setTree(newTree);
    }
  } catch (error) {
    console.error('保存排序错误:', error);
    showToast('保存排序失败', 'error');
    // 回滚：重新加载树
    try {
      const reloadRes = await fetch(`/api/admin/docs/tree?locale=${locale}&docsLibId=${selectedLibId}`);
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        setTree(data);
      }
    } catch {
      showToast('刷新树失败', 'error');
    }
  }
};

  const handleNewChild = (parentId?: string) => {
  const baseUrl = `/admin/docs/edit?locale=${locale}&docsLibId=${selectedLibId}`;
  const url = parentId ? `${baseUrl}&parentId=${parentId}` : baseUrl;
  router.push(url);
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('确定删除该文档及其子文档吗？')) return;
    try {
      const res = await fetch(`/api/admin/docs?locale=${locale}&docsLibId=${selectedLibId}&id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('删除成功', 'success');
        fetch(`/api/admin/docs/tree?locale=${locale}&docsLibId=${selectedLibId}`)
          .then(r => r.json())
          .then(data => setTree(data))
          .catch(() => showToast('刷新树失败', 'error'));
        if (selectedDocId === id) setSelectedDocId(null);
      } else {
        showToast('删除失败', 'error');
      }
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    // 已弃用
  };

  const handleEditDoc = (docId: string) => {
    router.push(`/admin/docs/edit?locale=${locale}&docsLibId=${selectedLibId}&id=${docId}`);
  };

  const openCreateModal = () => {
    setEditingLib(null);
    setForm({ name: '', description: '', templateId: '', slug: '' });
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
    if (isSaving) return;
    if (!form.name.trim()) {
      showToast('请填写名称', 'error');
      return;
    }
    if (!form.slug.trim()) {
      showToast('请填写 URL 名称', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let url = '/api/admin/docs-libs';
      let method = 'POST';
      const body: any = {
        name: form.name,
        description: form.description,
        templateId: form.templateId || null,
        slug: form.slug,
        seo_keywords: '',
        seo_title: '',
        seo_description: '',
      };
      if (editingLib) {
        url += `?id=${editingLib.id}`;
        method = 'PUT';
        body.name = form.name;
        body.description = form.description;
        body.templateId = form.templateId || null;
        body.slug = form.slug;
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该文档库吗？其下所有文档将被永久删除。')) return;
    try {
      const res = await fetch(`/api/admin/docs-libs?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      showToast('删除成功', 'success');
      await loadLibs();
      if (selectedLibId === id) {
        setSelectedLibId(null);
        setTree([]);
      }
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handleSelectLib = (lib: DocsLib) => {
    setSelectedLibId(lib.id);
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    const params = new URLSearchParams(searchParams.toString());
    params.set('locale', newLocale);
    router.push(`/admin/docs/docs-libs?${params.toString()}`);
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* 左侧：文档库列表 */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3">文档库</h2>
          <button
            onClick={openCreateModal}
            className="w-full bg-blue-50 border-2 border-dashed border-blue-400 hover:bg-blue-100 hover:border-blue-500 text-blue-600 px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition"
          >
            <Plus size={18} /> 新建
          </button>
          {loading ? (
            <div className="text-center py-8 mt-3">加载中...</div>
          ) : libs.length === 0 ? (
            <div className="text-center text-gray-400 py-8 mt-3">暂无文档库</div>
          ) : (
            <ul className="space-y-2 mt-3">
              {libs.map((lib) => (
                <li
                  key={lib.id}
                  onClick={() => handleSelectLib(lib)}
                  className={`border rounded-lg p-3 hover:shadow-sm transition cursor-pointer bg-white ${
                    selectedLibId === lib.id ? 'ring-2 ring-blue-500' : ''
                  } group`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{lib.name}</h3>
                      {lib.description && <p className="text-gray-500 text-sm truncate">{lib.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(lib.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(lib);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="编辑"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(lib.id);
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 右侧：文档目录树 */}
      <div className="flex-1 p-6 overflow-auto bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {selectedLibId
              ? `文档目录 - ${libs.find(l => l.id === selectedLibId)?.name || ''}`
              : '文档目录'}
          </h2>
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
        </div>

        {!selectedLibId ? (
          <div className="text-center text-gray-400 py-20">
            <p>请从左侧选择一个文档库以查看其目录结构</p>
          </div>
        ) : treeLoading ? (
          <div className="text-center py-20">加载文档树...</div>
        ) : (
          <DocsTreeAdmin
            tree={tree}
            selectedId={selectedDocId}
            onSelect={(id) => setSelectedDocId(id)}
            onEdit={handleEditDoc}
            onNewChild={handleNewChild}
            onDelete={handleDeleteDoc}
            onReorder={handleReorder}
            onTreeChange={handleTreeChange}
            docsLibId={selectedLibId}
            locale={locale}
          />
        )}
      </div>

      {/* 模态框 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingLib ? '编辑文档库' : '新建文档库'}</h2>
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
                <label className="block text-sm font-medium mb-1">关联模板</label>
                <TemplateSelector
                  category="document_library"
                  value={form.templateId}
                  onChange={val => setForm({ ...form, templateId: val })}
                  placeholder="选择模板"
                />
              </div>
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
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}