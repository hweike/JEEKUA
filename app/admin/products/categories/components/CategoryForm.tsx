'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import SeoFields from '@/components/common/SeoFields';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector'; // 新增导入
import {getFieldHint,getFieldPlaceholder,HINT_PATHS,InfoTooltip} from '@/config/fieldHints';

export default function CategoryForm({ category, onSave, onCancel, attributeTemplates }: any) {
  // 初始化时合并 templateId 字段（若不存在则设为空字符串）
  const [form, setForm] = useState(() => ({ ...category, templateId: category.templateId || '' }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-6">
        {/* 左侧区域 */}
        <div className="space-y-6">
          <div className="border rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-lg mb-3">基本信息</h3>
            <div className="space-y-3">
              <div>
                <label className="block font-medium mb-1">分类名称 *<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.name} /></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="border rounded p-2 w-full"
                  required
                   placeholder={getFieldPlaceholder('productCategory.basic.name')}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">描述<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.description} /></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="border rounded p-2 w-full"
                   placeholder={getFieldPlaceholder('productCategory.basic.description')}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">产品自定义属性模板<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.attributeTemplateId} /></label>
                <select
                  value={form.attributeTemplateId || ''}
                  onChange={e => setForm({ ...form, attributeTemplateId: e.target.value })}
                  className="border rounded p-2 w-full"
                  placeholder={getFieldPlaceholder('productCategory.basic.attributeTemplateId')}
                >
                  <option value="">无</option>
                  {attributeTemplates.map((tpl: any) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">此模板将应用于该分类下的所有产品</p>
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
              <label className="block font-medium mb-1">排序序号<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.order} /></label>
              <input
                type="number"
                value={form.order}
                onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="border rounded p-2 w-full"
                placeholder={getFieldPlaceholder('productCategory.basic.order')}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">封面图片<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.image} /></label>
              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                maxCount={1}
                label=""
                hint={getFieldPlaceholder('productCategory.basic.image')}
              />
            </div>
            {/* 替换原“模板样式”下拉为 TemplateSelector */}
            <div>
              <label className="block font-medium mb-1">关联模板*<InfoTooltip hintKey={HINT_PATHS.productCategory.basic.templateId} /></label>
              <TemplateSelector
                category="product_category"      // 集合页模板
                value={form.templateId}
                onChange={(val) => setForm({ ...form, templateId: val })}
                placeholder={getFieldPlaceholder('productCategory.basic.templateId')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="bg-gray-300 px-4 py-2 rounded">取消</button>
        <button onClick={() => onSave(form)} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
      </div>
    </div>
  );
}