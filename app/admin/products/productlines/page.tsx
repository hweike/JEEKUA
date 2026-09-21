// app/admin/products/productlines/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Plus } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import SeoFields from '@/components/common/SeoFields';
import { LANGUAGES } from '@/lib/languages/config';
import { useCategories, ProductLine } from '../categories/hooks/useCategories';
import { getTemplateDisplayName, preloadTemplateNames } from '@/lib/webbuilder/template-utils';
import { HINT_PATHS, InfoTooltip } from '@/config/fieldHints';
// 新增导入 AI 翻译模态框
import AiHelperProductLineModal from './components/AiHelperProductLineModal';

const validLocaleCodes = LANGUAGES.map(lang => lang.code);
const getInitialLocale = (): string => {
  if (typeof window === 'undefined') return validLocaleCodes[0] || 'zh';
  const stored = localStorage.getItem('admin_selected_language');
  if (stored && validLocaleCodes.includes(stored)) return stored;
  return validLocaleCodes[0] || 'zh';
};

export default function ProductLinesPage() {
  const router = useRouter();
  const [locale, setLocale] = useState(getInitialLocale);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<ProductLine>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState<Partial<ProductLine>>({});

  const [templateNames, setTemplateNames] = useState<Record<string, string>>({});

  // AI 翻译模态框状态
  const [showAiHelper, setShowAiHelper] = useState(false);

  const {
    productLines,
    setProductLines,
    categories,
    saveData,
    refresh,
    loading,
    saving,
    error,
    setError,
  } = useCategories(locale);

  useEffect(() => {
    if (error) {
      setToast({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError]);

  useEffect(() => {
    const loadTemplateNames = async () => {
      const ids = productLines.map(line => line.templateId).filter(Boolean) as string[];
      if (ids.length === 0) return;
      await preloadTemplateNames(ids);
      const names: Record<string, string> = {};
      for (const id of ids) {
        names[id] = await getTemplateDisplayName(id);
      }
      setTemplateNames(names);
    };
    loadTemplateNames();
  }, [productLines]);

  const getDisplayName = (id: string) => templateNames[id] || id?.slice(-8) || '';

  const startEdit = (id: string) => {
    const line = productLines.find(l => l.id === id);
    if (line) {
      setEditingId(id);
      setEditingData({ ...line });
      if (addingNew) {
        setAddingNew(false);
        setNewData({});
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEdit = async (id: string) => {
    if (!editingData.name?.trim()) {
      setToast({ message: '产品线名称不能为空', type: 'error' });
      return;
    }
    const updatedLines = productLines.map(line =>
      line.id === id ? { ...line, ...editingData } as ProductLine : line
    );
    setProductLines(updatedLines);
    setEditingId(null);
    setEditingData({});
    try {
      await saveData(updatedLines, categories);
      setToast({ message: '保存成功', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || '保存失败', type: 'error' });
    }
  };

  const startAdd = () => {
    setAddingNew(true);
    setNewData({ name: '', templateId: '', slug: '', seoTitle: '', seoDescription: '', seoKeywords: '' });
    if (editingId) {
      setEditingId(null);
      setEditingData({});
    }
  };

  const cancelAdd = () => {
    setAddingNew(false);
    setNewData({});
  };

  const confirmAdd = async () => {
    if (!newData.name?.trim()) {
      setToast({ message: '产品线名称不能为空', type: 'error' });
      return;
    }
    const newId = Date.now().toString();
    const newLine: ProductLine = {
      id: newId,
      name: newData.name.trim(),
      order: productLines.length,
      templateId: newData.templateId || undefined,
      slug: newData.slug || undefined,
      seoTitle: newData.seoTitle || undefined,
      seoDescription: newData.seoDescription || undefined,
      seoKeywords: newData.seoKeywords || undefined,
    };
    const updatedLines = [...productLines, newLine];
    setProductLines(updatedLines);
    setAddingNew(false);
    setNewData({});
    try {
      await saveData(updatedLines, categories);
      setToast({ message: '添加成功', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || '保存失败', type: 'error' });
    }
  };

  const deleteLine = async (id: string) => {
    if (productLines.length === 1) {
      setToast({ message: '至少需要保留一条产品线，无法删除', type: 'error' });
      return;
    }
    if (!confirm('确定删除该产品线？所有关联的分类将被移到第一个产品线？')) return;
    const updatedLines = productLines.filter(line => line.id !== id);
    setProductLines(updatedLines);
    try {
      await saveData(updatedLines, categories);
      setToast({ message: '删除成功', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || '删除失败', type: 'error' });
    }
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    localStorage.setItem('admin_selected_language', newLocale);
    setLocale(newLocale);
  };

  const updateEditing = (field: keyof ProductLine, value: string) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const updateNew = (field: keyof ProductLine, value: string) => {
    setNewData(prev => ({ ...prev, [field]: value }));
  };

  // AI 翻译导入成功后的回调
  const handleAiImportSuccess = () => {
    // 刷新产品线列表
    refresh();
    // 关闭模态框
    setShowAiHelper(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">产品线管理</h1>
        <LanguageSelector
          currentLocale={locale}
          onLocaleChange={handleLocaleChange}
          displayMode="zh"
        />
      </div>

      <div className="flex justify-end items-center gap-4 mb-6">
        {saving && <span className="text-sm text-gray-500 mr-4">保存中...</span>}
        {/* 新增 AI 翻译按钮（仅 en/zh 可见） */}
        {(locale === 'en' || locale === 'zh') && (
          <button
            onClick={() => setShowAiHelper(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded inline-flex items-center gap-2 hover:bg-purple-700 transition"
          >
            🤖 AI翻译产品线
          </button>
        )}
        <button
          onClick={startAdd}
          className="bg-green-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
        >
          <Plus size={18} /> 新增产品线
        </button>
      </div>

      <div className="space-y-4">
        {/* 新增表单 */}
        {addingNew && (
          <div className="border rounded-lg p-4 bg-blue-50 shadow-sm space-y-4">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="font-medium text-md mb-3">基本信息</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    产品线名称 *
                    <InfoTooltip hintKey={HINT_PATHS.productLine.name as any} />
                  </label>
                  <input
                    type="text"
                    value={newData.name || ''}
                    onChange={e => updateNew('name', e.target.value)}
                    className="border rounded px-3 py-2 w-full h-10"
                    placeholder="如：苹果配件"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    关联模板
                    <InfoTooltip hintKey={HINT_PATHS.productLine.templateId as any} />
                  </label>
                  <TemplateSelector
                    category="product_line"
                    value={newData.templateId || ''}
                    onChange={val => updateNew('templateId', val)}
                    placeholder="选择模板"
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="font-medium text-md mb-3">搜索引擎优化</h3>
              <SeoFields
                slug={newData.slug || ''}
                seoKeywords={newData.seoKeywords || ''}
                seoTitle={newData.seoTitle || ''}
                seoDescription={newData.seoDescription || ''}
                onChange={(seoData) => {
                  updateNew('slug', seoData.slug);
                  updateNew('seoKeywords', seoData.seoKeywords);
                  updateNew('seoTitle', seoData.seoTitle);
                  updateNew('seoDescription', seoData.seoDescription);
                }}
                autoGenerateFrom={newData.name || ''}
                showSlug
                showKeywords
                showTitle
                showDescription
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={cancelAdd} className="bg-gray-300 px-4 py-2 rounded">取消</button>
              <button onClick={confirmAdd} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
            </div>
          </div>
        )}

        {/* 已有产品线列表 */}
        {productLines.map(line => {
          const isEditing = editingId === line.id;
          return (
            <div key={line.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 shadow-sm">
                    <h3 className="font-medium text-md mb-3">基本信息</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          产品线名称 *
                          <InfoTooltip hintKey={HINT_PATHS.productLine.name as any} />
                        </label>
                        <input
                          type="text"
                          value={editingData.name || ''}
                          onChange={e => updateEditing('name', e.target.value)}
                          className="border rounded px-3 py-2 w-full h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          关联模板
                          <InfoTooltip hintKey={HINT_PATHS.productLine.templateId as any} />
                        </label>
                        <TemplateSelector
                          category="product_line"
                          value={editingData.templateId || ''}
                          onChange={val => updateEditing('templateId', val)}
                          placeholder="选择模板"
                          className="w-full h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 shadow-sm">
                    <h3 className="font-medium text-md mb-3">搜索引擎优化</h3>
                    <SeoFields
                      slug={editingData.slug || ''}
                      seoKeywords={editingData.seoKeywords || ''}
                      seoTitle={editingData.seoTitle || ''}
                      seoDescription={editingData.seoDescription || ''}
                      onChange={(seoData) => {
                        updateEditing('slug', seoData.slug);
                        updateEditing('seoKeywords', seoData.seoKeywords);
                        updateEditing('seoTitle', seoData.seoTitle);
                        updateEditing('seoDescription', seoData.seoDescription);
                      }}
                      autoGenerateFrom={editingData.name || ''}
                      showSlug
                      showKeywords
                      showTitle
                      showDescription
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit} className="bg-gray-300 px-4 py-2 rounded">取消</button>
                    <button onClick={() => saveEdit(line.id)} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{line.name}</div>
                    {line.templateId && (
                      <div className="text-xs text-gray-500 mt-1">模板: {getDisplayName(line.templateId)}</div>
                    )}
                    {line.slug && (
                      <div className="text-xs text-gray-400 mt-0.5">URL: /products/{line.slug}</div>
                    )}
                    {(line.seoTitle || line.seoDescription) && (
                      <div className="mt-2 text-xs text-gray-400 border-t pt-1">
                        {line.seoTitle && <div>SEO标题: {line.seoTitle.substring(0, 50)}...</div>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button onClick={() => startEdit(line.id)} className="text-blue-600 hover:text-blue-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => deleteLine(line.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI 翻译模态框 */}
      {showAiHelper && (
        <AiHelperProductLineModal
          sourceLocale={locale}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={handleAiImportSuccess}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}