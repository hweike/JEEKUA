import type { ComponentConfig } from '@measured/puck';
import { FullwidthSlider } from '@/components/webbuilder/blocks/media/FullwidthSlider';
import { DEFAULT_FULLWIDTH_SLIDER } from '@/lib/webbuilder/defaults/FullwidthSlider';
import ImageUpload from '@/components/ImageUpload';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';

export const config: ComponentConfig<any> = {
  label: '全屏通栏幻灯片',
  category: 'Media/Slider',
  defaultProps: {
    bannerType: DEFAULT_FULLWIDTH_SLIDER.bannerType,
    backgroundColor: DEFAULT_FULLWIDTH_SLIDER.backgroundColor,
    height: DEFAULT_FULLWIDTH_SLIDER.height,
    autoplay: DEFAULT_FULLWIDTH_SLIDER.autoplay,
    images: DEFAULT_FULLWIDTH_SLIDER.images,
    paddingGroup: {
      paddingTop: DEFAULT_FULLWIDTH_SLIDER.paddingTop,
      paddingBottom: DEFAULT_FULLWIDTH_SLIDER.paddingBottom,
    },
  },
  fields: {
    // 通栏设置
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
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ===== 图片设置 =====
    images: {
      label: '幻灯片列表',
      type: 'array',
      arrayFields: {
        imageUrl: {
          label: '图片',
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
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        title: { label: '标题', type: 'text' },
        titleFontSize: { label: '标题大小 (px)', type: 'number', min: 16, max: 80, step: 1 },
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        subtitle: { label: '副标题', type: 'text' },
        subtitleFontSize: { label: '副标题大小 (px)', type: 'number', min: 14, max: 60, step: 1 },
        subtitleColor: {
          label: '副标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        _sep3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        buttonText: { label: '按钮文字', type: 'text' },
        buttonLink: { label: '按钮链接', type: 'text' },
        _sep4: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
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
        desktopAlign: {
          label: '桌面端文字对齐',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        mobileAlign: {
          label: '移动端文字对齐',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
      defaultItem: () => ({
        imageUrl: '',
        title: '示例标题',
        titleFontSize: 48,
        titleColor: '#ffffff',
        subtitle: '这是副标题，可根据需要修改',
        subtitleFontSize: 24,
        subtitleColor: '#ffffff',
        buttonText: '了解更多',
        buttonLink: 'https://example.com',
        contentPosition: 'center-center',
        desktopAlign: 'center',
        mobileAlign: 'center',
      }),
    },

    // ===== 高度与轮播设置 =====
    height: {
      label: '幻灯片高度 (px)',
      type: 'number',
      min: 300,
      max: 900,
      step: 10,
    },
    autoplay: {
      label: '自动轮播',
      type: 'radio',
      options: [
        { label: '不轮播（手动切换）', value: 'none' },
        { label: '每 5 秒切换', value: '5s' },
        { label: '每 10 秒切换', value: '10s' },
      ],
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
  render: ({ puck, ...props }) => {
    const { paddingGroup, ...rest } = props;
    return <FullwidthSlider puck={puck} {...rest} {...paddingGroup} />;
  },
};