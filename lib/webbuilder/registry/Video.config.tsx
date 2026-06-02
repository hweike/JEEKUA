import type { ComponentConfig } from '@measured/puck';
import { Video } from '@/components/webbuilder/blocks/Advanced/Video';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { VideoTextField } from '@/components/webbuilder/fields/VideoTextField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import ImageUpload from '@/components/ImageUpload';
import type { VideoProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<VideoProps> = {
  label: '视频',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    title: { zh: '视频标题', en: 'Video Title', textId: '' },
    titleFontSize: 32,
    titleColor: '#000000',
    titleAlign: 'center',
    videoUrl: '',
    videoThumbnail: '',
    loop: false,
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
      label: '背景色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />,
    },
    languageSwitcher: {
      label: '',
      type: 'language-switcher',
    },
    title: { label: '标题', type: 'video-title' },
    titleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
    titleColor: {
      label: '标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
    },
    titleAlign: {
      label: '标题位置',
      type: 'radio',
      options: [
        { label: '左', value: 'left' },
        { label: '中', value: 'center' },
        { label: '右', value: 'right' },
      ],
    },
    videoUrl: { label: '视频 URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=...' },
    videoThumbnail: {
      label: '视频封面',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ImageUpload
          value={value || ''}
          onChange={onChange}
          maxCount={1}
          label=""
          hint="支持上传本地图片或输入网络图片地址，将作为视频占位图"
          previewAspectRatio="16:9"
        />
      ),
    },
    loop: {
      label: '循环播放',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
    paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
  },
  render: ({ puck, ...props }) => <Video puck={puck} {...props} />,
};