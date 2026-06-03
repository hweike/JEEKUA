import { VideoCategoryBlock } from '@/components/webbuilder/blocks/video-category/VideoCategoryBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['VideoCategoryBlock']> = {
  label: '视频分类展示',
  defaultProps: {
    showSidebar: true,
    videosPerRow: 3,
  },
  fields: {
    showSidebar: {
      label: '显示侧边栏',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    videosPerRow: {
      label: '每行视频数',
      type: 'number',
      min: 1,
      max: 4,
    },
  },
  render: ({ puck, ...props }) => <VideoCategoryBlock puck={puck as any} {...props as any} />,
};