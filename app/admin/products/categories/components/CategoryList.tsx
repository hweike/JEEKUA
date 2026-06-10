'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import CategoryForm from './CategoryForm';
import SeriesManager from './SeriesManager';

export default function CategoryList({ 
  categories, 
  productLines, 
  attributeTemplates, 
  addingCat, 
  onAddCancel, 
  onUpdate, 
  currentProductLineId 
}: any) {
  const [editingCat, setEditingCat] = useState<any>(null);
  const [newCat, setNewCat] = useState<any>(null);
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set());
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [attrTemplateSubOpen, setAttrTemplateSubOpen] = useState(false);
  const attrTemplateSubRef = useRef<HTMLDivElement>(null);
  const [webTemplateSubOpen, setWebTemplateSubOpen] = useState(false);
  const webTemplateSubRef = useRef<HTMLDivElement>(null);
  
  const [webTemplates, setWebTemplates] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchWebTemplates = async () => {
      try {
        const res = await fetch(`/api/webbuilder?category=product_category`);
        if (!res.ok) {
          console.warn(`加载页面模板失败: ${res.status}`);
          setWebTemplates([]);
          return;
        }
        const data = await res.json();
        const templates = Array.isArray(data) ? data : [];
        setWebTemplates(templates);
      } catch (err) {
        console.error('加载页面模板失败', err);
        setWebTemplates([]);
      }
    };
    fetchWebTemplates();
  }, []);

  const resetNewCat = () => {
    setNewCat({
      id: '',
      name: '',
      slug: '',
      order: categories.length,
      productLineId: currentProductLineId,
      pageTemplate: 'default',
      image: '',
      description: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      attributeTemplateId: '',
      series: [],
    });
  };

  useEffect(() => {
    if (addingCat) {
      resetNewCat();
    }
  }, [addingCat, currentProductLineId, categories.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMoveMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
        setAttrTemplateSubOpen(false);
        setWebTemplateSubOpen(false);
      }
      if (attrTemplateSubRef.current && !attrTemplateSubRef.current.contains(event.target as Node)) {
        setAttrTemplateSubOpen(false);
      }
      if (webTemplateSubRef.current && !webTemplateSubRef.current.contains(event.target as Node)) {
        setWebTemplateSubOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除该一级分类及其所有二级分类？')) return;
    onUpdate(categories.filter((c: any) => c.id !== id));
  };

  const saveCategory = (cat: any, isNew: boolean) => {
    if (!cat.name || !cat.slug) {
      alert('分类名称和URL不能为空');
      return;
    }
    let newCats;
    if (isNew) {
      const newId = Date.now().toString();
      newCats = [...categories, { ...cat, id: newId }];
    } else {
      newCats = categories.map((c: any) => c.id === cat.id ? cat : c);
    }
    onUpdate(newCats);
    setEditingCat(null);
    if (isNew) onAddCancel();
  };

  const cancelAdd = () => {
    onAddCancel();
    setNewCat(null);
  };

  const toggleExpand = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCatIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catId)) newSet.delete(catId);
      else newSet.add(catId);
      return newSet;
    });
  };

  const handleSeriesUpdate = (cat: any, updatedCat: any) => {
    const newCats = categories.map((c: any) => c.id === cat.id ? updatedCat : c);
    onUpdate(newCats);
  };

  const toggleSelectAll = () => {
    if (selectedCatIds.size === categories.length) {
      setSelectedCatIds(new Set());
    } else {
      setSelectedCatIds(new Set(categories.map((c: any) => c.id)));
    }
  };

  const toggleSelect = (catId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newSet = new Set(selectedCatIds);
    if (newSet.has(catId)) newSet.delete(catId);
    else newSet.add(catId);
    setSelectedCatIds(newSet);
  };

  const batchMoveToProductLine = (targetLineId: string) => {
    if (selectedCatIds.size === 0) return;
    const newCategories = categories.map((cat: any) =>
      selectedCatIds.has(cat.id)
        ? { ...cat, productLineId: targetLineId }
        : cat
    );
    onUpdate(newCategories);
    setSelectedCatIds(new Set());
    setMoveMenuOpen(false);
  };

  const batchUpdateAttributeTemplate = (templateId: string) => {
    if (selectedCatIds.size === 0) return;
    const newCategories = categories.map((cat: any) =>
      selectedCatIds.has(cat.id)
        ? { ...cat, attributeTemplateId: templateId }
        : cat
    );
    onUpdate(newCategories);
    setSelectedCatIds(new Set());
    setAttrTemplateSubOpen(false);
    setMoreMenuOpen(false);
  };

  const batchUpdateWebTemplate = (templateId: string) => {
    if (selectedCatIds.size === 0) return;
    const newCategories = categories.map((cat: any) =>
      selectedCatIds.has(cat.id)
        ? { ...cat, templateId: templateId }
        : cat
    );
    onUpdate(newCategories);
    setSelectedCatIds(new Set());
    setWebTemplateSubOpen(false);
    setMoreMenuOpen(false);
  };

  const batchDeleteCategories = () => {
    if (selectedCatIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedCatIds.size} 个一级分类及其所有二级分类吗？此操作不可恢复。`)) return;
    const newCategories = categories.filter((cat: any) => !selectedCatIds.has(cat.id));
    onUpdate(newCategories);
    setSelectedCatIds(new Set());
    setMoreMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      {addingCat && newCat && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-4">新建一级分类</h3>
          <CategoryForm
            category={newCat}
            onSave={(cat: any) => saveCategory(cat, true)}
            onCancel={cancelAdd}
            productLines={productLines}
            attributeTemplates={attributeTemplates}
          />
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedCatIds.size === categories.length}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">全选当前产品线下的分类</span>
          </div>
          {selectedCatIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">已选 {selectedCatIds.size} 项</span>
              <div className="relative" ref={moveMenuRef}>
                <button
                  onClick={() => setMoveMenuOpen(!moveMenuOpen)}
                  className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 inline-flex items-center gap-1"
                >
                  移动到 <ChevronDown size={14} />
                </button>
                {moveMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow-lg z-20">
                    {productLines.map((line: any) => (
                      <button
                        key={line.id}
                        onClick={() => batchMoveToProductLine(line.id)}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        {line.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="bg-gray-600 text-white text-sm px-3 py-1 rounded hover:bg-gray-700 inline-flex items-center gap-1"
                >
                  更多操作 <ChevronDown size={14} />
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border rounded shadow-lg z-20">
                    <div className="relative" ref={attrTemplateSubRef}>
                      <button
                        onClick={() => setAttrTemplateSubOpen(!attrTemplateSubOpen)}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between"
                      >
                        变更产品自定义属性模板
                        <ChevronRight size={14} />
                      </button>
                      {attrTemplateSubOpen && attributeTemplates.length > 0 && (
                        <div className="absolute right-full top-0 mr-1 w-56 bg-white border rounded shadow-lg z-30">
                          {attributeTemplates.map((tpl: any) => (
                            <button
                              key={tpl.id}
                              onClick={() => batchUpdateAttributeTemplate(tpl.id)}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            >
                              {tpl.name}
                            </button>
                          ))}
                          <button
                            onClick={() => batchUpdateAttributeTemplate('')}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-500"
                          >
                            清空（无模板）
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={webTemplateSubRef}>
                      <button
                        onClick={() => setWebTemplateSubOpen(!webTemplateSubOpen)}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between"
                      >
                        变更页面模板
                        <ChevronRight size={14} />
                      </button>
                      {webTemplateSubOpen && (
                        <div className="absolute right-full top-0 mr-1 w-56 bg-white border rounded shadow-lg z-30">
                          {webTemplates.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-gray-500">暂无可用模板</div>
                          ) : (
                            webTemplates.map((tpl: any) => (
                              <button
                                key={tpl.id}
                                onClick={() => batchUpdateWebTemplate(tpl.id)}
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              >
                                {tpl.title || tpl.name || tpl.id}
                              </button>
                            ))
                          )}
                          <button
                            onClick={() => batchUpdateWebTemplate('')}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-500"
                          >
                            清空（无模板）
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={batchDeleteCategories}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {categories.map((cat: any) => {
        // 获取二级分类数量（基于前端 cat.series 数组）
        const subCategoryCount = cat.series?.length ?? 0;
        return (
          <div key={cat.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
            {editingCat?.id === cat.id ? (
              <div className="p-4">
                <CategoryForm
                  category={editingCat}
                  onSave={(updated: any) => saveCategory(updated, false)}
                  onCancel={() => setEditingCat(null)}
                  productLines={productLines}
                  attributeTemplates={attributeTemplates}
                />
              </div>
            ) : (
              <>
                <div 
                  className="p-4 border-b flex justify-between items-start cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(cat.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCatIds.has(cat.id)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleSelect(cat.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4"
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id, e); }} 
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {expandedCatIds.has(cat.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="flex gap-4">
                      {cat.image && (
                        <div className="flex-shrink-0">
                          <img src={cat.image} className="w-16 h-16 object-cover rounded" alt="" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-semibold">
                          {cat.name}
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            二级分类({subCategoryCount})
                          </span>
                        </h2>
                        <p className="text-gray-500 text-sm">URL: {cat.slug}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); }} className="text-blue-600 hover:text-blue-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={(e) => deleteCategory(cat.id, e)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {expandedCatIds.has(cat.id) && (
                  <div className="p-4 bg-gray-50">
                    <SeriesManager
                      category={cat}
                      attributeTemplates={attributeTemplates}
                      onUpdate={(updatedCat: any) => handleSeriesUpdate(cat, updatedCat)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}