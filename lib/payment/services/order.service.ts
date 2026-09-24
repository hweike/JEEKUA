// lib/payment/services/order.service.ts
import sql from '@/lib/db/admin';
import { generateShareToken } from '../utils/share-token';
import type {
  Order,
  OrderDetail,
  CreateOrderInput,
  UpdateOrderInput,
  OrderListParams,
  OrderListResult,
  ShippingRecord,
} from '../types/order';

// ============================================================
// ✅ 产品 slug 内存缓存
// ============================================================
const productSlugCache = new Map<string, { slug: string; timestamp: number }>();
const PRODUCT_SLUG_CACHE_TTL = 5 * 60 * 1000;

/**
 * ✅ 批量获取产品 slug（带内存缓存）
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
    if (cached && now - cached.timestamp < PRODUCT_SLUG_CACHE_TTL) {
      result[id] = cached.slug;
    } else {
      uncachedIds.push(id);
    }
  }

  // 2. 查询未缓存的数据
  if (uncachedIds.length > 0) {
    try {
      const rows = await sql<{ productId: string; slug: string | null }[]>`
        SELECT "productId", slug FROM public.products
        WHERE "productId" IN ${sql(uncachedIds)}
      `;
      for (const item of rows) {
        if (item.productId) {
          const slug = item.slug || '';
          result[item.productId] = slug;
          productSlugCache.set(item.productId, { slug, timestamp: now });
        }
      }
    } catch (error) {
      console.warn('[getProductSlugs] 查询失败:', error);
    }
  }

  // 3. 未查到的缓存空字符串
  for (const id of uncachedIds) {
    if (!result[id]) {
      productSlugCache.set(id, { slug: '', timestamp: now });
    }
  }

  return result;
}

async function enrichItemsWithSlugOptimized(items: any[]): Promise<any[]> {
  if (!items || items.length === 0) return items;

  const productIds = items
    .map((item) => item.product_id)
    .filter((id): id is string => id !== null && id !== undefined && id !== '');

  if (productIds.length === 0) return items;

  const slugMap = await getProductSlugs(productIds);

  return items.map((item: any) => ({
    ...item,
    slug: slugMap[item.product_id] || '',
  }));
}

// ============================================================
// ✅ 辅助函数：异步记录订单状态日志
// ============================================================
async function logOrderStatus(
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  operator: string,
  note: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO public.order_status_logs (order_id, from_status, to_status, operator, note)
      VALUES (${orderId}, ${fromStatus}, ${toStatus}, ${operator || 'system'}, ${note || ''})
    `;
  } catch (error) {
    console.warn(`[orderStatusLog] 日志记录失败 (${fromStatus}→${toStatus}):`, error);
  }
}

// ============================================================
// ✅ 辅助函数：生成发货记录 ID
// ============================================================
function generateShippingRecordId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
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

function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return timestamp + random;
}

/**
 * 生成默认合同号（格式: PI-YYYYMMDD-XXXX）
 */
