'use client';

import { useState } from 'react';
import type { ComponentConfig } from '@measured/puck';
import { ProductCategoriesBlock } from '@/components/webbuilder/blocks/product-categories/ProductCategoriesBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import CategorySelectorWrapper from '@/components/webbuilder/blocks/product-categories/CategorySelectorWrapper';
import type { ProductCategoriesBlockProps } from '@/lib/webbuilder/types';

interface SelectedCategory {
  id: string;
  name: string;
  slug: string;
}

export const config: ComponentConfig<ProductCategoriesBlockProps> = {
  label: '产品分类',
  category: 'Product',
  defaultProps: {
    categorySelection: { ids: [], locale: 'zh' },
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    titleGroup: {
      title: '产品分类',
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
      cardHoverLift: true,
    },
    imageGroup: { aspectRatio: '4:3', objectFit: 'cover', hoverZoom: true },
    textGroup: {
      nameColor: '#000000',
      nameFontSize: 18,
      nameAlign: 'left',
      descColor: '#666666',
      descFontSize: 14,
      descVisible: true,
      showArrow: true,
      arrowColor: '#3b82f6',
    },
    linkPattern: '/{locale}/collections/{slug}',
    animationGroup: { enabled: true, duration: 600, delayStep: 80 },
    paddingGroup: { paddingTop: 48, paddingBottom: 48 },
  },
  fields: {
    // ===== 通栏 =====
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

    // ===== 分类选择 =====
    categorySelection: {
      label: '选择分类',
      type: 'custom',
      render: ({ value, onChange }: any) => {
        const selection = value || { ids: [], locale: 'zh' };
        const [open, setOpen] = useState(false);
        const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>([]);

        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              已选择 {selection.ids.length} / 20 个分类
              （{selection.locale === 'en' ? 'English' : '中文'}）
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {selection.ids.length > 0 ? '重新选择分类' : '选择分类'}
            </button>
            {selectedCategories.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {selectedCategories.map((c, i) => (
                  <div key={c.id || i} className="text-xs truncate">
                    {c.name || c.id}
                  </div>
                ))}
              </div>
            )}
            {open && (
              <CategorySelectorWrapper
                initialSelectedIds={selection.ids}
                defaultLocale={selection.locale}
                onCancel={() => setOpen(false)}
                onConfirm={(ids, locale) => {
                  onChange({ ids, locale });
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
        cardHoverLift: {
          label: '悬停上浮',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
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

    // ===== 文字 =====
    textGroup: {
      type: 'object',
      label: '文字设置',
      objectFields: {
        nameColor: {
          label: '分类名称颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        nameFontSize: { label: '分类名称大小 (px)', type: 'number', min: 12, max: 32, step: 1 },
        nameAlign: {
          label: '文字对齐',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
          ],
        },
        descColor: {
          label: '描述颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        descFontSize: { label: '描述大小 (px)', type: 'number', min: 10, max: 24, step: 1 },
        descVisible: {
          label: '显示描述',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        showArrow: {
          label: '显示箭头',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        arrowColor: {
          label: '箭头颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
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
    <ProductCategoriesBlock puck={puck} {...(props as ProductCategoriesBlockProps)} />
  ),
};