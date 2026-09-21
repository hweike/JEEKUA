import type { ComponentConfig } from '@measured/puck';
import { PricingBlock } from '@/components/webbuilder/blocks/pricing/PricingBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import type { PricingBlockProps } from '@/lib/webbuilder/types';

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// 默认 3 个卡片（与语雀定价页一致）
function generateDefaultCards() {
  return [
    {
      id: generateId('card'),
      title: '标准版',
      description: '免费试用文档、知识库、团队等基础能力，体验新一代知识协同工具',
      badge: '',
      badgeColor: '#3b82f6',
      rightsTitle: '核心权益',
      rights: [
        '最多支持 10 人、100 团队',
        '新建文稿数 100 篇/月',
        '知识库、文档基础功能',
        '团队协作能力',
      ],
      price: '¥0/空间/年',
      priceFontSize: 32,
      priceColor: '#000000',
      buttonText: '开始使用',
      buttonLink: '',
      buttonVisible: true,
      buttonColor: '#3b82f6',
      isRecommended: false,
      contactText: '',
      contactLink: '',
    },
    {
      id: generateId('card'),
      title: '专业版',
      description: '面向知识型组织的团队协作工具，文档知识库、团队协作能力一应俱全。',
      badge: '适合团队',
      badgeColor: '#3b82f6',
      rightsTitle: '核心权益',
      rights: [
        '无限文稿数',
        '无限使用 AI 助手',
        '完整的知识创作能力',
        '话题、任务等团队协作能力',
        '钉钉通讯录绑定',
        '知识库安全管控措施',
        '成员与权限管理',
      ],
      price: '¥99/人/年',
      priceFontSize: 32,
      priceColor: '#000000',
      buttonText: '免费试用 15 天',
      buttonLink: '',
      buttonVisible: true,
      buttonColor: '#3b82f6',
      isRecommended: true,
      contactText: '联系我们',
      contactLink: '',
    },
    {
      id: generateId('card'),
      title: '旗舰版',
      description: '全功能全企业版本，适用于对组织管理有更高要求的企业。',
      badge: '适合企业',
      badgeColor: '#8b5cf6',
      rightsTitle: '核心权益',
      rights: [
        '包含专业版所有能力',
        '安全管控措施（操作日志、空间水印）',
        '更高的内容安全级别（白名单访问）',
        'API 与 Webhook 支持',
      ],
      price: '¥199/人/年',
      priceFontSize: 32,
      priceColor: '#000000',
      buttonText: '免费试用 15 天',
      buttonLink: '',
      buttonVisible: true,
      buttonColor: '#3b82f6',
      isRecommended: false,
      contactText: '联系我们',
      contactLink: '',
    },
  ];
}

