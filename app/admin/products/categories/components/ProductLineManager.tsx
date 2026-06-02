'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import SeoFields from '@/components/common/SeoFields';
import { getTemplateDisplayName, preloadTemplateNames } from '@/lib/webbuilder/template-utils';
import {getFieldHint,getFieldPlaceholder,HINT_PATHS,InfoTooltip} from '@/config/fieldHints';

export default function ProductLineManager({ productLines = [], onSave, onClose }: any) {
  const [lines, setLines] = useState(productLines);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({
    name: '',
    templateId: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState<any>({
    name: '',
    templateId: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });
  const [templateNames, setTemplateNames] = useState<Record<string, string>>({});

  // 预加载所有产品线的模板名称（仅用于显示）
  useEffect(() => {
    const loadTemplateNames = async () => {
      const ids = lines.map(line => line.templateId).filter(Boolean);
      if (ids.length === 0) return;
      await preloadTemplateNames(ids);
      const names: Record<string, string> = {};
      for (const id of ids) {
        names[id] = await getTemplateDisplayName(id);
      }
      setTemplateNames(names);
    };
    loadTemplateNames();
  }, [lines]);

  const getDisplayName = (id: string) => templateNames[id] || id?.slice(-8) || '';

  const startEdit = (id: string, line: any) => {
    setEditingId(id);
    setEditingData({
      name: line.name || '',
      templateId: line.templateId || '',
      slug: line.slug || '',
      seoTitle: line.seoTitle || '',
      seoDescription: line.seoDescription || '',
      seoKeywords: line.seoKeywords || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({ name: '', templateId: '', slug: '', seoTitle: '', seoDescription: '', seoKeywords: '' });
  };

  const saveEdit = (id: string) => {
    if (!editingData.name.trim()) return;
    setLines(lines.map(line =>
      line.id === id ? { ...line, ...editingData } : line
    ));
    setEditingId(null);
  };

  const startAdd = () => {
    setAddingNew(true);
    setNewData({
      name: '',
      templateId: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    });
  };

  const cancelAdd = () => {
    setAddingNew(false);
  };

  const confirmAdd = () => {
    if (!newData.name.trim()) return;
    const newId = Date.now().toString();
    setLines([...lines, {
      id: newId,
      name: newData.name.trim(),
      order: lines.length,
      templateId: newData.templateId || undefined,
      slug: newData.slug || undefined,
      seoTitle: newData.seoTitle || undefined,
      seoDescription: newData.seoDescription || undefined,
      seoKeywords: newData.seoKeywords || undefined,
    }]);
    setAddingNew(false);
  };

  const deleteLine = (id: string) => {
    if (lines.length === 1) {
      alert('至少需要保留一条产品线，无法删除');
      return;
    }
    if (!confirm('确定删除该产品线？所有关联的分类将被移到第一个产品线？')) return;
    setLines(lines.filter(line => line.id !== id));
  };

  // 修改后的保存函数：自动提交未确认的编辑
  const handleSaveAll = () => {
    // 1. 如果存在正在编辑的产品线，先自动保存它
    if (editingId) {
      if (!editingData.name.trim()) {
        alert('请填写产品线名称');
        return;
      }
      // 同步生成新的 lines 数组（不依赖 setState 的异步）
      const updatedLines = lines.map(line =>
        line.id === editingId ? { ...line, ...editingData } : line
      );
      // 更新状态（用于后续显示）
      setLines(updatedLines);
      setEditingId(null);
      // 使用更新后的数组构建最终数据
      let finalLines = [...updatedLines];
      // 如果新增表单处于打开状态且有内容，则追加
      if (addingNew && newData.name.trim()) {
        finalLines.push({
          id: Date.now().toString(),
          name: newData.name.trim(),
          order: finalLines.length, // 使用当前数组长度作为 order
          templateId: newData.templateId || undefined,
          slug: newData.slug || undefined,
          seoTitle: newData.seoTitle || undefined,
          seoDescription: newData.seoDescription || undefined,
          seoKeywords: newData.seoKeywords || undefined,
        });
      }
      onSave(finalLines);
      onClose();
      return;
    }

    // 2. 没有正在编辑的项，按原有逻辑处理
    let finalLines = [...lines];
    if (addingNew && newData.name.trim()) {
      finalLines.push({
        id: Date.now().toString(),
        name: newData.name.trim(),
        order: lines.length,
        templateId: newData.templateId || undefined,
        slug: newData.slug || undefined,
        seoTitle: newData.seoTitle || undefined,
        seoDescription: newData.seoDescription || undefined,
        seoKeywords: newData.seoKeywords || undefined,
      });
    }
    onSave(finalLines);
    onClose();
  };

  // 辅助函数：更新编辑数据
  const updateEditing = (field: string, value: any) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const updateNew = (field: string, value: any) => {
    setNewData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[800px] max-h-[85vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4">管理产品线</h2>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {lines.map(line => (
            <div key={line.id} className="border rounded-lg p-4 bg-gray-50">
              {editingId === line.id ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">产品线名称*<InfoTooltip hintKey={HINT_PATHS.productLine.name} /></label>

                      <input
                        type="text"
                        value={editingData.name}
                        onChange={e => updateEditing('name', e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                        placeholder={getFieldPlaceholder('productLine.name')} 
                      />
              
                    </div>
                    <div className="w-[50%]">
                      <label className="block text-sm font-medium mb-1">关联模板*<InfoTooltip hintKey={HINT_PATHS.productLine.templateId} /></label>
                      <TemplateSelector
                        category="product_line"
                        value={editingData.templateId}
                        onChange={val => updateEditing('templateId', val)}
                        placeholder={getFieldPlaceholder('productLine.templateId')}
                      />
                    </div>
                  </div>

                  {/* SEO 区块 */}
                  <div className="border-t pt-3">
                    <h3 className="font-medium text-md mb-2">搜索引擎优化</h3>
                    <SeoFields
                      slug={editingData.slug}
                      seoKeywords={editingData.seoKeywords}
                      seoTitle={editingData.seoTitle}
                      seoDescription={editingData.seoDescription}
                      onChange={(seoData) => {
                        updateEditing('slug', seoData.slug);
                        updateEditing('seoKeywords', seoData.seoKeywords);
                        updateEditing('seoTitle', seoData.seoTitle);
                        updateEditing('seoDescription', seoData.seoDescription);
                      }}
                      autoGenerateFrom={editingData.name}
                      showSlug
                      showKeywords
                      showTitle
                      showDescription
                    />
                  </div>

                  {/* 按钮区域：改为中文按钮 */}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => saveEdit(line.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                    >
                      确认
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-400 text-white px-3 py-1 rounded-md text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{line.name}</div>
                      {line.templateId && (
                        <div className="text-xs text-gray-500 mt-1">模板: {getDisplayName(line.templateId)}</div>
                      )}
                      {line.slug && (
                        <div className="text-xs text-gray-400 mt-0.5">URL: /products/{line.slug}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(line.id, line)} className="text-blue-600">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => deleteLine(line.id)} className="text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {(line.seoTitle || line.seoDescription) && (
                    <div className="mt-2 text-xs text-gray-400 border-t pt-1">
                      {line.seoTitle && <div>SEO标题: {line.seoTitle.substring(0, 50)}...</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {addingNew ? (
            <div className="border rounded-lg p-4 bg-blue-50 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">产品线名称*<InfoTooltip hintKey={HINT_PATHS.productLine.name} /></label>
                  <input
                    type="text"
                    value={newData.name}
                    onChange={e => updateNew('name', e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                    placeholder={getFieldPlaceholder('productLine.name')}
                  />
                </div>
                <div className="w-[50%]">
                  <label className="block text-sm font-medium mb-1">关联模板*<InfoTooltip hintKey={HINT_PATHS.productLine.templateId} /></label>
                  <TemplateSelector
                    category="product_line"
                    value={newData.templateId}
                    onChange={val => updateNew('templateId', val)}
                    placeholder={getFieldPlaceholder('productLine.templateId')}
                  />
                </div>
              </div>

              {/* SEO 区块 */}
              <div className="border-t pt-3">
                <h3 className="font-medium text-md mb-2">搜索引擎优化</h3>
                <SeoFields
                  slug={newData.slug}
                  seoKeywords={newData.seoKeywords}
                  seoTitle={newData.seoTitle}
                  seoDescription={newData.seoDescription}
                  onChange={(seoData) => {
                    updateNew('slug', seoData.slug);
                    updateNew('seoKeywords', seoData.seoKeywords);
                    updateNew('seoTitle', seoData.seoTitle);
                    updateNew('seoDescription', seoData.seoDescription);
                  }}
                  autoGenerateFrom={newData.name}
                  showSlug
                  showKeywords
                  showTitle
                  showDescription
                />
              </div>

              {/* 按钮区域 */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={confirmAdd}
                  className="bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                >
                  添加
                </button>
                <button
                  onClick={cancelAdd}
                  className="bg-gray-400 text-white px-3 py-1 rounded-md text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startAdd}
              className="w-full border border-dashed rounded-lg p-3 text-center text-gray-500 hover:text-blue-600 hover:border-blue-600 flex items-center justify-center gap-2 transition"
            >
              <Plus size={18} /> 新增产品线
            </button>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={handleSaveAll} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
}