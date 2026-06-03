import { Section } from '@/components/webbuilder/blocks/containers/Section';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['Section']> = {
  label: '区块容器',
  category: 'Containers/Layout',

  defaultProps: {
    content: [],
    sizeGroup: {
      containerWidth: 'full',
      containerHeight: 'auto',
    },
    layoutGroup: {
      contentWidth: 'fill',
      direction: 'column',
      gap: 10,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    spacingGroup: {
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
    },
    backgroundGroup: {
      backgroundColor: '',
      backgroundImage: '',
    },
    borderGroup: {
      borderStyle: 'none',
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomLeftRadius: 0,
    },
  },

  fields: {
    sizeGroup: {
      type: 'object',
      label: '尺寸 (容器)',
      objectFields: {
        containerWidth: {
          label: '宽度',
          type: 'select',
          options: [
            { label: '填充网页', value: 'full' },
            { label: '自适应', value: 'auto' },
            { label: '定制', value: 'custom' },
          ],
        },
        customContainerWidth: {
          label: '定制宽度 (px)',
          type: 'number',
          min: 0,
        },
        containerHeight: {
          label: '高度',
          type: 'select',
          options: [
            { label: '填充屏幕', value: 'full' },
            { label: '自适应', value: 'auto' },
            { label: '定制', value: 'custom' },
          ],
        },
        customContainerHeight: {
          label: '定制高度 (px)',
          type: 'number',
          min: 0,
        },
      },
    },

    layoutGroup: {
      type: 'object',
      label: '布局 (内容)',
      objectFields: {
        contentWidth: {
          label: '宽度',
          type: 'radio',
          options: [
            { label: '填充容器', value: 'fill' },
            { label: '定制宽度', value: 'custom' },
          ],
        },
        customContentWidth: {
          label: '定制内容宽度 (px)',
          type: 'number',
          min: 0,
        },
        direction: {
          label: '方向',
          type: 'radio',
          options: [
            { label: '垂直', value: 'column' },
            { label: '水平', value: 'row' },
            { label: '换行', value: 'row-wrap' },
          ],
        },
        gap: {
          label: '间隙 (px)',
          type: 'number',
          min: 0,
        },
        justifyContent: {
          label: '左右对齐',
          type: 'radio',
          options: [
            { label: '居左', value: 'flex-start' },
            { label: '居中', value: 'center' },
            { label: '居右', value: 'flex-end' },
          ],
        },
        alignItems: {
          label: '垂直对齐',
          type: 'radio',
          options: [
            { label: '置顶', value: 'flex-start' },
            { label: '中心', value: 'center' },
            { label: '置底', value: 'flex-end' },
          ],
        },
      },
    },

    spacingGroup: {
      type: 'object',
      label: '间距',
      objectFields: {
        paddingTop: { label: '上内边距 (px)', type: 'number', min: 0 },
        paddingRight: { label: '右内边距 (px)', type: 'number', min: 0 },
        paddingBottom: { label: '下内边距 (px)', type: 'number', min: 0 },
        paddingLeft: { label: '左内边距 (px)', type: 'number', min: 0 },
        marginTop: { label: '上外边距 (px)', type: 'number', min: 0 },
        marginRight: { label: '右外边距 (px)', type: 'number', min: 0 },
        marginBottom: { label: '下外边距 (px)', type: 'number', min: 0 },
        marginLeft: { label: '左外边距 (px)', type: 'number', min: 0 },
      },
    },

    backgroundGroup: {
      type: 'object',
      label: '背景',
      objectFields: {
        backgroundColor: {
          label: '背景颜色',
          type: 'text',
          placeholder: '#ffffff',
        },
        backgroundImage: {
          label: '背景图像',
          type: 'text',
          placeholder: 'https://...',
        },
      },
    },

    borderGroup: {
      type: 'object',
      label: '边框',
      objectFields: {
        borderStyle: {
          label: '边框样式',
          type: 'radio',
          options: [
            { label: '无', value: 'none' },
            { label: '实线', value: 'solid' },
            { label: '虚线1', value: 'dashed' },
            { label: '虚线2', value: 'dotted' },
          ],
        },
        borderTopLeftRadius: { label: '上左圆角 (px)', type: 'number', min: 0 },
        borderTopRightRadius: { label: '上右圆角 (px)', type: 'number', min: 0 },
        borderBottomRightRadius: { label: '下右圆角 (px)', type: 'number', min: 0 },
        borderBottomLeftRadius: { label: '下左圆角 (px)', type: 'number', min: 0 },
      },
    },
  },

  zones: {
    content: { label: '内容' },
  },

  render: ({ content, ...props }) => <Section content={content} {...props} />,
};