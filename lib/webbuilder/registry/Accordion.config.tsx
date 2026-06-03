import type { ComponentConfig } from '@measured/puck';
import { Accordion } from '@/components/webbuilder/blocks/Advanced/Accordion';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { AccordionListField } from '@/components/webbuilder/fields/AccordionListField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import type { AccordionProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<AccordionProps> = {
  label: '手风琴',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    rowTitleColor: '#000000',
    rowTitleFontSize: 20,
    rowTitleAlign: 'left',
    rowHeaderBgColor: '#f3f4f6',
    itemsPerRow: 3,
    itemsGap: 20,
    contentTitleFontSize: 18,
    contentTitleAlign: 'center',
    contentTextFontSize: 14,
    contentTextAlign: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    items: [],
  },
  fields: {
    // 语言切换器：改为 custom 类型
    languageSwitcher: {
      label: '',
      type: 'custom',
      render: () => <LanguageSwitcherField />,
    },

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

    rowGroup: {
      label: '手风琴项目设置',
      type: 'object',
      objectFields: {
        rowTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        rowTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        rowTitleAlign: {
          label: '标题对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        rowHeaderBgColor: {
          label: '页眉背景',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: any }) => (
            <ColorPickerField field={{}} value={value || '#f3f4f6'} onChange={onChange} />
          ),
        },
        itemsPerRow: { label: '每行内容项 (2-4)', type: 'number', min: 2, max: 4, step: 1 },
        itemsGap: { label: '每行内容项间距 (px)', type: 'number', min: 10, max: 50, step: 1 },
      },
    },

    contentGroup: {
      label: '内容列表设置',
      type: 'object',
      objectFields: {
        contentTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        contentTitleAlign: {
          label: '标题对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        contentTextFontSize: { label: '文本大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        contentTextAlign: {
          label: '文本对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
    },

    paddingGroup: {
      label: '填充设置',
      type: 'object',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },

    items: {
      label: '手风琴项目管理',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <AccordionListField value={value} onChange={onChange} />
      ),
    },
  },
  render: ({ puck, ...props }) => <Accordion puck={puck} {...props} />,
};