// lib/payment/constants.ts

// ============================================================
// 订单状态
// ============================================================
export const ORDER_STATUS = {
  DRAFT: 'draft',
  FORMAL: 'formal',
  PAID: 'paid',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: '草稿',
  formal: '正式订单',
  paid: '已付款',
  completed: '已完成',
  cancelled: '已取消',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  formal: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const ORDER_STATUS_BADGE_STYLES: Record<OrderStatus, string> = {
  draft: 'border-gray-300 text-gray-500',
  formal: 'border-blue-300 text-blue-600',
  paid: 'border-green-300 text-green-600',
  completed: 'border-emerald-300 text-emerald-600',
  cancelled: 'border-gray-300 text-gray-400',
};

// ============================================================
// ✅ 发送状态（新增）
// ============================================================
export const ORDER_SENT_STATUS = {
  SENT: 'sent',
  UNSENT: 'unsent',
} as const;

export type OrderSentStatus = typeof ORDER_SENT_STATUS[keyof typeof ORDER_SENT_STATUS];

export const ORDER_SENT_STATUS_LABELS: Record<OrderSentStatus, string> = {
  sent: '已发送',
  unsent: '未发送',
};

export const ORDER_SENT_STATUS_COLORS: Record<OrderSentStatus, string> = {
  sent: 'bg-green-100 text-green-700',
  unsent: 'bg-gray-100 text-gray-500',
};

// ============================================================
// ✅ 视图筛选标签配置
// ============================================================
export const VIEW_STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'sent', label: '已发送' },
  { value: 'pending', label: '待付款' },
  { value: 'paid', label: '准备发货' },
  { value: 'completed', label: '已完成' },
  { value: 'expired', label: '已过期' },
  { value: 'cancelled', label: '已取消' },
];

// ✅ 视图状态映射到数据库查询条件
export const VIEW_STATUS_MAP: Record<string, { status?: string[]; sent_status?: string[]; expired?: boolean }> = {
  'all': { status: ['draft', 'formal', 'paid', 'completed', 'cancelled'] },
  'draft': { status: ['draft'] },
  'sent': { sent_status: ['sent'] },
  'pending': { status: ['formal'], sent_status: ['sent'] },
  'paid': { status: ['paid'] },
  'completed': { status: ['completed'] },
  'expired': { status: ['formal'], sent_status: ['sent'], expired: true },
  'cancelled': { status: ['cancelled'] },
};

// ============================================================
// ✅ 状态对应的操作按钮配置
// ============================================================
export const ORDER_ACTIONS: Record<string, string[]> = {
  draft: ['edit', 'delete', 'submit'],
  formal: ['view', 'recall', 'cancel'],
  paid: ['view', 'cancel', 'confirm_shipping'],
  completed: ['view', 'reorder'],
  cancelled: ['view', 'delete', 'duplicate'],
};

// ✅ 操作按钮显示名称
export const ORDER_ACTION_LABELS: Record<string, string> = {
  edit: '编辑',
  delete: '删除',
  submit: '确认发送',
  view: '查看',
  recall: '撤回',
  cancel: '取消',
  confirm_payment: '确认收款',
  confirm_shipping: '确认发货',
  reorder: '再来一单',
  duplicate: '复制',
  copy_link: '复制账单链接',
  download_pdf: '下载PI/账单',
};

// ✅ 操作按钮图标名称（用于图标映射）
export const ORDER_ACTION_ICONS: Record<string, string> = {
  edit: 'Edit',
  delete: 'Trash2',
  submit: 'Send',
  view: 'Eye',
  recall: 'Undo2',
  cancel: 'XCircle',
  confirm_payment: 'CheckCircle',
  confirm_shipping: 'Truck',
  reorder: 'RotateCcw',
  duplicate: 'Copy',
  copy_link: 'Copy',
  download_pdf: 'FileText',
};

// ✅ 操作按钮颜色/样式
export const ORDER_ACTION_STYLES: Record<string, string> = {
  edit: 'text-blue-600 hover:text-blue-800',
  delete: 'text-red-600 hover:text-red-800',
  submit: 'text-green-600 hover:text-green-800',
  view: 'text-blue-600 hover:text-blue-800',
  recall: 'text-orange-600 hover:text-orange-800',
  cancel: 'text-red-600 hover:text-red-800',
  confirm_payment: 'text-green-600 hover:text-green-800',
  confirm_shipping: 'text-indigo-600 hover:text-indigo-800',
  reorder: 'text-purple-600 hover:text-purple-800',
  duplicate: 'text-gray-600 hover:text-gray-800',
  copy_link: 'text-blue-600 hover:text-blue-800',
  download_pdf: 'text-blue-600 hover:text-blue-800',
};

// ============================================================
// ✅ 主按钮配置（根据状态）
// ============================================================
export const ORDER_PRIMARY_ACTIONS: Record<string, { label: string; action: string; color: string }> = {
  draft: { label: '确认发送', action: 'submit', color: 'bg-blue-600 hover:bg-blue-700' },
  formal: { label: '确认收款', action: 'confirm_payment', color: 'bg-green-600 hover:bg-green-700' },
  paid: { label: '确认发货', action: 'confirm_shipping', color: 'bg-indigo-600 hover:bg-indigo-700' },
  completed: { label: '再来一单', action: 'reorder', color: 'bg-purple-600 hover:bg-purple-700' },
  cancelled: { label: '复制', action: 'duplicate', color: 'bg-gray-600 hover:bg-gray-700' },
};

// ============================================================
// 支付相关
// ============================================================
export const PAYMENT_TYPE = {
  BANK_TRANSFER: 'bank_transfer',
  ONLINE_PAYMENT: 'online_payment',
} as const;

export const PAYMENT_METHOD = {
  TT: 'tt',
  PAYPAL: 'paypal',
  CREDIT_CARD: 'credit_card',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  tt: 'TT银行转账',
  paypal: 'PayPal',
  credit_card: '信用卡',
};

// ============================================================
// 默认值
// ============================================================
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_ORDER_ITEMS = 100;

export const SHARE_TOKEN_LENGTH = 32;
export const SHARE_TOKEN_EXPIRY_DAYS = 30;