// lib/payment/index.ts

// ============================================================
// 类型导出 - 使用 export type 避免歧义
// ============================================================
// Account 类型
export type {
  PaymentAccount,
  PaymentMethodType,
  AccountType,
  CreateAccountInput,
  UpdateAccountInput,
} from './types/account';

// Order 类型
export type {
  Order,
  OrderDetail,
  OrderItem,
  OrderStatusLog,
  CreateOrderInput,
  CreateOrderItemInput,
  UpdateOrderInput,
  OrderListParams,
  OrderListResult,
  PaymentStatus,
  SentStatus,
  OrderStatus,
} from './types/order';

// Carrier 类型
export type {
  Carrier,
  CreateCarrierInput,
  UpdateCarrierInput,
} from './types/carrier';

// ============================================================
// 常量导出
// ============================================================
// Account 常量
export {
  ACCOUNT_TEMPLATES,
  PRESET_ACCOUNTS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  CURRENCY_OPTIONS,
  getTemplatesByType,
  getTemplateByValue,
} from './types/account';

// Order 常量（从 constants 导出）
export {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_BADGE_STYLES,
  ORDER_ACTIONS,
  ORDER_ACTION_LABELS,
  ORDER_ACTION_ICONS,
  ORDER_ACTION_STYLES,
  VIEW_STATUS_FILTERS,
  VIEW_STATUS_MAP,
  ORDER_PRIMARY_ACTIONS,
  ORDER_SENT_STATUS,
  ORDER_SENT_STATUS_LABELS,
  ORDER_SENT_STATUS_COLORS,
} from './constants';

// ============================================================
// 服务导出
// ============================================================
export { accountService } from './services/account.service';
export { orderService } from './services/order.service';
export { orderItemService } from './services/order-item.service';
export { carrierService } from './services/carrier.service';

// ============================================================
// 工具函数导出
// ============================================================
export { generateShareToken } from './utils/share-token';

// ============================================================
// 订单状态辅助函数
// ============================================================
export {
  getStatusLabel,
  getStatusColor,
  isEditable,
  isDeletable,
  isShareable,
  isPayable,
  canTransition,
  getNextStatuses,
  canCancel,
  canSubmit,
  canPay,
  canConfirmShipping,
  canReorder,
  isOrderSent,
} from './order-status';

// ============================================================
// ✅ 国家工具函数 - 从 lib/countries.ts 导入
// ============================================================
export {
  COUNTRIES,
  getCountryByCode,
  getCountryByNameEn,
  getCountryByNameZh,
  getCountryNameZh,
  getCountryNameEn,
  getCountryFlag,
  getCountryDisplay,
  getAllCountryCodes,
  getPhoneCodeMap,
  getPhoneCode,
} from '../countries';