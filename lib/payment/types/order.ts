// lib/payment/types/order.ts

// ============================================================
// 基础类型
// ============================================================
// ✅ 订单状态：draft | formal | paid | completed | cancelled
export type OrderStatus = 'draft' | 'formal' | 'paid' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethodType = 'bank_transfer' | 'qr_code' | 'online_payment';
// ✅ 发送状态：sent | unsent
export type SentStatus = 'sent' | 'unsent';

// ============================================================
// ✅ 发货记录类型（存储在 shipping_records JSONB 字段中）
// ============================================================
export interface ShippingRecord {
  id: string;                    // 记录ID（UUID）
  carrier_key: string;           // 关联 carriers 表的 key
  carrier_name_cn: string;       // 承运商中文名称（冗余存储）
  carrier_name_en: string;       // 承运商英文名称（冗余存储）
  tracking_number: string;       // 快递单号
  tracking_image?: string;       // 物流凭证图片
  shipping_method: string;       // 运输方式
  created_at: string;            // 发货时间
}

// ============================================================
// 订单主表
// ============================================================
export interface Order {
  id: string;
  site_id: string;
  order_no: string;          // ✅ 系统订单号（UUID）
  contract_no?: string;      // ✅ 合同号（客户可见）
  customer_id?: string;      // ✅ CRM客户ID
  
  // 买家信息
  buyer_name: string;
  buyer_email: string;
  buyer_company?: string;
  buyer_country?: string;
  buyer_phone?: string;
  buyer_address?: string;
  
  // 支付方式
  payment_method: PaymentMethodType;
  
  // ✅ 选中的收款账号（多选，支持多种支付方式）
  selected_account_ids: string[];  // 选中的收款账号ID列表
  
  // 订单金额
  currency: string;
  sub_total: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  total_amount: number;
  deposit_amount?: number;    // ✅ 预付款金额
  
  // ✅ 发货信息
  shipping_method?: string;          // 运输方式（订单级默认值）
  shipping_date_type?: string;       // deposit | balance | fixed
  shipping_date?: string;            // 指定发货日期（fixed时使用）
  shipping_days?: number;            // ✅ 到账后发货天数（deposit/balance时使用）
  trade_term?: string;
  
  // ✅ 物流追踪信息（旧字段，向后兼容，已废弃）
  tracking_number?: string;          // 【已废弃】物流单号
  carrier?: string;                  // 【已废弃】物流承运商（key）
  carrier_name?: string;             // 【已废弃】承运商英文名称（用于客户显示）
  tracking_image?: string;           // 【已废弃】物流凭证（运单图片地址）
  
  // ✅ 新增：发货记录列表（支持多次发货）
  shipping_records?: ShippingRecord[];  // JSONB 数组
  
  // 账单信息
  expiry_date?: string;
  legal_terms?: string;
  postscript?: string;
  remark?: string;
  
  // 支付信息（PayPal）
  paypal_order_id?: string;
  paypal_payer_id?: string;
  paypal_payment_id?: string;
  payment_status: PaymentStatus;
  paid_at?: string;
  
  // 订单状态
  status: OrderStatus;
  // ✅ 发送状态（新增）
  sent_status: SentStatus;
  share_token?: string;
  share_view_count: number;
  
  // 操作记录
  created_by?: string;
  sent_at?: string;
  cancelled_at?: string;
  expired_at?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================
// 订单商品明细
// ============================================================
export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  locale?: string;
  
  product_name: string;
  product_image?: string;
  category?: string;
  specification?: string;
  sku?: string;
  
  price: number;
  quantity: number;
  unit: string;
  total: number;
  
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 订单详情（含关联数据）
// ============================================================
export interface OrderDetail extends Order {
  items: OrderItem[];
  status_logs?: OrderStatusLog[];
}

// ============================================================
// 订单状态日志
// ============================================================
export interface OrderStatusLog {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  operator?: string;
  note?: string;
  created_at: string;
}

// ============================================================
// 创建订单商品输入
// ============================================================
export interface CreateOrderItemInput {
  product_id?: string;
  locale?: string;  // ✅ 新增（服务层需要）
  product_name: string;
  product_image?: string;
  category?: string;
  specification?: string;
  sku?: string;
  price: number;
  quantity: number;
  unit?: string;
}

// ============================================================
// 创建订单输入
// ============================================================
export interface CreateOrderInput {
  // 买家信息
  buyer_name: string;
  buyer_email: string;
  buyer_company?: string;
  buyer_country?: string;
  buyer_phone?: string;
  buyer_address?: string;
  customer_id?: string;        // ✅ CRM客户ID
  
