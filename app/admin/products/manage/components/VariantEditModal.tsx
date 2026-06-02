'use client';

import { useState, useEffect } from 'react';
import ImageGridUpload from '@/components/ImageGridUpload';
import { PriceTiersInput } from './PriceTiersInput';
import { AttributesInput } from './AttributesInput';

interface VariantEditModalProps {
  variant: any;
  parentId: string;
  locale: string;
  onSave: () => void;
  onClose: () => void;
}

export function VariantEditModal({ variant, parentId, locale, onSave, onClose }: VariantEditModalProps) {
  const [form, setForm] = useState(() => ({
    ...variant,
    price_tiers: variant.price_tiers || [],  // 确保是数组
    attributes: variant.attributes || {},
    additional_images: variant.additional_images || [],
  }));
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, locale, parent_product_id: parentId };
    const url = `/api/admin/products/manage?productId=${variant.productId}`;
    try {
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        onSave();
      } else {
        alert('保存失败');
      }
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-3/4 max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">编辑变体</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">变体名称</label>
              <input type="text" value={form.product_name || ''} onChange={e => handleChange('product_name', e.target.value)} className="border rounded p-2 w-full" />
            </div>
            <div>
              <label className="block font-medium mb-1">SKU</label>
              <input type="text" value={form.sku || ''} onChange={e => handleChange('sku', e.target.value)} className="border rounded p-2 w-full" />
            </div>
            <div>
              <label className="block font-medium mb-1">主图 URL</label>
              <input type="url" value={form.main_image_url || ''} onChange={e => handleChange('main_image_url', e.target.value)} className="border rounded p-2 w-full" />
            </div>
            <div>
              <label className="block font-medium mb-1">附加图片</label>
              <ImageGridUpload images={form.additional_images || []} onChange={urls => handleChange('additional_images', urls)} maxImages={6} />
            </div>
            <div className="col-span-2">
              <label className="block font-medium mb-1">阶梯价格</label>
              <PriceTiersInput value={form.price_tiers} onChange={v => handleChange('price_tiers', v)} currency={form.currency || 'USD'} />
            </div>
            <div className="col-span-2">
              <label class="block font-medium mb-1">自定义属性</label>
              <AttributesInput value={form.attributes || {}} onChange={v => handleChange('attributes', v)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">取消</button>
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}