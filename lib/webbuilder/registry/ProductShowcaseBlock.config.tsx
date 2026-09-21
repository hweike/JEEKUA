'use client';

import { useState } from 'react';
import type { ComponentConfig } from '@measured/puck';
import { ProductShowcaseBlock } from '@/components/webbuilder/blocks/product-showcase/ProductShowcaseBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ProductSelectorWrapper from '@/components/webbuilder/blocks/product-showcase/ProductSelectorWrapper';
import type { ProductShowcaseBlockProps } from '@/lib/webbuilder/types';

interface SelectedProduct {
  productId: string;
  productName: string;
  sku: string;
  mainImage?: string;
}

export const config: ComponentConfig<ProductShowcaseBlockProps> = {
  label: '精选产品展示',
  category: 'Product',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    titleGroup: {
      title: '精选产品',
      subtitle: '',
      titleColor: '#000000',
      titleFontSize: 32,
      subtitleColor: '#666666',
      subtitleFontSize: 16,
      titleAlign: 'center',
    },
    layoutGroup: {
      columns: 3,
      gap: 24,
      cardRadius: 12,
      cardBgColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      cardHoverShadow: true,
    },
    nameGroup: { nameColor: '#000000', nameFontSize: 16, nameAlign: 'left' },
    skuGroup: { skuColor: '#999999', skuFontSize: 12, skuVisible: true },
    imageGroup: { aspectRatio: '1:1', objectFit: 'cover', hoverZoom: true },
    animationGroup: { enabled: true, duration: 600, delayStep: 80 },
    paddingGroup: { paddingTop: 48, paddingBottom: 48 },
    productSelection: { ids: [], locale: 'zh' },
    // ✅ linkPattern / openInNewTab 由组件内部默认值兜底，不在此声明
  },
  fields: {
    bannerType: {
      label: '通栏类型',
      type: 'radio',
      options: [
        { label: '标准通栏', value: 'standard' },
        { label: '全屏通栏', value: 'fullwidth' },
      ],
    },
    backgroundColor: {
      label: '通栏背景色',
      type: 'custom',
      render: ({ value, onChange }: any) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ✅ 产品选择：一次 onChange 更新 ids + locale
    productSelection: {
      label: '选择产品',
      type: 'custom',
      render: ({ value, onChange }: any) => {
        const selection = value || { ids: [], locale: 'zh' };
        const [open, setOpen] = useState(false);
        const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

        // 打开对话框时把已选产品传进去
        const initialProducts: SelectedProduct[] = selection.ids.map((id: string) => {
          const found = selectedProducts.find((p) => p.productId === id);
          return found || { productId: id, productName: id, sku: '' };
        });

        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              已选择 {selection.ids.length} / 20 个产品（{selection.locale === 'en' ? 'English' : '中文'}）
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {selection.ids.length > 0 ? '重新选择产品' : '选择产品'}
            </button>
            {selectedProducts.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {selectedProducts.map((p, i) => (
                  <div key={p.productId || i} className="text-xs truncate">
                    {p.productName || p.productId}
                  </div>
                ))}
              </div>
            )}

            {open && (
              <ProductSelectorWrapper
                initialSelectedProducts={initialProducts}
                defaultLocale={selection.locale}
                onCancel={() => setOpen(false)}
                onConfirm={(products, locale) => {
                  // ✅ 一次更新：ids + locale
                  onChange({
                    ids: products.map((p) => p.productId),
                    locale,
                  });
                  setSelectedProducts(
                    products.map((p) => ({
                      productId: p.productId,
                      productName: p.productName,
                      sku: p.sku,
                      mainImage: p.mainImage,
                    }))
                  );
                  setOpen(false);
                }}
              />
            )}
          </div>
        );
      },
    },

    // ===== 标题 =====
    titleGroup: {
      type: 'object',
      label: '标题设置',
      objectFields: {
        title: { label: '主标题', type: 'text' },
        subtitle: { label: '副标题', type: 'textarea' },
        titleColor: {
          label: '主标题颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        titleFontSize: { label: '主标题大小 (px)', type: 'number', min: 14, max: 72, step: 1 },
        subtitleColor: {
          label: '副标题颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        subtitleFontSize: { label: '副标题大小 (px)', type: 'number', min: 12, max: 36, step: 1 },
        titleAlign: {
          label: '标题对齐',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
    },

    // ===== 布局 =====
    layoutGroup: {
      type: 'object',
      label: '布局设置',
      objectFields: {
        columns: {
          label: '列数',
          type: 'radio',
          options: [
            { label: '2 列', value: 2 },
            { label: '3 列', value: 3 },
            { label: '4 列', value: 4 },
          ],
        },
        gap: { label: '卡片间距 (px)', type: 'number', min: 0, max: 80, step: 4 },
        cardRadius: { label: '卡片圆角 (px)', type: 'number', min: 0, max: 40, step: 2 },
        cardBgColor: {
          label: '卡片背景色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        cardBorderColor: {
          label: '卡片边框色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#e5e7eb'} onChange={onChange} />
          ),
        },
        cardHoverShadow: {
          label: '悬停阴影',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
    },

    // ===== 产品名称 =====
    nameGroup: {
      type: 'object',
      label: '产品名称',
      objectFields: {
        nameColor: {
          label: '颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        nameFontSize: { label: '字号 (px)', type: 'number', min: 12, max: 32, step: 1 },
        nameAlign: {
          label: '对齐',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
          ],
        },
      },
    },

    // ===== SKU =====
    skuGroup: {
      type: 'object',
      label: 'SKU 设置',
      objectFields: {
        skuVisible: {
          label: '显示 SKU',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        skuColor: {
          label: '颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#999999'} onChange={onChange} />
          ),
        },
        skuFontSize: { label: '字号 (px)', type: 'number', min: 10, max: 20, step: 1 },
      },
    },

    // ===== 图片 =====
    imageGroup: {
      type: 'object',
      label: '图片设置',
      objectFields: {
        aspectRatio: {
          label: '图片比例',
          type: 'radio',
          options: [
            { label: '1:1', value: '1:1' },
            { label: '4:3', value: '4:3' },
            { label: '16:9', value: '16:9' },
          ],
        },
        objectFit: {
          label: '填充方式',
          type: 'radio',
          options: [
            { label: '裁剪填充', value: 'cover' },
            { label: '完整显示', value: 'contain' },
          ],
        },
        hoverZoom: {
          label: '鼠标悬停放大',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
    },

    // ===== 动画 =====
    animationGroup: {
      type: 'object',
      label: '进入动画',
      objectFields: {
        enabled: {
          label: '启用动画',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        duration: { label: '动画时长 (ms)', type: 'number', min: 200, max: 1500, step: 100 },
        delayStep: { label: '卡片延迟步长 (ms)', type: 'number', min: 0, max: 300, step: 20 },
      },
    },

    // ===== 填充 =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      objectFields: {
        paddingTop: { label: '顶部 (px)', type: 'number', min: 0, max: 200, step: 4 },
        paddingBottom: { label: '底部 (px)', type: 'number', min: 0, max: 200, step: 4 },
      },
    },
  },
  render: ({ puck, ...props }) => (
    <ProductShowcaseBlock puck={puck} {...(props as ProductShowcaseBlockProps)} />
  ),
};