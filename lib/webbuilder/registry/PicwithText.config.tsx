import type { ComponentConfig } from '@measured/puck';
import { PicwithText } from '@/components/webbuilder/blocks/Advanced/PicwithText';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { PicwithTextTextField } from '@/components/webbuilder/fields/PicwithTextTextField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import ImageUpload from '@/components/ImageUpload';
import type { PicwithTextProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<PicwithTextProps> = {
  label: '图文并排',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    imageUrl: '',
    imageHeight: 'auto',
    imageWidth: 'medium',
    imagePosition: 'left',
    animation: 'none',
    title: { zh: '标题', en: 'Title', textId: '' },
    titleFontSize: 32,
    titleColor: '#000000',
    text: { zh: '文本内容', en: 'Text content', textId: '' },
    textFontSize: 16,
    textColor: '#000000',
    buttonText: { zh: '按钮', en: 'Button', textId: '' },
    buttonFontSize: 16,
    buttonColor: '#000000',
    buttonLink: '',
    contentVertical: 'center',
    textAlign: 'left',
    textAreaBackgroundColor: 'transparent',
    paddingTop: 32,
    paddingBottom: 32,
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
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },
    // 语言切换器：改为 custom 类型
    languageSwitcher: {
      label: '',
      type: 'custom',
      render: () => <LanguageSwitcherField />,
    },
    // 图片设置
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
    // 标题设置：改为 custom 类型
    title: {
      label: '标题',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <PicwithTextTextField value={value} onChange={onChange} label="标题" />
      ),
    },
    titleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
    titleColor: {
      label: '标题颜色',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    // 文本设置：改为 custom 类型
    text: {
      label: '文本',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <PicwithTextTextField value={value} onChange={onChange} label="文本" />
      ),
    },
    textFontSize: { label: '文本大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
    textColor: {
      label: '文本颜色',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    // 按钮设置：改为 custom 类型
    buttonText: {
      label: '按钮文字',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <PicwithTextTextField value={value} onChange={onChange} label="按钮文字" />
      ),
    },
    buttonFontSize: { label: '按钮文字大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
    buttonColor: {
      label: '按钮颜色',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    buttonLink: { label: '按钮链接', type: 'text' },
    contentVertical: {
      label: '内容位置',
      type: 'select',
      options: [
        { label: '顶部', value: 'top' },
        { label: '中间', value: 'center' },
        { label: '底部', value: 'bottom' },
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
    textAreaBackgroundColor: {
      label: '文本区背景色',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || 'transparent'} onChange={onChange} />
      ),
    },
    paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
    paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
  },
  render: ({ puck, ...props }) => <PicwithText puck={puck} {...props} />,
};