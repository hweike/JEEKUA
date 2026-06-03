import type { ComponentConfig } from '@measured/puck';
import { ImageBanner } from '@/components/webbuilder/blocks/media/ImageBanner';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { ImageBannerTextField } from '@/components/webbuilder/fields/ImageBannerTextField';
import { RangeField } from '@/components/webbuilder/fields/RangeField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import ImageUpload from '@/components/ImageUpload';
import type { ImageBannerProps } from '@/lib/webbuilder/types';

export const config = {
  label: '图片横幅',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    imageSettings: {
      image1Url: '',
      image2Url: '',
      overlayOpacity: 0,
      heightPreset: 'auto',
      animation: 'none',
    },
    contentSettings: {
      title: { zh: '图片横幅', en: 'Image banner', textId: '' },
      titleFontSize: 48,
      titleColor: '#ffffff',
      text: {
        zh: '向客户提供有关横幅图像的详细信息',
        en: 'Give customers details about the banner image(s)',
        textId: '',
      },
      textFontSize: 24,
      textColor: '#ffffff',
      button1Text: { zh: '按钮', en: 'Button label', textId: '' },
      button1Color: '#000000',
      button1Link: '',
      button2Text: { zh: '按钮', en: 'Button label', textId: '' },
      button2Color: '#000000',
      button2Link: '',
      contentPosition: 'center-center',
      textAlign: 'center',
      containerEnabled: true,
      containerBgColor: 'rgba(0,0,0,0.6)',
      containerBorderRadius: 16,
      containerPadding: 32,
    },
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
              label=""
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
              label=""
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
        animation: {
          label: '动画',
          type: 'select',
          options: [
            { label: '无', value: 'none' },
            { label: '视差滚动', value: 'parallax' },
            { label: '固定背景位置', value: 'fixed' },
            { label: '移动时放大', value: 'scale' },
          ],
        },
      },
    },
    contentSettings: {
      label: '内容设置',
      type: 'object',
      objectFields: {
        languageSwitcher: {
          label: '',
          type: 'language-switcher' as any,
        },
        title: {
          label: '标题',
          type: 'image-banner-title' as any,
        },
        titleFontSize: {
          label: '标题大小 (px)',
          type: 'number',
          min: 20,
          max: 120,
          step: 1,
        },
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        text: {
          label: '文本',
          type: 'image-banner-text' as any,
        },
        textFontSize: {
          label: '文本大小 (px)',
          type: 'number',
          min: 20,
          max: 120,
          step: 1,
        },
        textColor: {
          label: '文本颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        button1Text: {
          label: '按钮 1 文字',
          type: 'image-banner-button1' as any,
        },
        button1Color: {
          label: '按钮 1 颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        button1Link: {
          label: '按钮 1 链接',
          type: 'text',
        },
        button2Text: {
          label: '按钮 2 文字',
          type: 'image-banner-button2' as any,
        },
        button2Color: {
          label: '按钮 2 颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        button2Link: {
          label: '按钮 2 链接',
          type: 'text',
        },
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
            <ColorPickerField field={{}} value={value || 'rgba(0,0,0,0.6)'} onChange={onChange} />
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