import { Section } from '@/components/webbuilder/blocks/containers/Section';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['Section']> = {
  label: '区块容器',
  category: 'Containers/Layout',

  defaultProps: {
    sizeGroup: {
      containerWidth: 'full',
      // customContainerWidth 移除，避免写入无意义的 160
      containerHeight: 'auto',
      // customContainerHeight 移除
    },
    layoutGroup: {
      contentWidth: 'fill',
      // customContentWidth 移除
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
    // 尺寸分组
    sizeGroup: {
      type: 'group',
      label: '尺寸 (容器)',
      defaultOpen: true,
      objectFields: {
        containerWidth: {
          label: '宽度',
          type: 'button-group',
          options: [
            { label: '填充网页', value: 'full', tooltip: '容器将占据页面全部宽度' },
            { label: '自适应', value: 'auto', disabled: true, tooltip: '适应内容宽度' },
            { label: '定制', value: 'custom', disabled: true, tooltip: '自定义设置宽度' },
          ],
        },
        customContainerWidth: {
          label: '定制宽度',
          type: 'number',
          min: 0,
          suffix: 'px',
          description: '输入具体宽度值，单位像素',
          showIf: (props: any) => props.containerWidth === 'custom',
        },
        containerHeight: {
          label: '高度',
          type: 'button-group',
          options: [
            { label: '填充屏幕', value: 'full', tooltip: '容器将占据屏幕全部高度' },
            { label: '自适应', value: 'auto', tooltip: '适应内容高度' },
            { label: '定制', value: 'custom', tooltip: '自定义设置高度' },
          ],
        },
        customContainerHeight: {
          label: '定制高度',
          type: 'number',
          min: 0,
          suffix: 'px',
          description: '输入具体高度值，单位像素',
          showIf: (props: any) => props.containerHeight === 'custom',
        },
      },
    },

    // 布局分组
    layoutGroup: {
      type: 'group',
      label: '布局 (内容)',
      defaultOpen: true,
      objectFields: {
        contentWidth: {
          label: '宽度',
          description: '填充容器：内容宽度与容器一致；定制宽度：手动设置内容区最大宽度',
          type: 'radio',
          options: [
            { label: '填充容器', value: 'fill' },
            { label: '定制宽度', value: 'custom' },
          ],
        },
        customContentWidth: {
          label: '定制内容宽度 (px)',
          description: '内容区最大宽度，通常配合居中显示',
          type: 'number',
          min: 0,
          suffix: 'px',
          showIf: (props: any) => props.contentWidth === 'custom',
        },
        direction: {
          label: '方向',
          description: '多个组件的排列方向：垂直堆叠、水平排列、水平换行',
          type: 'radio',
          options: [
            { label: '垂直', value: 'column' },
            { label: '水平', value: 'row' },
            { label: '换行', value: 'row-wrap' },
          ],
        },
        gap: {
          label: '间隙',
          description: '组件之间的间距，单位像素',
          type: 'number',
          min: 0,
          suffix: 'px',
        },
        justifyContent: {
          label: '左右对齐',
          description: '内容在水平方向上的对齐方式',
          type: 'radio',
          options: [
            { label: '居左', value: 'flex-start' },
            { label: '居中', value: 'center' },
            { label: '居右', value: 'flex-end' },
          ],
        },
        alignItems: {
          label: '垂直对齐',
          description: '内容在垂直方向上的对齐方式',
          type: 'radio',
          options: [
            { label: '置顶', value: 'flex-start' },
            { label: '中心', value: 'center' },
            { label: '置底', value: 'flex-end' },
          ],
        },
      },
    },

    // 间距分组
    spacingGroup: {
      type: 'group',
      label: '间距',
      objectFields: {
        paddingTop: { label: '上内边距', description: '内容区距离容器上边界的距离 (px)', type: 'number', min: 0, suffix: 'px' },
        paddingRight: { label: '右内边距', description: '内容区距离容器右边界的距离 (px)', type: 'number', min: 0, suffix: 'px' },
        paddingBottom: { label: '下内边距', description: '内容区距离容器下边界的距离 (px)', type: 'number', min: 0, suffix: 'px' },
        paddingLeft: { label: '左内边距', description: '内容区距离容器左边界的距离 (px)', type: 'number', min: 0, suffix: 'px' },
        marginTop: { label: '上外边距', description: '容器与其他组件上方的间距 (px)', type: 'number', min: 0, suffix: 'px' },
        marginRight: { label: '右外边距', description: '容器与其他组件右侧的间距 (px)', type: 'number', min: 0, suffix: 'px' },
        marginBottom: { label: '下外边距', description: '容器与其他组件下方的间距 (px)', type: 'number', min: 0, suffix: 'px' },
        marginLeft: { label: '左外边距', description: '容器与其他组件左侧的间距 (px)', type: 'number', min: 0, suffix: 'px' },
      },
    },

    // 背景分组
    backgroundGroup: {
      type: 'group',
      label: '背景',
      objectFields: {
        backgroundColor: {
          label: '背景颜色',
          description: '支持 HEX 格式，如 #ffffff',
          type: 'color-picker',
          placeholder: '#ffffff',
        },
        backgroundImage: {
          label: '背景图像',
          type: 'background-image',
          description: '输入图片 URL 或点击上传',
          placeholder: 'https://...',
        },
      },
    },

    // 边框分组
    borderGroup: {
      type: 'group',
      label: '边框',
      objectFields: {
        borderStyle: {
          label: '边框样式',
          description: '选择边框类型：无、实线、虚线1（虚线）、虚线2（点线）',
          type: 'radio',
          options: [
            { label: '无', value: 'none' },
            { label: '实线', value: 'solid' },
            { label: '虚线1', value: 'dashed' },
            { label: '虚线2', value: 'dotted' },
          ],
        },
        borderTopLeftRadius: { label: '上左圆角', description: '左上角圆角半径 (px)', type: 'number', min: 0, suffix: 'px' },
        borderTopRightRadius: { label: '上右圆角', description: '右上角圆角半径 (px)', type: 'number', min: 0, suffix: 'px' },
        borderBottomRightRadius: { label: '下右圆角', description: '右下角圆角半径 (px)', type: 'number', min: 0, suffix: 'px' },
        borderBottomLeftRadius: { label: '下左圆角', description: '左下角圆角半径 (px)', type: 'number', min: 0, suffix: 'px' },
      },
    },
  },

  zones: {
    content: { label: '内容' },
  },

  render: ({ puck, children, sizeGroup, layoutGroup, spacingGroup, backgroundGroup, borderGroup, ...props }) => (
    <Section
      puck={puck}
      children={children}
      sizeGroup={sizeGroup}
      spacingGroup={spacingGroup}
      backgroundGroup={backgroundGroup}
      borderGroup={borderGroup}
      direction={layoutGroup?.direction}
      gap={layoutGroup?.gap}
      justifyContent={layoutGroup?.justifyContent}
      alignItems={layoutGroup?.alignItems}
      contentWidth={layoutGroup?.contentWidth}
      customContentWidth={layoutGroup?.customContentWidth}
      {...props}
    />
  ),
};