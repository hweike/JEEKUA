// lib/payment/services/order.service.ts
import { supabase } from '@/lib/supabase/client';
import { generateShareToken } from '../utils/share-token';
import type { Order, OrderDetail, CreateOrderInput, UpdateOrderInput, OrderListParams, OrderListResult, ShippingRecord } from '../types/order';

// ============================================================
// ✅ 产品 slug 内存缓存
// ============================================================
const productSlugCache = new Map<string, { slug: string; timestamp: number }>();
const PRODUCT_SLUG_CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * ✅ 批量获取产品 slug（带内存缓存）
 * 独立方法，可被 listWithItems、getById、getByShareToken 等复用
 */
async function getProductSlugs(productIds: string[]): Promise<Record<string, string>> {
  if (!productIds || productIds.length === 0) return {};
  
  const uniqueIds = [...new Set(productIds)];
  const result: Record<string, string> = {};
  const uncachedIds: string[] = [];
  const now = Date.now();

  // 1. 从缓存读取
  for (const id of uniqueIds) {
    const cached = productSlugCache.get(id);
    if (cached && (now - cached.timestamp) < PRODUCT_SLUG_CACHE_TTL) {
      result[id] = cached.slug;
    } else {
      uncachedIds.push(id);
    }
  }

  // 2. 查询未缓存的数据
  if (uncachedIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('productId, slug')
        .in('productId', uncachedIds);

      if (!error && data) {
        data.forEach((item: any) => {
          if (item.productId) {
            const slug = item.slug || '';
            result[item.productId] = slug;
            productSlugCache.set(item.productId, { slug, timestamp: now });
          }
        });
      }
    } catch (error) {
      console.warn('[getProductSlugs] 查询失败:', error);
    }
  }

  // 3. 未查到的产品，缓存空字符串（避免重复查询不存在的 productId）
  for (const id of uncachedIds) {
    if (!result[id]) {
      productSlugCache.set(id, { slug: '', timestamp: now });
    }
  }

  return result;
}

/**
 * ✅ 为订单商品批量附加产品 slug（优化版）
 * 使用内存缓存，减少数据库查询
 */
async function enrichItemsWithSlugOptimized(items: any[]): Promise<any[]> {
  if (!items || items.length === 0) return items;

  // 提取所有 product_id
  const productIds = items
    .map(item => item.product_id)
    .filter((id): id is string => id !== null && id !== undefined && id !== '');

  if (productIds.length === 0) return items;

  // ✅ 使用缓存批量获取 slug
  const slugMap = await getProductSlugs(productIds);

  // 为每个 item 附加 slug
  return items.map((item: any) => ({
    ...item,
    slug: slugMap[item.product_id] || '',
  }));
}

// ============================================================
// ✅ 辅助函数：异步记录订单状态日志（不阻塞主流程）
// ============================================================
async function logOrderStatus(
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  operator: string,
  note: string
): Promise<void> {
  try {
    await supabase.from('order_status_logs').insert({
      order_id: orderId,
      from_status: fromStatus,
      to_status: toStatus,
      operator: operator || 'system',
      note: note || '',
    });
  } catch (error) {
    console.warn(`[orderStatusLog] 日志记录失败 (${fromStatus}→${toStatus}):`, error);
  }
}

// ============================================================
// ✅ 辅助函数：生成发货记录ID
// ============================================================
function generateShippingRecordId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ============================================================
// ✅ 辅助函数：构建单条发货记录
// ============================================================
function buildShippingRecord(
  carrierKey: string,
  carrierNameCn: string,
  carrierNameEn: string,
  trackingNumber: string,
  shippingMethod: string,
  trackingImage?: string
): ShippingRecord {
  return {
    id: generateShippingRecordId(),
    carrier_key: carrierKey || '',
    carrier_name_cn: carrierNameCn || '',
    carrier_name_en: carrierNameEn || '',
    tracking_number: trackingNumber || '',
    shipping_method: shippingMethod || '',
    tracking_image: trackingImage || '',
    created_at: new Date().toISOString(),
  };
}

/**
 * 生成系统订单号（纯数字格式）
 * 格式: 时间戳(13位) + 4位随机数 = 17位纯数字
 */
function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return timestamp + random;
}

