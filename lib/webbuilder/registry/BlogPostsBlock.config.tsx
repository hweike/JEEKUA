'use client';

import { useState } from 'react';
import type { ComponentConfig } from '@measured/puck';
import { BlogPostsBlock } from '@/components/webbuilder/blocks/blog-posts/BlogPostsBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import BlogSelectorWrapper from '@/components/webbuilder/blocks/blog-posts/BlogSelectorWrapper';
import type { BlogPostsBlockProps } from '@/lib/webbuilder/types';

interface SelectedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  categoryId: string;
  author: string;
  updatedAt: string;
}

export const config: ComponentConfig<BlogPostsBlockProps> = {
  label: '精选博客文章',
  category: 'Content',
  defaultProps: {
    blogSelection: { ids: [], locale: 'zh' },
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    titleGroup: {
      title: '博客文章',
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
      cardLayout: 'vertical',
      imageWidth: 200,
    },
    imageGroup: { aspectRatio: '16:9', objectFit: 'cover', hoverZoom: true },
    textGroup: {
      titleColor: '#000000',
      titleFontSize: 18,
      excerptColor: '#666666',
      excerptFontSize: 14,
      dateColor: '#999999',
      dateFontSize: 12,
      excerptLines: 2,
      dateVisible: true,
      dateFormat: 'YYYY-MM-DD',
    },
    linkPattern: '/{locale}/blog/{slug}',
    openInNewTab: true,
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

    // ===== 文章选择 =====
    blogSelection: {
      label: '选择文章',
      type: 'custom',
      render: ({ value, onChange }: any) => {
        const selection = value || { ids: [], locale: 'zh' };
        const [open, setOpen] = useState(false);
        const [selectedPosts, setSelectedPosts] = useState<SelectedPost[]>([]);

        const initialPosts: SelectedPost[] = selection.ids.map((id: string) => {
          const found = selectedPosts.find((p) => p.id === id);
          return found || { id, slug: '', title: id, excerpt: '', featuredImage: '', categoryId: '', author: '', updatedAt: '' };
        });

        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              已选择 {selection.ids.length} / 20 篇文章
              （{selection.locale === 'en' ? 'English' : '中文'}）
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {selection.ids.length > 0 ? '重新选择文章' : '选择文章'}
            </button>
            {selectedPosts.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {selectedPosts.map((p, i) => (
                  <div key={p.id || i} className="text-xs truncate">
                    {p.title || p.id}
                  </div>
                ))}
              </div>
            )}
            {open && (
              <BlogSelectorWrapper
                initialSelectedPosts={initialPosts}
                defaultLocale={selection.locale}
                onCancel={() => setOpen(false)}
                onConfirm={(posts, locale) => {
                  onChange({
                    ids: posts.map((p) => p.id),
                    locale,
                  });
                  setSelectedPosts(posts);
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
        cardLayout: {
          label: '卡片布局',
          type: 'radio',
          options: [
            { label: '竖排（图上文下）', value: 'vertical' },
            { label: '横排（图左文右）', value: 'horizontal' },
          ],
        },
        imageWidth: {
          label: '横排图片宽度 (px)',
          type: 'number',
          min: 60,
          max: 400,
          step: 10,
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
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        titleFontSize: { label: '标题字号 (px)', type: 'number', min: 12, max: 32, step: 1 },
        excerptColor: {
          label: '摘要颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        excerptFontSize: { label: '摘要字号 (px)', type: 'number', min: 10, max: 24, step: 1 },
        dateColor: {
          label: '日期颜色',
          type: 'custom',
          render: ({ value, onChange }: any) => (
            <ColorPickerField field={{}} value={value || '#999999'} onChange={onChange} />
          ),
        },
        dateFontSize: { label: '日期字号 (px)', type: 'number', min: 10, max: 20, step: 1 },
        excerptLines: {
          label: '摘要行数',
          type: 'radio',
          options: [
            { label: '1 行', value: 1 },
            { label: '2 行', value: 2 },
            { label: '3 行', value: 3 },
          ],
        },
        dateVisible: {
          label: '显示日期',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        dateFormat: {
          label: '日期格式',
          type: 'radio',
          options: [
            { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
            { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
            { label: '相对时间（3 天前）', value: 'relative' },
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
    <BlogPostsBlock puck={puck} {...(props as BlogPostsBlockProps)} />
  ),
};