import type { ComponentConfig } from '@measured/puck';
import { Accordion } from '@/components/webbuilder/blocks/Advanced/Accordion';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import { DEFAULT_ACCORDION } from '@/lib/webbuilder/defaults/Accordion';
import type { AccordionProps } from '@/lib/webbuilder/types';

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createAccordionItemFromTemplate(template: typeof DEFAULT_ACCORDION.items[0]) {
  return {
    id: generateId('accordion-item'),
    title: template.title || '',
    contents: (template.contents || []).map((content: any) => ({
      ...content,
      id: generateId('content'),
    })),
  };
}

function generateDefaultItems(count: number = 3) {
  const template = DEFAULT_ACCORDION.items[0];
  if (!template) return [];
  return Array.from({ length: count }, (_, index) => {
    const item = createAccordionItemFromTemplate(template);
    item.title = `Accordion Title ${index + 1}`;
    return item;
  });
}

export const config: ComponentConfig<AccordionProps> = {
  label: '手风琴',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: DEFAULT_ACCORDION.bannerType,
    backgroundColor: DEFAULT_ACCORDION.backgroundColor,
    rowGroup: { ...DEFAULT_ACCORDION.rowGroup },
    contentGroup: { ...DEFAULT_ACCORDION.contentGroup },
    paddingGroup: { ...DEFAULT_ACCORDION.paddingGroup },
    spacingGroup: { ...DEFAULT_ACCORDION.spacingGroup },
    items: generateDefaultItems(3),
  },
  fields: {
    // ===== 通栏设置 =====
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
      render: ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ===== 手风琴项目设置 =====
    rowGroup: {
      type: 'object',
      label: '手风琴项目设置',
      objectFields: {
        rowTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        rowTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        rowTitleAlign: {
          label: '标题对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        rowHeaderBgColor: {
          label: '页眉背景',
          type: 'custom',
          render: ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => (
            <ColorPickerField field={{}} value={value || '#f3f4f6'} onChange={onChange} />
          ),
        },
        itemsPerRow: { label: '每行内容项 (2-4)', type: 'number', min: 2, max: 4, step: 1 },
        itemsGap: { label: '内容项间距 (px)', type: 'number', min: 10, max: 50, step: 1 },
      } as any,
    },

    // ===== 内容列表全局设置 =====
    contentGroup: {
      type: 'object',
      label: '内容列表全局设置',
      objectFields: {
        contentTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        contentTitleAlign: {
          label: '标题对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        contentTextFontSize: { label: '文本大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        contentTextAlign: {
          label: '文本对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      } as any,
    },

    // ===== 手风琴项目列表 =====
    items: {
      label: '手风琴项目列表',
      type: 'array',
      // 尝试禁用拖拽（如果版本不支持，可能不生效，但不影响功能）
      sortable: false,
      itemLabel: 'List #{index}',
      arrayFields: {
        title: { label: '手风琴标题', type: 'text' },
        _sep3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        } as any,
        contents: {
          label: '内容列表',
          type: 'array',
          // 尝试禁用拖拽
          sortable: false,
          itemLabel: 'Content #{index}',
          arrayFields: {
            imageUrl: {
              label: '图片',
              type: 'custom',
              render: ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => (
                <ImageUpload
                  value={value || ''}
                  onChange={(url) => onChange(typeof url === 'string' ? url : url[0])}
                  maxCount={1}
                  label=""
                  hint="支持上传本地图片或输入网络图片地址"
                  previewAspectRatio="16:9"
                />
              ),
            },
            _sep4: {
              label: '',
              type: 'custom',
              render: () => <div className="h-2 border-b border-gray-200 my-2" />,
            },
            title: { label: '内容标题', type: 'text' },
            paragraph: { label: '内容文本', type: 'textarea' },
            link: { label: '链接 (可选)', type: 'text' },
          } as any,
        },
      } as any, // 绕过 arrayFields 类型检查
    } as any, // 绕过 items 的 ArrayField 类型检查

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

  // ✅ render 直接传递 props，组件内部从 DEFAULT_ACCORDION 读取 mobileScaleFactor
  render: ({ puck, ...props }) => {
    return <Accordion puck={puck} {...props} />;
  },
};