async function generateDefaultContractNo(siteId: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const pattern = `PI-${dateStr}-%`;

  let rows: { contract_no: string | null }[] = [];
  try {
    rows = await sql<{ contract_no: string | null }[]>`
      SELECT contract_no FROM public.orders
      WHERE site_id = ${siteId}
        AND contract_no LIKE ${pattern}
      ORDER BY contract_no DESC
      LIMIT 1
    `;
  } catch (error) {
    console.warn('[generateDefaultContractNo] 查询失败:', error);
  }

  let nextSeq = 1;
  if (rows[0]?.contract_no) {
    const parts = rows[0].contract_no.split('-');
    const lastPart = parts[parts.length - 1];
    const lastSeq = parseInt(lastPart, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
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

  let existing: { contract_no: string } | undefined;
  try {
    const rows = await sql<{ contract_no: string }[]>`
      SELECT contract_no FROM public.orders
      WHERE site_id = ${siteId}
        AND contract_no = ${contractNo}
      LIMIT 1
    `;
    existing = rows[0];
  } catch (error) {
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

// ============================================================
// ✅ 动态 SQL 构建辅助（合法 postgres 用法）
// ============================================================

/**
 * 构建 INSERT 语句
 * - 列名用 sql() 标识符注入（来自代码白名单，非用户输入）
 * - jsonb 字段用 sql.json() 包装
 */
function buildInsertStatement(
  table: string,
  data: Record<string, any>,
  jsonbFields: Set<string>
) {
  const columns = Object.keys(data);
  const colsSql = columns
    .map((c) => sql`${sql(c)}`)
    .reduce((acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`), sql``);
  const valsSql = columns
    .map((c) => {
      const v = data[c];
      return jsonbFields.has(c) ? sql`${sql.json(v)}` : sql`${v}`;
    })
    .reduce((acc, v, i) => (i === 0 ? v : sql`${acc}, ${v}`), sql``);
  return { colsSql, valsSql };
}

/**
 * 构建 SET 子句（用于 UPDATE）
 */
function buildSetClause(
  data: Record<string, any>,
  jsonbFields: Set<string>
) {
  const clauses: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (jsonbFields.has(key)) {
      clauses.push(sql`${sql(key)} = ${sql.json(value)}`);
    } else {
      clauses.push(sql`${sql(key)} = ${value}`);
    }
  }
  if (clauses.length === 0) return sql``;
  return clauses.reduce((acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`), sql``);
}

// ============================================================
// ✅ 动态 INSERT 构建（用于 create / reorder）
// ============================================================

/**
 * 用 SQL 模板构建 INSERT INTO orders 并返回新订单
 * 注意：postgres 库中 sql(obj) 只展开为 (col1, col2) VALUES (v1, v2) 片段，
 * 不能直接跟在 INSERT INTO ... ( 之后。因此这里手动列出列名和值。
 */
async function insertOrder(
  data: Record<string, any>,
  jsonbFields: Set<string>
): Promise<any> {
  const { colsSql, valsSql } = buildInsertStatement('orders', data, jsonbFields);
  const rows = await sql<any[]>`
    INSERT INTO public.orders (${colsSql})
    VALUES (${valsSql})
    RETURNING *
  `;
  return rows[0];
}

export const orderService = {
  // ============================================================
  // 列表 / 详情
  // ============================================================

  /**
   * ✅ 获取订单列表（分页 + 筛选）
   */
  async list(params: OrderListParams): Promise<OrderListResult> {
    const {
      site_id, status, keyword, country, created_by, buyer_email,
      start_date, end_date, page = 1, page_size = 20,
    } = params;

    const conditions: any[] = [sql`site_id = ${site_id}`];

    if (status && status !== 'all') {
      if (Array.isArray(status) && status.length > 0) {
        conditions.push(sql`status IN ${sql(status)}`);
      } else if (typeof status === 'string') {
        conditions.push(sql`status = ${status}`);
      }
    }

    if (params.sent_status && Array.isArray(params.sent_status) && params.sent_status.length > 0) {
      conditions.push(sql`sent_status IN ${sql(params.sent_status)}`);
    } else if (
      params.sent_status &&
      typeof params.sent_status === 'string' &&
      params.sent_status !== 'all'
    ) {
      conditions.push(sql`sent_status = ${params.sent_status}`);
    }

    if (country) conditions.push(sql`buyer_country = ${country}`);
    if (created_by) conditions.push(sql`created_by = ${created_by}`);
    if (buyer_email) conditions.push(sql`buyer_email = ${buyer_email}`);

    if (keyword) {
      const p = `%${keyword}%`;
      conditions.push(
        sql`(order_no ILIKE ${p} OR contract_no ILIKE ${p} OR buyer_name ILIKE ${p} OR buyer_email ILIKE ${p})`
      );
    }

    if (start_date) conditions.push(sql`created_at >= ${start_date}`);
    if (end_date) conditions.push(sql`created_at <= ${end_date}`);

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    const offset = (page - 1) * page_size;

    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.orders
        WHERE ${whereClause}
      `;
      const total = parseInt(countRows[0]?.count || '0', 10);

      const items = await sql<Order[]>`
        SELECT * FROM public.orders
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${page_size} OFFSET ${offset}
      `;

      return {
        items,
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
      };
    } catch (error: any) {
      throw new Error(`获取订单列表失败: ${error.message}`);
    }
  },

  /**
   * ✅ 获取订单列表（含商品信息）
   */
  async listWithItems(params: OrderListParams): Promise<OrderListResult> {
    const {
      site_id, status, keyword, country, created_by, buyer_email,
      start_date, end_date, page = 1, page_size = 20,
    } = params;

    const conditions: any[] = [sql`site_id = ${site_id}`];

    if (status && status !== 'all') {
      if (Array.isArray(status) && status.length > 0) {
        conditions.push(sql`status IN ${sql(status)}`);
      } else if (typeof status === 'string') {
        conditions.push(sql`status = ${status}`);
      }
    }

    if (params.sent_status && Array.isArray(params.sent_status) && params.sent_status.length > 0) {
      conditions.push(sql`sent_status IN ${sql(params.sent_status)}`);
    } else if (
      params.sent_status &&
      typeof params.sent_status === 'string' &&
      params.sent_status !== 'all'
    ) {
      conditions.push(sql`sent_status = ${params.sent_status}`);
    }

    if (country) conditions.push(sql`buyer_country = ${country}`);
    if (created_by) conditions.push(sql`created_by = ${created_by}`);
    if (buyer_email) conditions.push(sql`buyer_email = ${buyer_email}`);

    if (keyword) {
      const p = `%${keyword}%`;
      conditions.push(
        sql`(order_no ILIKE ${p} OR contract_no ILIKE ${p} OR buyer_name ILIKE ${p} OR buyer_email ILIKE ${p})`
      );
    }

    if (start_date) conditions.push(sql`created_at >= ${start_date}`);
    if (end_date) conditions.push(sql`created_at <= ${end_date}`);

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    const offset = (page - 1) * page_size;

    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.orders
        WHERE ${whereClause}
      `;
      const total = parseInt(countRows[0]?.count || '0', 10);

      const orders = await sql<Order[]>`
        SELECT * FROM public.orders
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${page_size} OFFSET ${offset}
      `;

      if (!orders || orders.length === 0) {
        return { items: [], total: 0, page, page_size, total_pages: 0 };
      }

      const orderIds = orders.map((o: any) => o.id);

      let items: any[] = [];
      try {
        items = await sql<any[]>`
          SELECT * FROM public.order_items
          WHERE order_id IN ${sql(orderIds)}
          ORDER BY sort_order ASC
        `;
      } catch (itemsError) {
        console.warn('获取订单商品失败:', itemsError);
      }

      const allProductIds = items
        .map((item) => item.product_id)
        .filter((id): id is string => id !== null && id !== undefined && id !== '');

      const slugMap = await getProductSlugs(allProductIds);

      const itemsWithSlug = items.map((item: any) => ({
        ...item,
        slug: slugMap[item.product_id] || '',
      }));

      const itemsMap: Record<string, any[]> = {};
      itemsWithSlug.forEach((item) => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      });

      const resultItems = orders.map((order: any) => ({
        ...order,
        items: itemsMap[order.id] || [],
      }));

      return {
        items: resultItems,
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
      };
    } catch (error: any) {
      throw new Error(`获取订单列表失败: ${error.message}`);
    }
  },

  /**
   * ✅ 获取订单详情
   */
  async getById(siteId: string, id: string): Promise<OrderDetail> {
    let order: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (orderError: any) {
      console.error('[getById] 查询失败:', orderError);
      throw new Error(`获取订单详情失败: ${orderError.message}`);
    }
    if (!order) throw new Error('订单不存在');

    let items: any[] = [];
    try {
      items = await sql<any[]>`
        SELECT * FROM public.order_items
        WHERE order_id = ${id}
        ORDER BY sort_order ASC
      `;
    } catch (itemsError: any) {
      throw new Error(`获取订单商品失败: ${itemsError.message}`);
    }

    const itemsWithSlug = await enrichItemsWithSlugOptimized(items);

    let logs: any[] = [];
    try {
      logs = await sql<any[]>`
        SELECT * FROM public.order_status_logs
        WHERE order_id = ${id}
        ORDER BY created_at ASC
      `;
    } catch (logsError: any) {
      throw new Error(`获取状态日志失败: ${logsError.message}`);
    }

    // postgres 库自动反序列化 jsonb，但仍保留兜底解析
    let selectedAccountIds = order.selected_account_ids || [];
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
      status_logs: logs,
      shipping_records: shippingRecords,
    };
  },

  /**
   * ✅ 获取订单基本信息
   */
  async getBasicInfo(siteId: string, id: string): Promise<Order> {
    let data: any;
    try {
      const rows = await sql<any[]>`
        SELECT id, status, sent_status, sub_total, discount, shipping_fee, tax,
               total_amount, selected_account_ids, shipping_records
        FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      data = rows[0];
    } catch (error: any) {
      console.error('[getBasicInfo] 查询失败:', error);
      throw new Error(`获取订单信息失败: ${error.message}`);
    }
    if (!data) throw new Error('订单不存在');

    let selectedAccountIds = data.selected_account_ids || [];
    if (typeof selectedAccountIds === 'string') {
      try {
        selectedAccountIds = JSON.parse(selectedAccountIds);
      } catch {
        selectedAccountIds = [];
      }
    }

    let shippingRecords: ShippingRecord[] = [];
    if (data.shipping_records) {
      if (typeof data.shipping_records === 'string') {
        try {
          shippingRecords = JSON.parse(data.shipping_records);
        } catch {
          shippingRecords = [];
        }
      } else if (Array.isArray(data.shipping_records)) {
        shippingRecords = data.shipping_records;
      }
    }

    return {
      ...data,
      selected_account_ids: selectedAccountIds,
      shipping_records: shippingRecords,
    } as Order;
  },

  // ============================================================
  // 创建 / 更新 / 删除
  // ============================================================

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

      const insertData: Record<string, any> = {
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
        selected_account_ids: Array.isArray(input.selected_account_ids)
          ? input.selected_account_ids
          : [],
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

      const jsonbFields = new Set(['selected_account_ids', 'shipping_records']);

      console.log('[create] 准备插入数据');

      let order: any;
      try {
        order = await insertOrder(insertData, jsonbFields);
      } catch (orderError: any) {
        console.error('[create] 插入失败:', orderError);
        throw new Error(`创建订单失败: ${orderError.message}`);
      }

      if (!order) throw new Error('创建订单失败：未返回数据');

      // 插入 order_items
      if (items.length > 0) {
        try {
          for (let index = 0; index < items.length; index++) {
            const item = items[index];
            await sql`
              INSERT INTO public.order_items (
                order_id, product_id, locale, product_name, product_image,
                category, specification, sku, price, quantity, unit, total, sort_order
              ) VALUES (
                ${order.id}, ${item.product_id || null}, ${item.locale || 'en'},
                ${item.product_name || ''}, ${item.product_image || ''},
                ${item.category || ''}, ${item.specification || ''},
                ${item.sku || ''}, ${Number(item.price) || 0},
                ${Number(item.quantity) || 0}, ${item.unit || 'pcs'},
                ${(Number(item.price) || 0) * (Number(item.quantity) || 0)},
                ${index}
              )
            `;
          }
        } catch (itemsError: any) {
          console.error('[create] 插入商品失败:', itemsError);
          try {
            await sql`DELETE FROM public.orders WHERE id = ${order.id}`;
          } catch {}
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
  async update(
    siteId: string,
    id: string,
    input: UpdateOrderInput,
    operator?: string
  ): Promise<Order> {
    // 1. 查现有订单
    let existing: any;
    try {
      const rows = await sql<any[]>`
        SELECT status, sub_total, discount, shipping_fee, tax, expiry_date, created_at
        FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      existing = rows[0];
    } catch (fetchError: any) {
      console.error('[update] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!existing) throw new Error('订单不存在');
    if (existing.status !== 'draft') {
      throw new Error('只有草稿状态的订单可以编辑');
    }

    const { items, selected_account_ids, ...orderUpdateData } = input;
    const inputAny = orderUpdateData as any;

    // 2. 重新计算金额
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

    const discount =
      inputAny.discount !== undefined && inputAny.discount !== null
        ? Number(inputAny.discount)
        : Number(existing.discount) || 0;
    const shipping_fee =
      inputAny.shipping_fee !== undefined && inputAny.shipping_fee !== null
        ? Number(inputAny.shipping_fee)
        : Number(existing.shipping_fee) || 0;
    const tax =
      inputAny.tax !== undefined && inputAny.tax !== null
        ? Number(inputAny.tax)
        : Number(existing.tax) || 0;

    const total_amount = sub_total + shipping_fee + tax - discount;

    console.log('[update] 重新计算金额:', { sub_total, discount, shipping_fee, tax, total_amount });

    // 3. 动态 SET
    const jsonbFields = new Set(['selected_account_ids', 'shipping_records']);
    const setClauses: any[] = [];

    // ✅ 需要特殊处理的字段，在遍历时跳过（避免重复赋值）
    const specialFields = new Set([
      'items',
      'expiry_date',
      'shipping_date',
      'selected_account_ids',
      'sub_total',
      'discount',
      'shipping_fee',
      'tax',
      'total_amount',
    ]);

    for (const [key, value] of Object.entries(orderUpdateData)) {
      if (specialFields.has(key)) continue;
      if (value === undefined) continue;
      if (jsonbFields.has(key)) {
        setClauses.push(sql`${sql(key)} = ${sql.json(value)}`);
      } else {
        setClauses.push(sql`${sql(key)} = ${value}`);
      }
    }

    // expiry_date 特殊处理
    let expiryDate = inputAny.expiry_date;
    if (expiryDate === '' || expiryDate === null || expiryDate === undefined) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      expiryDate = d.toISOString().split('T')[0];
    } else if (expiryDate) {
      try {
        const d = new Date(expiryDate);
        if (!isNaN(d.getTime())) expiryDate = d.toISOString().split('T')[0];
      } catch {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        expiryDate = d.toISOString().split('T')[0];
      }
    }
    setClauses.push(sql`expiry_date = ${expiryDate}`);

    // shipping_date 特殊处理
    if (inputAny.shipping_date === '') {
      setClauses.push(sql`shipping_date = NULL`);
    } else if (inputAny.shipping_date !== undefined) {
      setClauses.push(sql`shipping_date = ${inputAny.shipping_date}`);
    }

    // selected_account_ids 特殊处理
    if (selected_account_ids !== undefined) {
      setClauses.push(sql`selected_account_ids = ${sql.json(selected_account_ids)}`);
    }

    setClauses.push(sql`sub_total = ${sub_total}`);
    setClauses.push(sql`discount = ${discount}`);
    setClauses.push(sql`shipping_fee = ${shipping_fee}`);
    setClauses.push(sql`tax = ${tax}`);
    setClauses.push(sql`total_amount = ${total_amount}`);
    setClauses.push(sql`updated_at = ${new Date().toISOString()}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    // 4. 更新订单
    try {
      await sql`
        UPDATE public.orders
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('[update] 更新订单失败:', error);
      throw new Error(`更新订单失败: ${error.message}`);
    }

    // 5. 更新 items
    if (items !== undefined) {
      try {
        await sql`DELETE FROM public.order_items WHERE order_id = ${id}`;
      } catch {}

      if (Array.isArray(items) && items.length > 0) {
        try {
          for (let index = 0; index < items.length; index++) {
            const item: any = items[index];
            await sql`
              INSERT INTO public.order_items (
                order_id, product_id, locale, product_name, product_image,
                category, specification, sku, price, quantity, unit, total, sort_order
              ) VALUES (
                ${id}, ${item.product_id || null}, ${item.locale || 'en'},
                ${item.product_name || ''}, ${item.product_image || ''},
                ${item.category || ''}, ${item.specification || ''},
                ${item.sku || ''}, ${Number(item.price) || 0},
                ${Number(item.quantity) || 0}, ${item.unit || 'pcs'},
                ${(Number(item.price) || 0) * (Number(item.quantity) || 0)},
                ${index}
              )
            `;
          }
        } catch (itemsError) {
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
    let order: { status: string } | undefined;
    try {
      const rows = await sql<{ status: string }[]>`
        SELECT status FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[delete] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) throw new Error('订单不存在');

    const allowedStatuses = ['draft', 'cancelled'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`当前状态 "${order.status}" 不允许删除`);
    }

    try {
      await sql`
        DELETE FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      throw new Error(`删除订单失败: ${error.message}`);
    }
  },

  // ============================================================
  // 状态流转
  // ============================================================

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

    let orderCheck: { status: string } | undefined;
    try {
      const rows = await sql<{ status: string }[]>`
        SELECT status FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      orderCheck = rows[0];
    } catch (checkError: any) {
      console.error('[submit] 检查订单失败:', checkError);
      throw new Error(`获取订单信息失败: ${checkError.message}`);
    }

    if (!orderCheck) throw new Error('订单不存在');
    if (orderCheck.status !== 'draft') {
      throw new Error(`只有草稿状态的订单可以提交，当前状态: ${orderCheck.status}`);
    }

    const shareToken = generateShareToken();
    console.log('[submit] 生成分享Token:', shareToken);

    let data: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.orders
        SET status = 'formal',
            sent_status = 'sent',
            share_token = ${shareToken},
            sent_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
      console.error('[submit] 更新失败:', error);
      throw new Error(`提交订单失败: ${error.message}`);
    }

    console.log('[submit] 更新成功');

    await logOrderStatus(id, 'draft', 'formal', operator, '订单提交，已发送给客户');

    const baseUrl =
      options?.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
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
    let order: { status: string } | undefined;
    try {
      const rows = await sql<{ status: string }[]>`
        SELECT status FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[cancel] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) throw new Error('订单不存在');
    if (!['draft', 'formal', 'paid'].includes(order.status)) {
      throw new Error(`当前状态 "${order.status}" 无法取消`);
    }

    let data: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.orders
        SET status = 'cancelled',
            cancelled_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
      throw new Error(`取消订单失败: ${error.message}`);
    }

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
    let order: { status: string } | undefined;
    try {
      const rows = await sql<{ status: string }[]>`
        SELECT status FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[updateStatus] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) throw new Error('订单不存在');

    try {
      await sql`
        UPDATE public.orders
        SET status = ${toStatus},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      throw new Error(`更新状态失败: ${error.message}`);
    }

    await logOrderStatus(id, order.status, toStatus, operator, note || '');
  },

  /**
   * ✅ 撤回订单（已发送 → 草稿）
   */
  async recall(siteId: string, id: string, operator: string): Promise<Order> {
    let order: { status: string; sent_status: string } | undefined;
    try {
      const rows = await sql<{ status: string; sent_status: string }[]>`
        SELECT status, sent_status FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[recall] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) throw new Error('订单不存在');
    if (order.status !== 'formal' || order.sent_status !== 'sent') {
      throw new Error(
        `只有已发送的正式订单可以撤回，当前状态: ${order.status}, 发送状态: ${order.sent_status}`
      );
    }

    let data: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.orders
        SET status = 'draft',
            sent_status = 'unsent',
            share_token = NULL,
            sent_at = NULL,
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
      throw new Error(`撤回订单失败: ${error.message}`);
    }

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
    let order: { status: string; total_amount: number; deposit_amount: number | null } | undefined;
    try {
      const rows = await sql<
        { status: string; total_amount: number; deposit_amount: number | null }[]
      >`
        SELECT status, total_amount, deposit_amount FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[confirmPayment] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) throw new Error('订单不存在');
    if (!['formal', 'paid'].includes(order.status)) {
      throw new Error(`只有正式订单或已付款订单可以确认收款，当前状态: ${order.status}`);
    }

    const currentDeposit = Number(order.deposit_amount) || 0;
    const newDepositAmount = data?.depositAmount || 0;
    const totalDeposit = currentDeposit + newDepositAmount;

    if (totalDeposit > order.total_amount) {
      throw new Error(`已付款金额不能超过总金额 ${order.total_amount}`);
    }

    const setClauses: any[] = [
      sql`deposit_amount = ${totalDeposit}`,
      sql`updated_at = ${new Date().toISOString()}`,
    ];

    let finalStatus = order.status;
    if (order.status === 'formal') {
      setClauses.push(sql`status = 'paid'`);
      setClauses.push(sql`paid_at = ${new Date().toISOString()}`);
      finalStatus = 'paid';
    }

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    let result: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.orders
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      result = rows[0];
    } catch (error: any) {
      console.error('[confirmPayment] 更新失败:', error);
      throw new Error(`确认收款失败: ${error.message}`);
    }

    await logOrderStatus(
      id,
      order.status,
      finalStatus,
      operator,
      `确认收款 ${newDepositAmount}，累计已付: ${totalDeposit}`
    );

    return result;
  },

  /**
   * ✅ 确认发货
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
    let order:
      | { status: string; shipping_records: any; shipping_method: string | null }
      | undefined;
    try {
      const rows = await sql<
        { status: string; shipping_records: any; shipping_method: string | null }[]
      >`
        SELECT status, shipping_records, shipping_method FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[confirmShipping] 获取订单失败:', fetchError);
      throw new Error(`获取订单信息失败: ${fetchError.message}`);
    }

    if (!order) throw new Error('订单不存在');
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
        const rows = await sql<{ name_cn: string | null; name_en: string | null }[]>`
          SELECT name_cn, name_en FROM public.carriers
          WHERE key = ${data.carrierKey}
          LIMIT 1
        `;
        if (rows[0]) {
          carrierNameCn = rows[0].name_cn || '';
          carrierNameEn = rows[0].name_en || '';
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

    const setClauses: any[] = [
      sql`shipping_records = ${sql.json(updatedRecords)}`,
      sql`updated_at = ${new Date().toISOString()}`,
      sql`tracking_number = ${data?.trackingNumber || ''}`,
      sql`carrier = ${data?.carrierKey || ''}`,
      sql`carrier_name = ${data?.carrierName || ''}`,
      sql`tracking_image = ${data?.trackingImage || ''}`,
    ];

    if (data?.shippingMethod) {
      setClauses.push(sql`shipping_method = ${data.shippingMethod}`);
    }

    let finalStatus = order.status;
    if (order.status === 'paid') {
      setClauses.push(sql`status = 'completed'`);
      finalStatus = 'completed';
    }

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    let result: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.orders
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      result = rows[0];
    } catch (error: any) {
      console.error('[confirmShipping] 更新失败:', error);
      throw new Error(`确认发货失败: ${error.message}`);
    }

    await logOrderStatus(
      id,
      order.status,
      finalStatus,
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
      try {
        const rows = await sql<{ contract_no: string }[]>`
          SELECT contract_no FROM public.orders
          WHERE site_id = ${siteId}
            AND contract_no = ${originalContractNo + '-2'}
          LIMIT 1
        `;
        if (!rows[0]) {
          contractNo = `${originalContractNo}-2`;
        }
      } catch {}
    }

    const excludedFields = [
      'id', 'order_no', 'contract_no', 'status', 'sent_status',
      'share_token', 'share_view_count', 'created_by', 'sent_at',
      'cancelled_at', 'expired_at', 'created_at', 'updated_at', 'paid_at',
      'items', 'status_logs', 'deposit_amount', 'payment_status',
      'paypal_order_id', 'paypal_payer_id', 'paypal_payment_id',
      'tracking_number', 'carrier', 'carrier_name', 'tracking_image',
      'shipping_date', 'shipping_days', 'shipping_records',
    ];

    const copyData: Record<string, any> = {};
    for (const key of Object.keys(originalOrder)) {
      if (!excludedFields.includes(key)) {
        copyData[key] = (originalOrder as any)[key];
      }
    }

    const now = new Date().toISOString();
    Object.assign(copyData, {
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
      created_at: now,
      updated_at: now,
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
    });

    console.log('[reorder] 插入数据字段:', Object.keys(copyData));

    const jsonbFields = new Set(['selected_account_ids', 'shipping_records']);

    let newOrder: any;
    try {
      newOrder = await insertOrder(copyData, jsonbFields);
    } catch (orderError: any) {
      console.error('[reorder] 插入订单失败:', orderError);
      throw new Error(`复制订单失败: ${orderError.message}`);
    }

    if (!newOrder) throw new Error('复制订单失败：未返回数据');

    if (originalOrder.items && originalOrder.items.length > 0) {
      try {
        for (let index = 0; index < originalOrder.items.length; index++) {
          const item: any = originalOrder.items[index];
          await sql`
            INSERT INTO public.order_items (
              order_id, product_id, locale, product_name, product_image,
              category, specification, sku, price, quantity, unit, total, sort_order
            ) VALUES (
              ${newOrder.id}, ${item.product_id || null}, ${item.locale || 'en'},
              ${item.product_name || ''}, ${item.product_image || ''},
              ${item.category || ''}, ${item.specification || ''},
              ${item.sku || ''}, ${item.price || 0},
              ${item.quantity || 0}, ${item.unit || 'pcs'},
              ${item.total || 0}, ${index}
            )
          `;
        }
      } catch (itemsError: any) {
        console.error('[reorder] 复制商品失败:', itemsError);
        try {
          await sql`DELETE FROM public.orders WHERE id = ${newOrder.id}`;
        } catch {}
        throw new Error(`复制订单商品失败: ${itemsError.message}`);
      }
    }

    logOrderStatus(
      newOrder.id,
      null,
      'draft',
      operator,
      `从订单 ${originalOrder.order_no} 复制`
    ).catch((err) => {
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

    let order: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.orders
        WHERE share_token = ${token}
          AND sent_status = 'sent'
          AND status IN ('formal', 'paid', 'completed')
        LIMIT 1
      `;
      order = rows[0];
    } catch (error: any) {
      console.error('[getByShareToken] 查询失败:', error);
      throw new Error(`获取订单失败: ${error.message}`);
    }

    if (!order) {
      console.log('[getByShareToken] 未找到订单或订单不可访问');
      return null;
    }

    console.log('[getByShareToken] 找到订单:', order.id);

    try {
      await sql`
        UPDATE public.orders
        SET share_view_count = ${(order.share_view_count || 0) + 1}
        WHERE id = ${order.id}
      `;
    } catch (updateError) {
      console.warn('[getByShareToken] 更新查看次数失败:', updateError);
    }

    let items: any[] = [];
    try {
      items = await sql<any[]>`
        SELECT * FROM public.order_items
        WHERE order_id = ${order.id}
        ORDER BY sort_order ASC
      `;
    } catch (itemsError) {
      console.warn('[getByShareToken] 获取商品失败:', itemsError);
    }

    const itemsWithSlug = await enrichItemsWithSlugOptimized(items);

    let selectedAccountIds = order.selected_account_ids || [];
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

    let expiredIds: string[] = [];
    try {
      const rows = await sql<{ id: string }[]>`
        UPDATE public.orders
        SET status = 'expired',
            expired_at = ${now},
            updated_at = ${now}
        WHERE site_id = ${siteId}
          AND sent_status = 'sent'
          AND status = 'formal'
          AND expiry_date < ${now}
        RETURNING id
      `;
      expiredIds = rows.map((r) => r.id);
    } catch (error: any) {
      throw new Error(`检查过期订单失败: ${error.message}`);
    }

    if (expiredIds.length > 0) {
      try {
        for (const orderId of expiredIds) {
          await sql`
            INSERT INTO public.order_status_logs (order_id, from_status, to_status, operator, note)
            VALUES (${orderId}, 'formal', 'expired', 'system', '订单已过期')
          `;
        }
      } catch (logError) {
        console.warn('[checkExpiredOrders] 记录过期日志失败:', logError);
      }
    }

    return expiredIds.length;
  },
};

export default orderService;