  // 支付方式
  payment_method?: PaymentMethodType;
  
  // ✅ 选中的收款账号（多选，支持多种支付方式）
  selected_account_ids?: string[];  // 选中的收款账号ID列表
  
  // 账单信息
  order_no?: string;           // ✅ 保留
  contract_no?: string;        // ✅ 用户可指定合同号
  expiry_date?: string;
  currency?: string;
  items: CreateOrderItemInput[];
  
  // ✅ 金额字段（新增 sub_total）
  sub_total?: number;          // ✅ 新增（服务层需要）
  discount?: number;
  shipping_fee?: number;
  tax?: number;
  
  // 发货信息
  shipping_method?: string;
  shipping_date_type?: string;
  shipping_date?: string;
  shipping_days?: number;      // ✅ 到账后发货天数
  trade_term?: string;
  
  // ✅ 物流追踪信息（旧字段，向后兼容）
  tracking_number?: string;    // ✅ 物流单号
  carrier?: string;            // ✅ 物流承运商（key）
  tracking_image?: string;     // ✅ 物流凭证（运单图片地址）
  
  // 其他信息
  legal_terms?: string;
  postscript?: string;
  remark?: string;
}

// ============================================================
// 更新订单输入
// ============================================================
export interface UpdateOrderInput {
  // 基本信息
  buyer_name?: string;
  buyer_email?: string;
  buyer_company?: string;
  buyer_country?: string;
  buyer_phone?: string;
  buyer_address?: string;
  customer_id?: string;        // ✅ CRM客户ID
  
  // ✅ 金额字段（新增 sub_total）
  sub_total?: number;          // ✅ 新增（服务层需要）
  discount?: number;
  shipping_fee?: number;
  tax?: number;
  
  // 发货信息
  shipping_method?: string;
  shipping_date_type?: string;
  shipping_date?: string;
  shipping_days?: number;      // ✅ 到账后发货天数
  trade_term?: string;
  
  // ✅ 物流追踪信息（旧字段，向后兼容）
  tracking_number?: string;    // ✅ 物流单号
  carrier?: string;            // ✅ 物流承运商（key）
  tracking_image?: string;     // ✅ 物流凭证（运单图片地址）
  
  // 其他信息
  legal_terms?: string;
  postscript?: string;
  remark?: string;
  
  // 账单信息
  contract_no?: string;
  expiry_date?: string;
  currency?: string;
  
  // ✅ 选中的收款账号（多选，支持多种支付方式）
  selected_account_ids?: string[];  // 选中的收款账号ID列表
  
  // ✅ 商品列表（复用 CreateOrderItemInput）
  items?: CreateOrderItemInput[];   // ✅ 新增（服务层需要）
}

// ============================================================
// ✅ 确认发货输入
// ============================================================
export interface ConfirmShippingInput {
  // 单条发货记录（用于首次发货）
  shippingMethod?: string;
  trackingNumber?: string;
  carrierKey?: string;
  carrierName?: string;
  trackingImage?: string;
  
  // ✅ 新增：追加发货记录（用于多次发货）
  shippingRecord?: Omit<ShippingRecord, 'id' | 'created_at'>;
}

// ============================================================
// 订单列表查询参数
// ============================================================
export interface OrderListParams {
  site_id: string;
  status?: string | string[];
  sent_status?: string | string[];
  keyword?: string;
  country?: string;           // ✅ 国家筛选
  created_by?: string;        // ✅ 业务员筛选
  buyer_email?: string;    // ✅ 新增：买家邮箱（用户中心用）
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// ============================================================
// 订单列表返回结果
// ============================================================
export interface OrderListResult {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}