/**
 * 生成默认合同号
 * 格式: PI-YYYYMMDD-XXXX
 */
async function generateDefaultContractNo(siteId: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  const { data, error } = await supabase
    .from('orders')
    .select('contract_no')
    .eq('site_id', siteId)
    .ilike('contract_no', `PI-${dateStr}-%`)
    .order('contract_no', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (!error && data && data.length > 0) {
    const last = data[0].contract_no;
    if (last) {
      const parts = last.split('-');
      const lastPart = parts[parts.length - 1];
      const lastSeq = parseInt(lastPart, 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
  }

  return `PI-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * 验证并确保合同号唯一
 */
async function ensureUniqueContractNo(
  siteId: string, 
  contractNo: string, 
  retryCount: number = 0
): Promise<string> {
  if (retryCount > 3) {
    return `${contractNo}-${Date.now().toString().slice(-6)}`;
  }

  const { data: existing, error } = await supabase
    .from('orders')
    .select('contract_no')
    .eq('site_id', siteId)
    .eq('contract_no', contractNo)
    .maybeSingle();

  if (error) {
    console.error('检查合同号失败:', error);
    return contractNo;
  }

  if (existing) {
    const timestamp = Date.now().toString().slice(-6);
    const newContractNo = `${contractNo}-${timestamp}`;
    return ensureUniqueContractNo(siteId, newContractNo, retryCount + 1);
  }

  return contractNo;
}

export const orderService = {
  /**
 * ✅ 获取订单列表（分页 + 筛选）
 * 支持按 created_by（后台）或 buyer_email（用户中心）筛选
 */
async list(params: OrderListParams): Promise<OrderListResult> {
  const { site_id, status, keyword, country, created_by, buyer_email, start_date, end_date, page = 1, page_size = 20 } = params;
  
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('site_id', site_id);

  if (status && status !== 'all') {
    if (Array.isArray(status) && status.length > 0) {
      query = query.in('status', status);
    } else if (typeof status === 'string' && status !== 'all') {
      query = query.eq('status', status);
    }
  }

  if (params.sent_status && Array.isArray(params.sent_status) && params.sent_status.length > 0) {
    query = query.in('sent_status', params.sent_status);
  } else if (params.sent_status && typeof params.sent_status === 'string' && params.sent_status !== 'all') {
    query = query.eq('sent_status', params.sent_status);
  }

  if (country) {
    query = query.eq('buyer_country', country);
  }

  if (created_by) {
    query = query.eq('created_by', created_by);
  }

  // ✅ 支持按买家邮箱筛选（用户中心用）
  if (buyer_email) {
    query = query.eq('buyer_email', buyer_email);
  }

  if (keyword) {
    query = query.or(`order_no.ilike.%${keyword}%,contract_no.ilike.%${keyword}%,buyer_name.ilike.%${keyword}%,buyer_email.ilike.%${keyword}%`);
  }

  if (start_date) {
    query = query.gte('created_at', start_date);
  }
  if (end_date) {
    query = query.lte('created_at', end_date);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`获取订单列表失败: ${error.message}`);

  return {
    items: data || [],
    total: count || 0,
    page,
    page_size,
    total_pages: Math.ceil((count || 0) / page_size),
  };
},

  /**
 * ✅ 获取订单列表（含商品信息）- 优化版
 * 支持按 created_by（后台）或 buyer_email（用户中心）筛选
 * 批量查询所有商品，一次性获取 slug
 */
async listWithItems(params: OrderListParams): Promise<OrderListResult> {
  const { site_id, status, keyword, country, created_by, buyer_email, start_date, end_date, page = 1, page_size = 20 } = params;
  
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('site_id', site_id);

  if (status && status !== 'all') {
    if (Array.isArray(status) && status.length > 0) {
      query = query.in('status', status);
    } else if (typeof status === 'string' && status !== 'all') {
      query = query.eq('status', status);
    }
  }

  if (params.sent_status && Array.isArray(params.sent_status) && params.sent_status.length > 0) {
    query = query.in('sent_status', params.sent_status);
  } else if (params.sent_status && typeof params.sent_status === 'string' && params.sent_status !== 'all') {
    query = query.eq('sent_status', params.sent_status);
  }

  if (country) {
    query = query.eq('buyer_country', country);
  }

  if (created_by) {
    query = query.eq('created_by', created_by);
  }

  // ✅ 支持按买家邮箱筛选（用户中心用）
  if (buyer_email) {
    query = query.eq('buyer_email', buyer_email);
  }

  if (keyword) {
    query = query.or(`order_no.ilike.%${keyword}%,contract_no.ilike.%${keyword}%,buyer_name.ilike.%${keyword}%,buyer_email.ilike.%${keyword}%`);
  }

  if (start_date) {
    query = query.gte('created_at', start_date);
  }
  if (end_date) {
    query = query.lte('created_at', end_date);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const { data: orders, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`获取订单列表失败: ${error.message}`);

  if (!orders || orders.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      page_size,
      total_pages: 0,
    };
  }

  const orderIds = orders.map(o => o.id);
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)
    .order('sort_order');

  if (itemsError) {
    console.warn('获取订单商品失败:', itemsError);
  }

  // ✅ 优化：收集所有 product_id，一次性批量查询 slug
  const allProductIds = (items || [])
    .map(item => item.product_id)
    .filter((id): id is string => id !== null && id !== undefined && id !== '');
  
  const slugMap = await getProductSlugs(allProductIds);

  // ✅ 为每个商品附加 slug
  const itemsWithSlug = (items || []).map((item: any) => ({
    ...item,
    slug: slugMap[item.product_id] || '',
  }));

  // 按 order_id 分组
  const itemsMap: Record<string, any[]> = {};
  itemsWithSlug.forEach(item => {
    if (!itemsMap[item.order_id]) {
      itemsMap[item.order_id] = [];
    }
    itemsMap[item.order_id].push(item);
  });

  const resultItems = orders.map(order => ({
    ...order,
    items: itemsMap[order.id] || [],
  }));

  return {
    items: resultItems,
    total: count || 0,
    page,
    page_size,
    total_pages: Math.ceil((count || 0) / page_size),
  };
},

  /**
   * ✅ 获取订单详情（含商品明细 + 状态日志 + shipping_records）
   */
  async getById(siteId: string, id: string): Promise<OrderDetail> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (orderError) {
      console.error('[getById] 查询失败:', orderError);
      throw new Error(`获取订单详情失败: ${orderError.message}`);
    }

    if (!order) {
      throw new Error('订单不存在');
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('sort_order');

    if (itemsError) throw new Error(`获取订单商品失败: ${itemsError.message}`);

    // ✅ 使用优化版，带缓存
    const itemsWithSlug = await enrichItemsWithSlugOptimized(items || []);

    const { data: logs, error: logsError } = await supabase
      .from('order_status_logs')
      .select('*')
      .eq('order_id', id)
      .order('created_at');

    if (logsError) throw new Error(`获取状态日志失败: ${logsError.message}`);

    let selectedAccountIds = (order as any).selected_account_ids || [];
    if (typeof selectedAccountIds === 'string') {
      try {
        selectedAccountIds = JSON.parse(selectedAccountIds);
      } catch {
        selectedAccountIds = [];
      }
    }

    // ✅ 解析 shipping_records
    let shippingRecords: ShippingRecord[] = [];
    if (order.shipping_records) {
      if (typeof order.shipping_records === 'string') {
        try {
          shippingRecords = JSON.parse(order.shipping_records);
        } catch {
          shippingRecords = [];
        }
      } else if (Array.isArray(order.shipping_records)) {
        shippingRecords = order.shipping_records;
      }
    }

    return {
      ...order,
      selected_account_ids: selectedAccountIds,
      items: itemsWithSlug,
      status_logs: logs || [],
      shipping_records: shippingRecords,
    };
  },

  /**
   * ✅ 获取订单基本信息（不含 items 和 logs）
   */
  async getBasicInfo(siteId: string, id: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, sent_status, sub_total, discount, shipping_fee, tax, total_amount, selected_account_ids, shipping_records')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[getBasicInfo] 查询失败:', error);
      throw new Error(`获取订单信息失败: ${error.message}`);
    }

    if (!data) {
      throw new Error('订单不存在');
    }
    
    let selectedAccountIds = (data as any).selected_account_ids || [];
    if (typeof selectedAccountIds === 'string') {
      try {
        selectedAccountIds = JSON.parse(selectedAccountIds);
      } catch {
        selectedAccountIds = [];
      }
    }

    let shippingRecords: ShippingRecord[] = [];
    if ((data as any).shipping_records) {
      if (typeof (data as any).shipping_records === 'string') {
        try {
          shippingRecords = JSON.parse((data as any).shipping_records);
        } catch {
          shippingRecords = [];
        }
      } else if (Array.isArray((data as any).shipping_records)) {
        shippingRecords = (data as any).shipping_records;
      }
    }

    return {
      ...data,
      selected_account_ids: selectedAccountIds,
      shipping_records: shippingRecords,
    } as Order;
  },

  /**
   * ✅ 创建订单（草稿状态）
   */
  async create(siteId: string, input: CreateOrderInput, operator: string): Promise<Order> {
    try {
      const orderNo = generateOrderNo();
      
      let contractNo = input.contract_no?.trim();
      if (!contractNo) {
        contractNo = await generateDefaultContractNo(siteId);
      } else {
        contractNo = await ensureUniqueContractNo(siteId, contractNo);
      }

      const items = input.items || [];
      const sub_total = items.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0);
      
      const discount = Number(input.discount) || 0;
      const shipping_fee = Number(input.shipping_fee) || 0;
      const tax = Number(input.tax) || 0;
      const total_amount = sub_total + shipping_fee + tax - discount;

      const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const insertData = {
        site_id: siteId,
        order_no: orderNo,
        contract_no: contractNo,
        customer_id: input.customer_id || null,
        buyer_name: input.buyer_name || '',
        buyer_email: input.buyer_email || '',
        buyer_company: input.buyer_company || '',
        buyer_country: input.buyer_country || '',
        buyer_phone: input.buyer_phone || '',
        buyer_address: input.buyer_address || '',
        payment_method: input.payment_method || 'bank_transfer',
        selected_account_ids: Array.isArray(input.selected_account_ids) ? input.selected_account_ids : [],
        currency: input.currency || 'USD',
        sub_total,
        discount,
        shipping_fee,
        tax,
        total_amount,
        shipping_method: input.shipping_method || '',
        shipping_date_type: input.shipping_date_type || '',
        shipping_date: input.shipping_date || null,
        shipping_days: Number(input.shipping_days) || 0,
        trade_term: input.trade_term || '',
        tracking_number: input.tracking_number || '',
        carrier: input.carrier || '',
        carrier_name: '',
        tracking_image: input.tracking_image || '',
        legal_terms: input.legal_terms || '',
        postscript: input.postscript || '',
        remark: input.remark || '',
        expiry_date: input.expiry_date || defaultExpiry,
        status: 'draft',
        sent_status: 'unsent',
        created_by: operator || 'system',
        shipping_records: [],
      };

      console.log('[create] 准备插入数据');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (orderError) {
        console.error('[create] Supabase 插入失败:', orderError);
        throw new Error(`创建订单失败: ${orderError.message}`);
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          order_id: order.id,
          product_id: item.product_id || null,
          locale: item.locale || 'en',
          product_name: item.product_name || '',
          product_image: item.product_image || '',
          category: item.category || '',
          specification: item.specification || '',
          sku: item.sku || '',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'pcs',
          total: (Number(item.price) || 0) * (Number(item.quantity) || 0),
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('[create] 插入商品失败:', itemsError);
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error(`创建订单商品失败: ${itemsError.message}`);
        }
      }

      return order;
    } catch (error) {
      console.error('[create] 创建订单异常:', error);
      throw error;
    }
  },

  /**
   * ✅ 更新订单（仅草稿状态可编辑）
   */
  async update(siteId: string, id: string, input: UpdateOrderInput, operator?: string): Promise<Order> {
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('status, sub_total, discount, shipping_fee, tax, expiry_date, created_at')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[update] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }
    
    if (!existing) {
      throw new Error('订单不存在');
    }

    if (existing.status !== 'draft') {
      throw new Error('只有草稿状态的订单可以编辑');
    }

    const { items, selected_account_ids, ...orderUpdateData } = input;

    const inputAny = orderUpdateData as any;
    
    let sub_total: number;
    if (inputAny.sub_total !== undefined && inputAny.sub_total !== null) {
      sub_total = Number(inputAny.sub_total);
    } else if (items && Array.isArray(items) && items.length > 0) {
      sub_total = items.reduce((sum: number, item: any) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0);
    } else {
      sub_total = Number(existing.sub_total) || 0;
    }

    const discount = inputAny.discount !== undefined && inputAny.discount !== null
      ? Number(inputAny.discount)
      : Number(existing.discount) || 0;

    const shipping_fee = inputAny.shipping_fee !== undefined && inputAny.shipping_fee !== null
      ? Number(inputAny.shipping_fee)
      : Number(existing.shipping_fee) || 0;

    const tax = inputAny.tax !== undefined && inputAny.tax !== null
      ? Number(inputAny.tax)
      : Number(existing.tax) || 0;

    const total_amount = sub_total + shipping_fee + tax - discount;

    console.log('[update] 重新计算金额:', {
      sub_total,
      discount,
      shipping_fee,
      tax,
      total_amount,
      existing_sub_total: existing.sub_total,
    });

    const updateData: any = {
      ...orderUpdateData,
      sub_total,
      discount,
      shipping_fee,
      tax,
      total_amount,
      updated_at: new Date().toISOString(),
    };

    // 处理 expiry_date
    if (updateData.expiry_date === '' || updateData.expiry_date === null || updateData.expiry_date === undefined) {
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      updateData.expiry_date = defaultExpiry.toISOString().split('T')[0];
    } else if (updateData.expiry_date) {
      try {
        const date = new Date(updateData.expiry_date);
        if (!isNaN(date.getTime())) {
          updateData.expiry_date = date.toISOString().split('T')[0];
        }
      } catch {
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 30);
        updateData.expiry_date = defaultExpiry.toISOString().split('T')[0];
      }
    }

    if (updateData.shipping_date === '') {
      updateData.shipping_date = null;
    }

    if (selected_account_ids !== undefined) {
      updateData.selected_account_ids = selected_account_ids;
    }

    delete updateData.items;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[update] 更新订单失败:', error);
      throw new Error(`更新订单失败: ${error.message}`);
    }

    if (items !== undefined) {
      await supabase.from('order_items').delete().eq('order_id', id);

      if (Array.isArray(items) && items.length > 0) {
        const itemsToInsert = items.map((item: any, index: number) => ({
          order_id: id,
          product_id: item.product_id || null,
          locale: item.locale || 'en',
          product_name: item.product_name || '',
          product_image: item.product_image || '',
          category: item.category || '',
          specification: item.specification || '',
          sku: item.sku || '',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'pcs',
          total: (Number(item.price) || 0) * (Number(item.quantity) || 0),
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('[update] 更新订单商品失败:', itemsError);
        }
      }
    }

    return this.getById(siteId, id);
  },

  /**
   * ✅ 删除订单（仅草稿/已取消可删除）
   */
  async delete(siteId: string, id: string): Promise<void> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[delete] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }
    
    if (!order) {
      throw new Error('订单不存在');
    }

    const allowedStatuses = ['draft', 'cancelled'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`当前状态 "${order.status}" 不允许删除`);
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) throw new Error(`删除订单失败: ${error.message}`);
  },

  /**
   * ✅ 提交订单（草稿 → 正式订单）
   */
  async submit(
    siteId: string, 
    id: string, 
    operator: string, 
    options?: { baseUrl?: string; locale?: string }
  ): Promise<{ order: Order; shareUrl: string }> {
    console.log('[submit] 开始提交:', { siteId, id, operator, options });

    const { data: orderCheck, error: checkError } = await supabase
      .from('orders')
      .select('status')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('[submit] 检查订单失败:', checkError);
      throw new Error(`获取订单信息失败: ${checkError.message}`);
    }

    if (!orderCheck) {
      throw new Error('订单不存在');
    }

    if (orderCheck.status !== 'draft') {
      throw new Error(`只有草稿状态的订单可以提交，当前状态: ${orderCheck.status}`);
    }

    const shareToken = generateShareToken();
    console.log('[submit] 生成分享Token:', shareToken);

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'formal',
        sent_status: 'sent',
        share_token: shareToken,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[submit] 更新失败:', error);
      throw new Error(`提交订单失败: ${error.message}`);
    }

    console.log('[submit] 更新成功');

    await logOrderStatus(id, 'draft', 'formal', operator, '订单提交，已发送给客户');

    const baseUrl = options?.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const locale = options?.locale || '';
    const shareUrl = locale 
      ? `${baseUrl}/${locale}/payment/order/share/${shareToken}`
      : `${baseUrl}/payment/order/share/${shareToken}`;

    console.log('[submit] 完成, shareUrl:', shareUrl);
    return { order: data, shareUrl };
  },

  /**
   * ✅ 取消订单
   */
  async cancel(siteId: string, id: string, operator: string, reason?: string): Promise<Order> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[cancel] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }
    
    if (!order) {
      throw new Error('订单不存在');
    }

    if (!['draft', 'formal', 'paid'].includes(order.status)) {
      throw new Error(`当前状态 "${order.status}" 无法取消`);
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`取消订单失败: ${error.message}`);

    await logOrderStatus(id, order.status, 'cancelled', operator, reason || '用户取消');

    return data;
  },

  /**
   * ✅ 更新订单状态（通用方法）
   */
  async updateStatus(
    siteId: string,
    id: string,
    toStatus: string,
    operator: string,
    note?: string
  ): Promise<void> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[updateStatus] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) {
      throw new Error('订单不存在');
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: toStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) throw new Error(`更新状态失败: ${error.message}`);

    await logOrderStatus(id, order.status, toStatus, operator, note || '');
  },

  /**
   * ✅ 撤回订单（已发送 → 草稿）
   */
  async recall(siteId: string, id: string, operator: string): Promise<Order> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, sent_status')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[recall] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }
    
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'formal' || order.sent_status !== 'sent') {
      throw new Error(`只有已发送的正式订单可以撤回，当前状态: ${order.status}, 发送状态: ${order.sent_status}`);
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'draft',
        sent_status: 'unsent',
        share_token: null,
        sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`撤回订单失败: ${error.message}`);

    await logOrderStatus(id, 'formal', 'draft', operator, '订单撤回');

    return data;
  },

  /**
   * ✅ 确认收款
   */
  async confirmPayment(
    siteId: string, 
    id: string, 
    operator: string,
    data?: { depositAmount: number; depositPercent?: number }
  ): Promise<Order> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, total_amount, deposit_amount')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[confirmPayment] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }
    
    if (!order) {
      throw new Error('订单不存在');
    }

    if (!['formal', 'paid'].includes(order.status)) {
      throw new Error(`只有正式订单或已付款订单可以确认收款，当前状态: ${order.status}`);
    }

    const currentDeposit = Number(order.deposit_amount) || 0;
    const newDepositAmount = data?.depositAmount || 0;
    const totalDeposit = currentDeposit + newDepositAmount;

    if (totalDeposit > order.total_amount) {
      throw new Error(`已付款金额不能超过总金额 ${order.total_amount}`);
    }

    const updateData: any = {
      deposit_amount: totalDeposit,
      updated_at: new Date().toISOString(),
    };

    if (order.status === 'formal') {
      updateData.status = 'paid';
      updateData.paid_at = new Date().toISOString();
    }

    const { data: result, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[confirmPayment] 更新失败:', error);
      throw new Error(`确认收款失败: ${error.message}`);
    }

    await logOrderStatus(
      id, 
      order.status, 
      order.status === 'formal' ? 'paid' : 'paid', 
      operator, 
      `确认收款 ${newDepositAmount}，累计已付: ${totalDeposit}`
    );

    return result;
  },

  /**
   * ✅ 确认发货 - 追加发货记录到 shipping_records
   */
  async confirmShipping(
    siteId: string,
    id: string,
    operator: string,
    data?: {
      shippingMethod?: string;
      trackingNumber?: string;
      carrierKey?: string;
      carrierName?: string;
      trackingImage?: string;
    }
  ): Promise<Order> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, shipping_records, shipping_method')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[confirmShipping] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }
    
    if (!order) {
      throw new Error('订单不存在');
    }

    if (!['paid', 'completed'].includes(order.status)) {
      throw new Error(`只有已付款或已完成订单可以确认发货，当前状态: ${order.status}`);
    }

    let existingRecords: ShippingRecord[] = [];
    if (order.shipping_records) {
      if (typeof order.shipping_records === 'string') {
        try {
          existingRecords = JSON.parse(order.shipping_records);
        } catch {
          existingRecords = [];
        }
      } else if (Array.isArray(order.shipping_records)) {
        existingRecords = order.shipping_records;
      }
    }

    let carrierNameCn = '';
    let carrierNameEn = '';
    
    if (data?.carrierKey) {
      try {
        const { data: carrierData, error: carrierError } = await supabase
          .from('carriers')
          .select('name_cn, name_en')
          .eq('key', data.carrierKey)
          .maybeSingle();
        
        if (!carrierError && carrierData) {
          carrierNameCn = carrierData.name_cn || '';
          carrierNameEn = carrierData.name_en || '';
        }
      } catch (carrierErr) {
        console.warn('[confirmShipping] 获取承运商信息失败:', carrierErr);
      }
    }

    if (data?.carrierName) {
      carrierNameEn = data.carrierName;
    }

    const shippingMethod = data?.shippingMethod || order.shipping_method || '';
    const newRecord = buildShippingRecord(
      data?.carrierKey || '',
      carrierNameCn,
      carrierNameEn || data?.carrierName || '',
      data?.trackingNumber || '',
      shippingMethod,
      data?.trackingImage || ''
    );

    const updatedRecords = [...existingRecords, newRecord];

    const updateData: any = {
      shipping_records: updatedRecords,
      updated_at: new Date().toISOString(),
      tracking_number: data?.trackingNumber || '',
      carrier: data?.carrierKey || '',
      carrier_name: data?.carrierName || '',
      tracking_image: data?.trackingImage || '',
    };

    if (data?.shippingMethod) {
      updateData.shipping_method = data.shippingMethod;
    }

    if (order.status === 'paid') {
      updateData.status = 'completed';
    }

    const { data: result, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[confirmShipping] 更新失败:', error);
      throw new Error(`确认发货失败: ${error.message}`);
    }

    await logOrderStatus(
      id, 
      order.status, 
      order.status === 'paid' ? 'completed' : order.status, 
      operator, 
      `已确认发货，物流单号: ${data?.trackingNumber || ''}，承运商: ${data?.carrierName || ''}`
    );

    return result;
  },

  /**
   * ✅ 再来一单 / 复制订单（创建新草稿）
   */
  async reorder(siteId: string, id: string, operator: string): Promise<Order> {
    const originalOrder = await this.getById(siteId, id);
    
    console.log('[reorder] 原订单数据字段:', Object.keys(originalOrder));
    
    const orderNo = generateOrderNo();
    
    let contractNo = await generateDefaultContractNo(siteId);
    const originalContractNo = originalOrder.contract_no || '';
    if (originalContractNo) {
      const { data: existing, error } = await supabase
        .from('orders')
        .select('contract_no')
        .eq('site_id', siteId)
        .eq('contract_no', `${originalContractNo}-2`)
        .maybeSingle();
      
      if (!error && !existing) {
        contractNo = `${originalContractNo}-2`;
      }
    }

    const excludedFields = [
      'id',
      'order_no',
      'contract_no',
      'status',
      'sent_status',
      'share_token',
      'share_view_count',
      'created_by',
      'sent_at',
      'cancelled_at',
      'expired_at',
      'created_at',
      'updated_at',
      'paid_at',
      'items',
      'status_logs',
      'deposit_amount',
      'payment_status',
      'paypal_order_id',
      'paypal_payer_id',
      'paypal_payment_id',
      'tracking_number',
      'carrier',
      'carrier_name',
      'tracking_image',
      'shipping_date',
      'shipping_days',
      'shipping_records',
    ];

    const copyData: any = {};
    for (const key of Object.keys(originalOrder)) {
      if (!excludedFields.includes(key)) {
        copyData[key] = (originalOrder as any)[key];
      }
    }

    const insertData: any = {
      ...copyData,
      site_id: siteId,
      order_no: orderNo,
      contract_no: contractNo,
      status: 'draft',
      sent_status: 'unsent',
      share_token: null,
      share_view_count: 0,
      created_by: operator,
      sent_at: null,
      cancelled_at: null,
      expired_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      paid_at: null,
      deposit_amount: 0,
      payment_status: 'pending',
      paypal_order_id: null,
      paypal_payer_id: null,
      paypal_payment_id: null,
      tracking_number: '',
      carrier: '',
      carrier_name: '',
      tracking_image: '',
      shipping_date: null,
      shipping_days: 0,
      shipping_records: [],
    };

    console.log('[reorder] 插入数据字段:', Object.keys(insertData));

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(insertData)
      .select()
      .single();

    if (orderError) {
      console.error('[reorder] 插入订单失败:', orderError);
      throw new Error(`复制订单失败: ${orderError.message}`);
    }

    if (originalOrder.items && originalOrder.items.length > 0) {
      const itemsToInsert = originalOrder.items.map((item, index) => ({
        order_id: newOrder.id,
        product_id: item.product_id || null,
        locale: item.locale || 'en',
        product_name: item.product_name,
        product_image: item.product_image || '',
        category: item.category || '',
        specification: item.specification || '',
        sku: item.sku || '',
        price: item.price,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        total: item.total,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[reorder] 复制商品失败:', itemsError);
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw new Error(`复制订单商品失败: ${itemsError.message}`);
      }
    }

    logOrderStatus(newOrder.id, null, 'draft', operator, `从订单 ${originalOrder.order_no} 复制`).catch(err => {
      console.warn('[reorder] 记录日志失败:', err);
    });

    console.log('[reorder] 复制成功，新订单ID:', newOrder.id);
    return newOrder;
  },

  /**
   * ✅ 通过分享 Token 获取订单（公开访问）
   */
  async getByShareToken(token: string): Promise<OrderDetail | null> {
    console.log('[getByShareToken] 查询Token:', token);
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('share_token', token)
      .eq('sent_status', 'sent')
      .in('status', ['formal', 'paid', 'completed'])
      .maybeSingle();

    if (error) {
      console.error('[getByShareToken] 查询失败:', error);
      throw new Error(`获取订单失败: ${error.message}`);
    }

    if (!order) {
      console.log('[getByShareToken] 未找到订单或订单不可访问');
      return null;
    }

    console.log('[getByShareToken] 找到订单:', order.id);

    try {
      await supabase
        .from('orders')
        .update({ share_view_count: (order.share_view_count || 0) + 1 })
        .eq('id', order.id);
    } catch (updateError) {
      console.warn('[getByShareToken] 更新查看次数失败:', updateError);
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('sort_order');

    if (itemsError) {
      console.warn('[getByShareToken] 获取商品失败:', itemsError);
    }

    // ✅ 使用优化版，带缓存
    const itemsWithSlug = await enrichItemsWithSlugOptimized(items || []);

    let selectedAccountIds = (order as any).selected_account_ids || [];
    if (typeof selectedAccountIds === 'string') {
      try {
        selectedAccountIds = JSON.parse(selectedAccountIds);
      } catch {
        selectedAccountIds = [];
      }
    }

    let shippingRecords: ShippingRecord[] = [];
    if (order.shipping_records) {
      if (typeof order.shipping_records === 'string') {
        try {
          shippingRecords = JSON.parse(order.shipping_records);
        } catch {
          shippingRecords = [];
        }
      } else if (Array.isArray(order.shipping_records)) {
        shippingRecords = order.shipping_records;
      }
    }

    return {
      ...order,
      selected_account_ids: selectedAccountIds,
      items: itemsWithSlug,
      status_logs: [],
      shipping_records: shippingRecords,
    };
  },

  /**
   * ✅ 检查并更新过期订单（可定时任务调用）
   */
  async checkExpiredOrders(siteId: string): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'expired',
        expired_at: now,
        updated_at: now,
      })
      .eq('site_id', siteId)
      .eq('sent_status', 'sent')
      .eq('status', 'formal')
      .lt('expiry_date', now)
      .select('id');

    if (error) throw new Error(`检查过期订单失败: ${error.message}`);

    if (data && data.length > 0) {
      const logs = data.map((order) => ({
        order_id: order.id,
        from_status: 'formal',
        to_status: 'expired',
        operator: 'system',
        note: '订单已过期',
      }));
      await supabase.from('order_status_logs').insert(logs);
    }

    return data?.length || 0;
  },
};

export default orderService;