export const config: ComponentConfig<PricingBlockProps> = {
  label: '卡片价格',
  category: 'Product',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    cardBgColor: '#ffffff',
    cardBorderColor: '#e5e7eb',
    cardHoverBorderColor: '#3b82f6',
    recommendedBorderColor: '#3b82f6',
    recommendedBgColor: '#f0f9ff',
    titleColor: '#000000',
    titleFontSize: 32,
    descColor: '#666666',
    descFontSize: 16,
    rightsTitleColor: '#000000',
    rightsTitleFontSize: 18,
    rightsTextColor: '#666666',
    rightsTextFontSize: 14,
    checkIconColor: '#22c55e',
    columns: 3,
    cardGap: 20,
    headerImageUrl: '',
    headerImageHeight: 200,
    headerOverlayColor: 'rgba(0,0,0,0.5)',
    headerTitle: '',
    headerTitleColor: '#ffffff',
    headerTitleFontSize: 40,
    headerSubtitle: '',
    headerSubtitleColor: '#ffffff',
    headerSubtitleFontSize: 20,
    paddingTop: 48,
    paddingBottom: 48,
    cards: generateDefaultCards(),
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
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ===== 头部设置 =====
    headerImageUrl: {
      label: '头部背景图',
      type: 'custom',
      render: ({ value, onChange }) => (
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
    headerImageHeight: { label: '头部高度 (px)', type: 'number', min: 100, max: 600, step: 10 },
    headerOverlayColor: {
      label: '头部遮罩色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || 'rgba(0,0,0,0.5)'} onChange={onChange} />
      ),
    },
    headerTitle: { label: '头部标题', type: 'text' },
    headerTitleColor: {
      label: '头部标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },
    headerTitleFontSize: { label: '头部标题大小 (px)', type: 'number', min: 16, max: 120, step: 1 },
    headerSubtitle: { label: '头部副标题', type: 'text' },
    headerSubtitleColor: {
      label: '头部副标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },
    headerSubtitleFontSize: { label: '头部副标题大小 (px)', type: 'number', min: 12, max: 60, step: 1 },

    // ===== 卡片全局样式 =====
    cardBgColor: {
      label: '卡片背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },
    cardBorderColor: {
      label: '卡片边框色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#e5e7eb'} onChange={onChange} />
      ),
    },
    cardHoverBorderColor: {
      label: '卡片悬停边框色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
      ),
    },
    recommendedBorderColor: {
      label: '推荐卡片边框色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
      ),
    },
    recommendedBgColor: {
      label: '推荐卡片背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#f0f9ff'} onChange={onChange} />
      ),
    },
    columns: {
      label: '列数',
      type: 'select',
      options: [
        { label: '2 列', value: 2 },
        { label: '3 列', value: 3 },
        { label: '4 列', value: 4 },
      ],
    },
    cardGap: { label: '卡片间距 (px)', type: 'number', min: 0, max: 60, step: 4 },

    // ===== 字体样式 =====
    titleColor: {
      label: '版本标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    titleFontSize: { label: '版本标题大小 (px)', type: 'number', min: 16, max: 60, step: 1 },
    descColor: {
      label: '描述颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
      ),
    },
    descFontSize: { label: '描述大小 (px)', type: 'number', min: 12, max: 30, step: 1 },
    rightsTitleColor: {
      label: '权益标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    rightsTitleFontSize: { label: '权益标题大小 (px)', type: 'number', min: 12, max: 40, step: 1 },
    rightsTextColor: {
      label: '权益文本颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
      ),
    },
    rightsTextFontSize: { label: '权益文本大小 (px)', type: 'number', min: 10, max: 30, step: 1 },
    checkIconColor: {
      label: '勾选图标颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#22c55e'} onChange={onChange} />
      ),
    },

    // ===== 填充 =====
    paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 200, step: 4 },
    paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 200, step: 4 },

    // ===== 卡片列表 =====
    cards: {
      label: '价格方案',
      type: 'array',
      arrayFields: {
        title: { label: '版本名称', type: 'text' },
        description: { label: '版本描述', type: 'textarea' },
        badge: { label: '徽标文本', type: 'text' },
        badgeColor: {
          label: '徽标颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        rightsTitle: { label: '权益标题', type: 'text' },
        rights: {
          label: '权益列表',
          type: 'array',
          arrayFields: {
            text: { label: '权益内容', type: 'text' },
          },
        },
        price: { label: '价格文本', type: 'text' },
        priceFontSize: { label: '价格字体大小 (px)', type: 'number', min: 16, max: 80, step: 1 },
        priceColor: {
          label: '价格颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        buttonText: { label: '按钮文本', type: 'text' },
        buttonLink: { label: '按钮链接', type: 'text' },
        buttonVisible: { label: '显示按钮', type: 'radio', options: [{ label: '是', value: true }, { label: '否', value: false }] },
        buttonColor: {
          label: '按钮颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#3b82f6'} onChange={onChange} />
          ),
        },
        isRecommended: { label: '推荐（高亮）', type: 'radio', options: [{ label: '是', value: true }, { label: '否', value: false }] },
        contactText: { label: '底部联系文本', type: 'text' },
        contactLink: { label: '底部联系链接', type: 'text' },
      },
      defaultItem: () => ({
        id: generateId('card'),
        title: '新版本',
        description: '版本描述',
        badge: '',
        badgeColor: '#3b82f6',
        rightsTitle: '核心权益',
        rights: [{ text: '权益 1' }],
        price: '¥0/年',
        priceFontSize: 32,
        priceColor: '#000000',
        buttonText: '开始使用',
        buttonLink: '',
        buttonVisible: true,
        buttonColor: '#3b82f6',
        isRecommended: false,
        contactText: '',
        contactLink: '',
      }),
    },
  },
  render: ({ puck, ...props }) => <PricingBlock puck={puck} {...props} />,
};