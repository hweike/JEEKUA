import type { ComponentConfig } from '@measured/puck';
import { Video } from '@/components/webbuilder/blocks/Advanced/Video';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import type { VideoProps } from '@/lib/webbuilder/types';
import { DEFAULT_VIDEO } from '@/lib/webbuilder/defaults/Video';

export const config: ComponentConfig<VideoProps> = {
  label: '视频',
  category: 'Media/Banner',
  defaultProps: {
    // 直接使用嵌套分组默认值，与 fields 分组结构一致
    bannerType: DEFAULT_VIDEO.bannerType,
    backgroundColor: DEFAULT_VIDEO.backgroundColor,
    titleGroup: { ...DEFAULT_VIDEO.titleGroup },
    videoGroup: { ...DEFAULT_VIDEO.videoGroup },
    paddingGroup: { ...DEFAULT_VIDEO.paddingGroup },
  },
  fields: {
    // 通栏设置（顶层）
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

    // ===== 标题设置 =====
    titleGroup: {
      type: 'object',
      label: '标题设置',
      defaultOpen: true,
      objectFields: {
        title: { label: '标题', type: 'text' },
        titleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
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
      },
    },

    // ===== 视频设置 =====
    videoGroup: {
      type: 'object',
      label: '视频设置',
      defaultOpen: true,
      objectFields: {
        videoUrl: { label: '视频 URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=...' },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-[10px]" />,
        },
        videoThumbnail: {
          label: '视频封面',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ImageUpload
              value={value || ''}
              onChange={(url: string | string[]) => onChange(typeof url === 'string' ? url : url[0])}
              maxCount={1}
              label=""
              hint="支持上传本地图片或输入网络图片地址，将作为视频占位图"
              previewAspectRatio="16:9"
            />
          ),
        },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-[10px]" />,
        },
        loop: {
          label: '循环播放',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
    },

    // ===== 填充设置 =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      defaultOpen: true,
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },
  },
  // 直接透传 props，不展开
  render: ({ puck, ...props }) => <Video puck={puck} {...props} />,
};