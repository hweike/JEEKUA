'use client';

import { useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import SeoFields from '@/components/common/SeoFields';
import { getFieldHint, getFieldPlaceholder, HINT_PATHS, InfoTooltip } from '@/config/fieldHints';
import { getImageUrl } from '@/lib/files/url'; // 新增导入

interface Series {
  id: string;
  name: string;
  slug: string;
  order: number;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

interface SeriesManagerProps {
  category: {
    id: string;
    name: string;
    series: Series[];
    attributeTemplateId?: string;
    pageTemplate?: string;
    productLineId?: string;
  };
  attributeTemplates: Array<{ id: string; name: string }>;
  onUpdate: (updatedCategory: any) => void;
}

const emptySeries: Series = {
  id: '',
  name: '',
  slug: '',
  order: 0,
  image: '',
  description: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
};

export default function SeriesManager({ category, attributeTemplates, onUpdate }: SeriesManagerProps) {
  const [editingSeries, setEditingSeries] = useState<{ index: number } | null>(null);
  const [addingSeries, setAddingSeries] = useState(false);
  const [newSeries, setNewSeries] = useState<Series>(emptySeries);

  const startAddSeries = () => {
    setEditingSeries(null);          // 关闭编辑表单
    setNewSeries({ ...emptySeries, order: category.series.length });
    setAddingSeries(true);
  };

  const addSeries = (seriesData: Series) => {
    if (!seriesData.name || !seriesData.slug) {
      alert('请填写二级分类名称和URL');
      return;
    }
    const cleanSeries = {
      id: Date.now().toString(),
      name: seriesData.name,
      slug: seriesData.slug,
      order: seriesData.order,
      image: seriesData.image || '',
      description: seriesData.description || '',
      seoTitle: seriesData.seoTitle || '',
      seoDescription: seriesData.seoDescription || '',
      seoKeywords: seriesData.seoKeywords || '',
    };
    const updatedCat = {
      ...category,
      series: [...category.series, cleanSeries],
    };
    onUpdate(updatedCat);
    setAddingSeries(false);
  };

  const deleteSeries = (index: number) => {
    if (!confirm('确定删除该二级分类？')) return;
    const newSeriesList = category.series.filter((_, i) => i !== index);
    onUpdate({ ...category, series: newSeriesList });
    if (editingSeries?.index === index) {
      setEditingSeries(null);
    }
  };

  const updateSeries = (index: number, updated: Series) => {
    if (!updated.name || !updated.slug) {
      alert('请填写二级分类名称和URL');
      return;
    }
    const cleanSeries = {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      order: updated.order,
      image: updated.image || '',
      description: updated.description || '',
      seoTitle: updated.seoTitle || '',
      seoDescription: updated.seoDescription || '',
      seoKeywords: updated.seoKeywords || '',
    };
    const newSeriesList = [...category.series];
    newSeriesList[index] = cleanSeries;
    onUpdate({ ...category, series: newSeriesList });
    setEditingSeries(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-md">二级分类</h3>
        <button onClick={startAddSeries} className="text-sm text-green-600 inline-flex items-center gap-1">
          <Plus size={14} /> 添加二级分类
        </button>
      </div>
      <div className="space-y-3">
        {category.series.map((series, idx) => (
          <div key={series.id || idx} className="border rounded-lg bg-white p-3 shadow-sm">
            {editingSeries?.index === idx ? (
              <SeriesForm
                series={series}
                attributeTemplates={attributeTemplates}
                category={category}
                onSave={(updated: Series) => updateSeries(idx, updated)}
                onCancel={() => setEditingSeries(null)}
              />
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  {series.image && (
                    // 使用 getImageUrl 转换图片地址
                    <img src={getImageUrl(series.image)} className="w-12 h-12 object-cover rounded flex-shrink-0" alt="" />
                  )}
                  <div>
                    <div className="font-medium">{series.name}</div>
                    <div className="text-sm text-gray-500">URL: {series.slug}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAddingSeries(false);
                      setEditingSeries({ index: idx });
                    }}
                    className="text-blue-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button onClick={() => deleteSeries(idx)} className="text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {addingSeries && (
        <div className="mt-3 border rounded-lg bg-white p-4 shadow-sm">
          <SeriesForm
            series={newSeries}
            attributeTemplates={attributeTemplates}
            category={category}
            onSave={addSeries}
            onCancel={() => setAddingSeries(false)}
            isNew
          />
        </div>
      )}
    </div>
  );
}

// SeriesForm 组件 Props 类型定义
interface SeriesFormProps {
  series: Series;
  attributeTemplates: Array<{ id: string; name: string }>;
  category: {
    id: string;
    name: string;
    series: Series[];
    attributeTemplateId?: string;
    pageTemplate?: string;
    productLineId?: string;
  };
  onSave: (series: Series) => void;
  onCancel: () => void;
  isNew?: boolean;
}

// 二级分类表单（使用公共 SEO 组件，继承字段只读）
function SeriesForm({ series, attributeTemplates, category, onSave, onCancel, isNew }: SeriesFormProps) {
  const [form, setForm] = useState<Series>(() => ({ ...series }));

  const inheritedAttributeTemplate = attributeTemplates.find((t) => t.id === category.attributeTemplateId);
  const inheritedPageTemplate = category.pageTemplate === 'default' ? '默认模板' : '全宽模板';

  const handleSubmit = () => {
    if (!form.name || !form.slug) {
      alert('请填写二级分类名称和URL');
      return;
    }
    onSave(form);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-6">
        {/* 左侧区域 */}
        <div className="space-y-6">
          <div className="border rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-lg mb-3">基本信息</h3>
            <div className="space-y-3">
              <div>
                <label className="block font-medium mb-1">二级分类名称 *<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.name as any} /></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="border rounded p-2 w-full"
                  placeholder={getFieldPlaceholder('productCategory.basic.name')}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">描述<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.description as any} /></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="border rounded p-2 w-full"
                  placeholder={getFieldPlaceholder('productCategory.basic.description')}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">产品自定义属性模板</label>
                <input
                  type="text"
                  value={inheritedAttributeTemplate?.name || '无'}
                  disabled
                  className="bg-gray-100 border rounded p-2 w-full"
                />
                <p className="text-xs text-gray-500 mt-1">继承自上级分类，不可编辑</p>
              </div>
            </div>
          </div>

          {/* SEO 区块 - 使用公共组件 */}
          <div className="border rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-lg mb-3">搜索引擎优化</h3>
            <SeoFields
              slug={form.slug}
              seoKeywords={form.seoKeywords}
              seoTitle={form.seoTitle}
              seoDescription={form.seoDescription}
              onChange={(seoData) => setForm({ ...form, ...seoData })}
              autoGenerateFrom={form.name}
              showSlug
              showKeywords
              showTitle
              showDescription
            />
          </div>
        </div>

        {/* 右侧区域 */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="font-medium text-lg mb-3">显示设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">排序序号<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.order as any} /></label>
              <input
                type="number"
                value={form.order}
                onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="border rounded p-2 w-full"
                placeholder={getFieldPlaceholder('productCategory.basic.order')}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">图片<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.image as any} /></label>
              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: typeof url === 'string' ? url : url[0] || '' })}
                maxCount={1}
                label=""
                hint={getFieldPlaceholder('productCategory.basic.image')}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="bg-gray-300 px-4 py-2 rounded">取消</button>
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
      </div>
    </div>
  );
}