import type { ComponentConfig } from '@measured/puck';
import { TabbedContentBlock } from '@/components/webbuilder/blocks/tabbed-content/TabbedContentBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import type { TabbedContentBlockProps } from '@/lib/webbuilder/types';

// ✅ 优化 generateId：随机数长度从 4 位增加到 8 位，降低碰撞概率
function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateDefaultTabs() {
  return [
    {
      id: generateId('tab'),
      label: '标签 1',
      items: [
        {
          id: generateId('item'),
          title: '条目标题 1',
          description: '这是条目的描述文本。',
          tag: '',
          tagColor: '#3b82f6',
        },
      ],
      primaryButtonText: '立即体验',
      primaryButtonLink: '',
      outlineButtonText: '了解更多',
      outlineButtonLink: '',
      imageUrl: '',
      floatingIcons: [{ iconUrl: '' }, { iconUrl: '' }, { iconUrl: '' }],
    },
  ];
}

export const config: ComponentConfig<TabbedContentBlockProps> = {
  label: '标签图文切换',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    tabGroup: {
      tabTextColor: '#666666',
      tabActiveColor: '#ffffff',
      tabActiveBorderColor: '#3b82f6',
      tabFontSize: 16,
      tabAlign: 'center',
      // ✅ 新增 8 个字段
      tabBgColor: '#f3f4f6',
      tabActiveBgColor: '#3b82f6',
      tabBorderColor: '#e5e7eb',
      tabActiveBorderColorValue: '#3b82f6',
      tabShowBorder: false,
      tabBorderRadius: 8,
      tabPaddingX: 24,
      tabPaddingY: 10,
    },
    contentGroup: {
      itemTitleColor: '#000000',
      itemTitleFontSize: 24,
      itemDescColor: '#666666',
      itemDescFontSize: 16,
      itemGap: 24,
    },
    buttonGroup: {
      primaryButtonColor: '#3b82f6',
      primaryButtonTextColor: '#ffffff',
      outlineButtonColor: '#3b82f6',
      buttonFontSize: 16,
      buttonPaddingX: 32,
      buttonPaddingY: 12,
      buttonBorderRadius: 8,
    },
    imageGroup: {
      imageWidth: 'medium',
      imageRadius: 12,
      showFloatingIcons: true,
      floatingIconWidth: 64,
      imageHoverZoom: true,
    },
    layoutGroup: {
      contentPosition: 'left',
      verticalAlign: 'center',
    },
    paddingGroup: { paddingTop: 48, paddingBottom: 48 },
    spacingGroup: { mobileScaleFactor: 0.8 },
    tabs: generateDefaultTabs(),
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
      render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ===== 标签栏设置 =====
    tabGroup: {
      type: 'object',
      label: '标签栏设置',
      objectFields: {
        tabTextColor: {
          label: '标签默认文字色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        tabActiveColor: {
          label: '标签激活文字色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        tabBgColor: {
          label: '标签默认背景色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#f3f4f6'} onChange={onChange} />
          ),
        },
        tabActiveBgColor: {
          label: '标签激活背景色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        tabBorderColor: {
          label: '标签边框色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#e5e7eb'} onChange={onChange} />
          ),
        },
        tabActiveBorderColorValue: {
          label: '标签激活边框色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        tabShowBorder: {
          label: '显示边框',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        tabBorderRadius: { label: '圆角 (px)', type: 'number', min: 0, max: 40, step: 2 },
        tabPaddingX: { label: '横向内边距 (px)', type: 'number', min: 8, max: 60, step: 4 },
        tabPaddingY: { label: '纵向内边距 (px)', type: 'number', min: 4, max: 30, step: 2 },
        tabFontSize: { label: '字体大小 (px)', type: 'number', min: 12, max: 40, step: 1 },
        tabAlign: {
          label: '标签对齐',
          type: 'radio',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
    },

    // ===== 内容设置 =====
    contentGroup: {
      type: 'object',
      label: '内容设置',
      objectFields: {
        itemTitleColor: {
          label: '条目标题颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        itemTitleFontSize: { label: '条目标题大小 (px)', type: 'number', min: 14, max: 48, step: 1 },
        itemDescColor: {
          label: '条目描述颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        itemDescFontSize: { label: '条目描述大小 (px)', type: 'number', min: 12, max: 30, step: 1 },
        itemGap: { label: '条目间距 (px)', type: 'number', min: 8, max: 60, step: 4 },
      },
    },

    // ===== 按钮设置 =====
    buttonGroup: {
      type: 'object',
      label: '按钮设置',
      objectFields: {
        primaryButtonColor: {
          label: '主按钮背景色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        primaryButtonTextColor: {
          label: '主按钮文字色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
        outlineButtonColor: {
          label: '边框按钮颜色',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        buttonFontSize: { label: '按钮字体大小 (px)', type: 'number', min: 12, max: 30, step: 1 },
        buttonPaddingX: { label: '按钮横向内边距 (px)', type: 'number', min: 8, max: 80, step: 4 },
        buttonPaddingY: { label: '按钮纵向内边距 (px)', type: 'number', min: 4, max: 40, step: 2 },
        buttonBorderRadius: { label: '按钮圆角 (px)', type: 'number', min: 0, max: 40, step: 2 },
      },
    },

    // ===== 图片设置 =====
    imageGroup: {
      type: 'object',
      label: '图片设置',
      objectFields: {
        imageWidth: {
          label: '图片宽度',
          type: 'radio',
          options: [
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
        imageRadius: { label: '图片圆角 (px)', type: 'number', min: 0, max: 40, step: 2 },
        showFloatingIcons: {
          label: '显示悬浮图标',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
        floatingIconWidth: {
          label: '悬浮图标宽度 (px)',
          type: 'number',
          min: 20,
          max: 200,
          step: 4,
        },
        imageHoverZoom: {
          label: '鼠标悬停放大',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
    },

    // ===== 布局设置 =====
    layoutGroup: {
      type: 'object',
      label: '布局设置',
      objectFields: {
        contentPosition: {
          label: '内容位置',
          type: 'radio',
          options: [
            { label: '左侧', value: 'left' },
            { label: '右侧', value: 'right' },
          ],
        },
        verticalAlign: {
          label: '垂直对齐',
          type: 'radio',
          options: [
            { label: '顶部', value: 'top' },
            { label: '居中', value: 'center' },
            { label: '底部', value: 'bottom' },
          ],
        },
      },
    },

    // ===== 填充设置 =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 200, step: 4 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 200, step: 4 },
      },
    },

    // ===== 间距设置 =====
    spacingGroup: {
      type: 'object',
      label: '间距设置',
      objectFields: {
        mobileScaleFactor: {
          label: '移动端缩放比例',
          type: 'number',
          min: 0.5,
          max: 1.5,
          step: 0.1,
        },
      },
    },

    // ===== 标签数据 =====
    tabs: {
      label: '标签列表（0-6 个）',
      type: 'array',
      arrayFields: {
        label: { label: '标签名称', type: 'text' },
        items: {
          label: '内容条目（1-3 个）',
          type: 'array',
          arrayFields: {
            title: { label: '条目标题', type: 'text' },
            description: { label: '条目描述', type: 'textarea' },
            tag: { label: '小标签', type: 'text' },
            tagColor: {
              label: '小标签颜色',
              type: 'custom',
              render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
                <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
              ),
            },
          },
          defaultItem: () => ({
            id: generateId('item'),
            title: '新条目',
            description: '描述文本',
            tag: '',
            tagColor: '#3b82f6',
          }),
        },
        primaryButtonText: { label: '主按钮文本', type: 'text' },
        primaryButtonLink: { label: '主按钮链接', type: 'text' },
        outlineButtonText: { label: '边框按钮文本', type: 'text' },
        outlineButtonLink: { label: '边框按钮链接', type: 'text' },
        imageUrl: {
          label: '主图',
          type: 'custom',
          render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
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
        floatingIcons: {
          label: '悬浮图标（最多3个）',
          type: 'array',
          arrayFields: {
            iconUrl: {
              label: '图标',
              type: 'custom',
              render: ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
                <ImageUpload
                  value={value || ''}
                  onChange={(url) => onChange(typeof url === 'string' ? url : url[0])}
                  maxCount={1}
                  label=""
                  hint="支持上传本地图片或输入网络图片地址"
                  previewAspectRatio="1:1"
                />
              ),
            },
          },
          defaultItem: () => ({ iconUrl: '' }),
        },
      },
      defaultItem: () => ({
        id: generateId('tab'),
        label: '新标签',
        items: [
          {
            id: generateId('item'),
            title: '新条目',
            description: '描述文本',
            tag: '',
            tagColor: '#3b82f6',
          },
        ],
        primaryButtonText: '立即体验',
        primaryButtonLink: '',
        outlineButtonText: '了解更多',
        outlineButtonLink: '',
        imageUrl: '',
        floatingIcons: [{ iconUrl: '' }, { iconUrl: '' }, { iconUrl: '' }],
      }),
    } as any,
  },
  // ✅ render 处强制断言，绕过 Puck 对 tabs 的类型推断
  render: ({ puck, ...props }) => (
    <TabbedContentBlock puck={puck} {...(props as TabbedContentBlockProps)} />
  ),
};