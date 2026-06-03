import type { ComponentConfig } from '@measured/puck';
import { Multirow } from '@/components/webbuilder/blocks/Advanced/Multirow';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { MultirowListField } from '@/components/webbuilder/fields/MultirowListField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import type { MultirowProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<MultirowProps> = {
  label: '多行',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    imageHeight: 'auto',
    imageWidth: 'medium',
    imagePlacement: 'alternate-left',
    columnBgColor: '#f9fafb',
    columnTitleColor: '#000000',
    columnTitleFontSize: 32,
    columnDescColor: '#666666',
    columnDescFontSize: 16,
    contentVertical: 'middle',
    textAlign: 'left',
    mobileTextAlign: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    items: [],
  },
  fields: {
    // 语言切换器（置顶） - 改为 custom 类型以避免类型错误
    languageSwitcher: {
      label: '',
      type: 'custom',
      render: () => <LanguageSwitcherField />,
    },

    // 通栏设置
    bannerGroup: {
      label: '通栏设置',
      type: 'object',
      objectFields: {
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
      },
    },

    // 图片设置
    imageGroup: {
      label: '图片设置',
      type: 'object',
      objectFields: {
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
        imagePlacement: {
          label: '放置',
          type: 'select',
          options: [
            { label: '从左侧交替', value: 'alternate-left' },
            { label: '从右侧交替', value: 'alternate-right' },
            { label: '左对齐', value: 'left' },
            { label: '右对齐', value: 'right' },
          ],
        },
      },
    },

    // 内容列设置
    contentGroup: {
      label: '内容列设置',
      type: 'object',
      objectFields: {
        columnBgColor: {
          label: '列背景色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />
          ),
        },
        columnTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        columnTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        columnDescColor: {
          label: '描述颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        columnDescFontSize: { label: '描述文本大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        contentVertical: {
          label: '位置',
          type: 'select',
          options: [
            { label: '顶部', value: 'top' },
            { label: '中间', value: 'middle' },
            { label: '底部', value: 'bottom' },
          ],
        },
        textAlign: {
          label: '对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '居中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        mobileTextAlign: {
          label: '移动设备对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '居中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
    },

    // 填充设置
    paddingGroup: {
      label: '填充设置',
      type: 'object',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },

    // 内容行管理
    items: {
      label: '内容行管理',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <MultirowListField value={value} onChange={onChange} />
      ),
    },
  },
  render: ({ puck, ...props }) => <Multirow puck={puck} {...props} />,
};