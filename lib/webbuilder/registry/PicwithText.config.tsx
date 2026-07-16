import type { ComponentConfig } from '@measured/puck';
import { PicwithText } from '@/components/webbuilder/blocks/Advanced/PicwithText';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { DEFAULT_PICWITH_TEXT } from '@/lib/webbuilder/defaults/PicwithText';
import ImageUpload from '@/components/ImageUpload';
import type { PicwithTextProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<PicwithTextProps> = {
  label: '图文并排',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: DEFAULT_PICWITH_TEXT.bannerType,
    backgroundColor: DEFAULT_PICWITH_TEXT.backgroundColor,
    imageGroup: { ...DEFAULT_PICWITH_TEXT.imageGroup },
    titleGroup: { ...DEFAULT_PICWITH_TEXT.titleGroup },
    textGroup: { ...DEFAULT_PICWITH_TEXT.textGroup },
    buttonGroup: { ...DEFAULT_PICWITH_TEXT.buttonGroup },
    layoutGroup: { ...DEFAULT_PICWITH_TEXT.layoutGroup },
    paddingGroup: { ...DEFAULT_PICWITH_TEXT.paddingGroup },
  },
  fields: {
    // ===== 通栏设置（顶层） =====
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
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ===== 图片设置 =====
    imageGroup: {
      type: 'object',
      label: '图片设置',
      objectFields: {
        imageUrl: {
          label: '图片',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ImageUpload
              value={value || ''}
              onChange={(url: string | string[]) => onChange(typeof url === 'string' ? url : url[0])}
              maxCount={1}
              label=""
              hint="支持上传本地图片或输入网络图片地址"
              previewAspectRatio="16:9"
            />
          ),
        },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        imageHeight: {
          label: '图片高度',
          type: 'select',
          options: [
            { label: '适应图片', value: 'auto' },
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
        imageWidth: {
          label: '图片宽度',
          type: 'select',
          options: [
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
        imagePosition: {
          label: '图片放置',
          type: 'select',
          options: [
            { label: '左边', value: 'left' },
            { label: '右边', value: 'right' },
          ],
        },
        animation: {
          label: '动画',
          type: 'select',
          options: [
            { label: '无', value: 'none' },
            { label: '环境移动', value: 'ambient' },
            { label: '滚动时放大', value: 'zoom' },
          ],
        },
      },
    },

    // ===== 标题设置 =====
    titleGroup: {
      type: 'object',
      label: '标题设置',
      objectFields: {
        title: { label: '标题', type: 'text' },
        titleFontSize: { label: '标题大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 文本设置 =====
    textGroup: {
      type: 'object',
      label: '文本设置',
      objectFields: {
        text: { label: '文本', type: 'textarea' },
        textFontSize: { label: '文本大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        textColor: {
          label: '文本颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 按钮设置 =====
    buttonGroup: {
      type: 'object',
      label: '按钮设置',
      objectFields: {
        buttonText: { label: '按钮文字', type: 'text' },
        buttonFontSize: { label: '按钮文字大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        buttonColor: {
          label: '按钮颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        buttonLink: { label: '按钮链接', type: 'text' },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        buttonPaddingX: { label: '按钮水平内边距 (px)', type: 'number', min: 0, max: 100, step: 1 },
        buttonPaddingY: { label: '按钮垂直内边距 (px)', type: 'number', min: 0, max: 50, step: 1 },
        buttonBorderRadius: { label: '按钮圆角 (px)', type: 'number', min: 0, max: 50, step: 1 },
      },
    },

    // ===== 布局设置 =====
    layoutGroup: {
      type: 'object',
      label: '布局设置',
      objectFields: {
        contentVertical: {
          label: '内容垂直对齐',
          type: 'select',
          options: [
            { label: '顶部', value: 'top' },
            { label: '中间', value: 'center' },
            { label: '底部', value: 'bottom' },
          ],
        },
        textAlign: {
          label: '文本对齐方式',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        textAreaBackgroundColor: {
          label: '文本区背景色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || 'transparent'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 填充设置 =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },
  },
  // 直接透传 props，保持分组结构
  render: ({ puck, ...props }) => <PicwithText puck={puck} {...props} />,
};