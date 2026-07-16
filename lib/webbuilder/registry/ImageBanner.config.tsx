import type { ComponentConfig } from '@measured/puck';
import { ImageBanner } from '@/components/webbuilder/blocks/media/ImageBanner';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { RangeField } from '@/components/webbuilder/fields/RangeField';
import ImageUpload from '@/components/ImageUpload';
import type { ImageBannerProps } from '@/lib/webbuilder/types';
import { DEFAULT_IMAGE_BANNER } from '@/lib/webbuilder/defaults/ImageBanner';

export const config = {
  label: '图片横幅',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: DEFAULT_IMAGE_BANNER.bannerType,
    imageSettings: { ...DEFAULT_IMAGE_BANNER.imageSettings },
    contentSettings: { ...DEFAULT_IMAGE_BANNER.contentSettings },
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
    imageSettings: {
      label: '图片设置',
      type: 'object',
      objectFields: {
        image1Url: {
          label: '图片 1',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ImageUpload
              value={value || ''}
              onChange={onChange}
              maxCount={1}
              label="图片 1"
              hint="支持上传本地图片或输入网络图片地址"
              previewAspectRatio="16:9"
            />
          ),
        },
        image2Url: {
          label: '图片 2',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ImageUpload
              value={value || ''}
              onChange={onChange}
              maxCount={1}
              label="图片 2"
              hint="支持上传本地图片或输入网络图片地址"
              previewAspectRatio="16:9"
            />
          ),
        },
        overlayOpacity: {
          label: '不透明度',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <RangeField value={value} onChange={onChange} min={0} max={100} step={1} label="不透明度" unit="%" />
          ),
        },
        heightPreset: {
          label: '高度',
          type: 'select',
          options: [
            { label: '适应第一张图片', value: 'auto' },
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
        // ❌ animation 字段已移除（组件不再支持 fixed/scale 动效）
      },
    },
    contentSettings: {
      label: '内容设置',
      type: 'object',
      objectFields: {
        // ===== 标题设置 =====
        title: { label: '标题', type: 'text' },
        titleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        _divider1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-4 border-b border-gray-200 my-2" />,
        },
        // ===== 文本设置 =====
        text: { label: '文本', type: 'textarea' },
        textFontSize: { label: '文本大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        textColor: {
          label: '文本颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        _divider2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-4 border-b border-gray-200 my-2" />,
        },
        // ===== 按钮设置 =====
        button1Text: { label: '按钮 1 文字', type: 'text' },
        button1Color: {
          label: '按钮 1 颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        button1Link: { label: '按钮 1 链接', type: 'text' },
        button2Text: { label: '按钮 2 文字', type: 'text' },
        button2Color: {
          label: '按钮 2 颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        button2Link: { label: '按钮 2 链接', type: 'text' },
        buttonPaddingX: { label: '按钮水平内边距 (px)', type: 'number', min: 0, max: 100, step: 1 },
        buttonPaddingY: { label: '按钮垂直内边距 (px)', type: 'number', min: 0, max: 50, step: 1 },
        buttonBorderRadius: { label: '按钮圆角 (px)', type: 'number', min: 0, max: 50, step: 1 },
        _divider3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-4 border-b border-gray-200 my-2" />,
        },
        // ===== 内容布局 =====
        contentPosition: {
          label: '内容位置',
          type: 'select',
          options: [
            { label: '左上方', value: 'top-left' },
            { label: '顶部居中', value: 'top-center' },
            { label: '右上方', value: 'top-right' },
            { label: '中间居左', value: 'center-left' },
            { label: '中间居中', value: 'center-center' },
            { label: '中间居右', value: 'center-right' },
            { label: '左下方', value: 'bottom-left' },
            { label: '底部居中', value: 'bottom-center' },
            { label: '右下方', value: 'bottom-right' },
          ],
        },
        textAlign: {
          label: '对齐方式',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        _divider4: {
          label: '',
          type: 'custom',
          render: () => <div className="h-4 border-b border-gray-200 my-2" />,
        },
        // ===== 容器设置 =====
        containerEnabled: {
          label: '开启容器',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        containerBgColor: {
          label: '容器背景色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        containerOpacity: {
          label: '容器不透明度 (%)',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <RangeField
              value={value ?? 60}
              onChange={onChange}
              min={0}
              max={100}
              step={1}
              label="容器不透明度"
              unit="%"
            />
          ),
        },
        containerBorderRadius: {
          label: '容器圆角 (px)',
          type: 'number',
          min: 0,
          max: 50,
          step: 1,
        },
        containerPadding: {
          label: '容器内边距 (px)',
          type: 'number',
          min: 0,
          max: 100,
          step: 1,
        },
      },
    },
  },
  render: ({ puck, ...props }) => <ImageBanner puck={puck} {...props} />,
} as ComponentConfig<ImageBannerProps>;