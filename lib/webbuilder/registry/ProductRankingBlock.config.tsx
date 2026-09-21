'use client';

import { useState } from 'react';
import type { ComponentConfig } from '@measured/puck';
import { ProductRankingBlock } from '@/components/webbuilder/blocks/product-ranking/ProductRankingBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ProductSelectorWrapper from '@/components/webbuilder/blocks/product-showcase/ProductSelectorWrapper';
import type { ProductRankingBlockProps } from '@/lib/webbuilder/types';

interface SelectedProduct {
  productId: string;
  productName: string;
  sku: string;
  mainImage?: string;
}

export const config: ComponentConfig<ProductRankingBlockProps> = {
  label: '产品排行榜',
  category: 'Product',
  defaultProps: {
    productSelection: { ids: [], locale: 'zh' },
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    titleGroup: {
      title: '热门榜单',
      subtitle: '',
      titleColor: '#000000',
      titleFontSize: 32,
      subtitleColor: '#666666',
      subtitleFontSize: 16,
      titleAlign: 'center',
    },
    rankingGroup: {
      columns: 1,
      gap: 16,
      showRanking: true,
      rankingStyle: 'both',
      rankingNumberColor: '#ffffff',
      rankingNumberBgColor: '#3b82f6',
      rankingNumberSize: 36,
      medalGoldColor: '#fbbf24',
      medalSilverColor: '#9ca3af',
      medalBronzeColor: '#f97316',
      cardLayout: 'horizontal',
      imageWidth: 120,
      imageAspectRatio: '1:1',
      linkPattern: '/{locale}/product/{slug}',   // ✅ 加（满足类型）
      openInNewTab: true,                          // ✅ 加（可选，但推荐）
    },
    layoutGroup: {
      cardRadius: 12,
      cardBgColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      cardHoverShadow: true,
      cardHoverLift: false,
    },
    nameGroup: { nameColor: '#000000', nameFontSize: 16, nameAlign: 'left' },
    skuGroup: { skuColor: '#999999', skuFontSize: 12, skuVisible: true },
    imageGroup: {
      aspectRatio: '1:1',   // ✅ 加（满足类型）
      objectFit: 'cover',
      hoverZoom: true,
    },
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

    // ===== 产品选择 =====
    productSelection: {
      label: '选择产品（按选择顺序显示排名）',
      type: 'custom',
      render: ({ value, onChange }: any) => {
        const selection = value || { ids: [], locale: 'zh' };
        const [open, setOpen] = useState(false);
        const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

        const initialProducts: SelectedProduct[] = selection.ids.map((id: string) => {
          const found = selectedProducts.find((p) => p.productId === id);
          return found || { productId: id, productName: id, sku: '' };
        });

        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              已选择 {selection.ids.length} / 20 个产品
              （{selection.locale === 'en' ? 'English' : '中文'}）
            </div>
            <div className="text-xs text-gray-400">
              提示：产品的排列顺序即榜单排名，可通过下方已选列表调整
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
                  <div key={p.productId || i} className="text-xs flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: i < 3 ? '#fbbf24' : '#3b82f6' }}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate flex-1">{p.productName || p.productId}</span>
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

    // ===== 榜单配置 =====
    rankingGroup: {
      type: 'object',
      label: '榜单设置',
      objectFields: {
        columns: {
          label: '列数',
          type: 'radio',
          options: [
            { label: '1 列', value: 1 },
            { label: '2 列', value: 2 },
          ],
        },
        gap: { label: '间距 (px)', type: 'number', min: 0, max: 60, step: 4 },

        showRanking: {
          label: '显示排名',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        rankingStyle: {
          label: '排名样式',
          type: 'radio',
          options: [
            { label: '数字', value: 'number' },
            { label: '奖牌（前3名）', value: 'medal' },
            { label: '数字 + 奖牌（前3名变色）', value: 'both' },
          ],
        },
        rankingNumberColor: {
          label: '序号文字色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        rankingNumberBgColor: {
          label: '序号背景色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        rankingNumberSize: {
          label: '序号大小 (px)',
          type: 'number',
          min: 24,
          max: 80,
          step: 2,
        },
        medalGoldColor: {
          label: '金牌颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#fbbf24'} onChange={onChange} />
          ),
        },
        medalSilverColor: {
          label: '银牌颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#9ca3af'} onChange={onChange} />
          ),
        },
        medalBronzeColor: {
          label: '铜牌颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#f97316'} onChange={onChange} />
          ),
        },

        cardLayout: {
          label: '卡片布局',
          type: 'radio',
          options: [
            { label: '横排（图左文右）', value: 'horizontal' },
            { label: '竖排（图上文下）', value: 'vertical' },
          ],
        },
        imageWidth: {
          label: '横排图片宽度 (px)',
          type: 'number',
          min: 60,
          max: 300,
          step: 10,
        },
        imageAspectRatio: {
          label: '图片比例',
          type: 'radio',
          options: [
            { label: '1:1', value: '1:1' },
            { label: '4:3', value: '4:3' },
            { label: '16:9', value: '16:9' },
          ],
        },

        // ✅ 加 linkPattern（满足类型，但 UI 隐藏）
        linkPattern: {
          type: 'custom',
          render: () => null,   // 不渲染
        },

        // ✅ 可选：暴露 openInNewTab
        openInNewTab: {
          label: '新标签页打开',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
    },

    // ===== 卡片样式 =====
    layoutGroup: {
      type: 'object',
      label: '卡片样式',
      objectFields: {
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

    imageGroup: {
      type: 'object',
      label: '图片设置',
      objectFields: {
        // ✅ 加 aspectRatio（满足类型，但 UI 隐藏——因为 rankingGroup.imageAspectRatio 已经控制）
        aspectRatio: {
          type: 'custom',
          render: () => null,   // 不渲染
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
    <ProductRankingBlock puck={puck} {...(props as ProductRankingBlockProps)} />
  ),
};