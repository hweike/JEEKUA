// lib/payment/services/order-item.service.ts
import sql from '@/lib/db/admin';
import type { OrderItem, CreateOrderItemInput, UpdateOrderItemInput } from '../types/order';

export const orderItemService = {
  async getItems(orderId: string): Promise<OrderItem[]> {
    try {
      return await sql<OrderItem[]>`
        SELECT * FROM public.order_items
        WHERE order_id = ${orderId}
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      throw new Error(`获取订单商品失败: ${error.message}`);
    }
  },

  async addItems(orderId: string, items: CreateOrderItemInput[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        await sql`
          INSERT INTO public.order_items (
            order_id, product_id, product_name, product_image, category,
            specification, sku, price, quantity, unit, total, sort_order
          ) VALUES (
            ${orderId}, ${item.product_id || null}, ${item.product_name},
            ${item.product_image || ''}, ${item.category || ''},
            ${item.specification || ''}, ${item.sku || ''},
            ${item.price}, ${item.quantity}, ${item.unit || 'pcs'},
            ${item.price * item.quantity}, ${index}
          )
        `;
      }
    } catch (error: any) {
      throw new Error(`添加订单商品失败: ${error.message}`);
    }
  },

  async updateItem(itemId: string, input: UpdateOrderItemInput): Promise<OrderItem> {
    // 1. 查当前
    let current: { price: number; quantity: number } | undefined;
    try {
      const rows = await sql<{ price: number; quantity: number }[]>`
        SELECT price, quantity FROM public.order_items
        WHERE id = ${itemId}
        LIMIT 1
      `;
      current = rows[0];
    } catch (fetchError: any) {
      throw new Error(`获取商品信息失败: ${fetchError.message}`);
    }
    if (!current) throw new Error('订单商品不存在');

    const price = input.price !== undefined ? input.price : current.price;
    const quantity = input.quantity !== undefined ? input.quantity : current.quantity;
    const total = price * quantity;

    // 2. 动态 SET
    const setClauses: any[] = [];
    if (input.price !== undefined) setClauses.push(sql`price = ${input.price}`);
    if (input.quantity !== undefined) setClauses.push(sql`quantity = ${input.quantity}`);
    if (input.product_name !== undefined) setClauses.push(sql`product_name = ${input.product_name}`);
    if (input.product_image !== undefined) setClauses.push(sql`product_image = ${input.product_image}`);
    if (input.category !== undefined) setClauses.push(sql`category = ${input.category}`);
    if (input.specification !== undefined) setClauses.push(sql`specification = ${input.specification}`);
    if (input.sku !== undefined) setClauses.push(sql`sku = ${input.sku}`);
    if (input.unit !== undefined) setClauses.push(sql`unit = ${input.unit}`);
    setClauses.push(sql`total = ${total}`);
    setClauses.push(sql`updated_at = ${new Date().toISOString()}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    try {
      const rows = await sql<OrderItem[]>`
        UPDATE public.order_items
        SET ${setClause}
        WHERE id = ${itemId}
        RETURNING *
      `;
      if (!rows[0]) throw new Error('更新未返回数据');
      return rows[0];
    } catch (error: any) {
      throw new Error(`更新订单商品失败: ${error.message}`);
    }
  },

  async deleteItem(itemId: string): Promise<void> {
    try {
      await sql`
        DELETE FROM public.order_items
        WHERE id = ${itemId}
      `;
    } catch (error: any) {
      throw new Error(`删除订单商品失败: ${error.message}`);
    }
  },

  async deleteItems(orderId: string): Promise<void> {
    try {
      await sql`
        DELETE FROM public.order_items
        WHERE order_id = ${orderId}
      `;
    } catch (error: any) {
      throw new Error(`删除订单商品失败: ${error.message}`);
    }
  },

  async recalculateOrderTotal(orderId: string): Promise<void> {
    // 1. 计算子总额
    let sub_total = 0;
    try {
      const items = await sql<{ total: number }[]>`
        SELECT total FROM public.order_items
        WHERE order_id = ${orderId}
      `;
      sub_total = items.reduce((sum, item) => sum + item.total, 0);
    } catch (error: any) {
      throw new Error(`获取商品列表失败: ${error.message}`);
    }

    // 2. 查订单折扣、运费、税
    let order: { discount: number | null; shipping_fee: number | null; tax: number | null } | undefined;
    try {
      const rows = await sql<{ discount: number | null; shipping_fee: number | null; tax: number | null }[]>`
        SELECT discount, shipping_fee, tax FROM public.orders
        WHERE id = ${orderId}
        LIMIT 1
      `;
      order = rows[0];
    } catch {}

    if (order) {
      const total_amount =
        sub_total +
        (order.shipping_fee || 0) +
        (order.tax || 0) -
        (order.discount || 0);

      try {
        await sql`
          UPDATE public.orders
          SET sub_total = ${sub_total},
              total_amount = ${total_amount},
              updated_at = ${new Date().toISOString()}
          WHERE id = ${orderId}
        `;
      } catch {}
    }
  },
};

export default orderItemService;