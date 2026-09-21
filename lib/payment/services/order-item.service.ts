// lib/payment/services/order-item.service.ts
import { supabase } from '@/lib/supabase/client';
import type { OrderItem, CreateOrderItemInput, UpdateOrderItemInput } from '../types/order';

export const orderItemService = {
  async getItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('sort_order');

    if (error) throw new Error(`获取订单商品失败: ${error.message}`);
    return data || [];
  },

  async addItems(orderId: string, items: CreateOrderItemInput[]): Promise<void> {
    const itemsToInsert = items.map((item, index) => ({
      order_id: orderId,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_image: item.product_image || '',
      category: item.category || '',
      specification: item.specification || '',
      sku: item.sku || '',
      price: item.price,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      total: item.price * item.quantity,
      sort_order: index,
    }));

    const { error } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (error) throw new Error(`添加订单商品失败: ${error.message}`);
  },

  async updateItem(itemId: string, input: UpdateOrderItemInput): Promise<OrderItem> {
    const { data: current, error: fetchError } = await supabase
      .from('order_items')
      .select('price, quantity')
      .eq('id', itemId)
      .single();

    if (fetchError) throw new Error(`获取商品信息失败: ${fetchError.message}`);

    const price = input.price !== undefined ? input.price : current.price;
    const quantity = input.quantity !== undefined ? input.quantity : current.quantity;
    const total = price * quantity;

    const { data, error } = await supabase
      .from('order_items')
      .update({
        ...input,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`更新订单商品失败: ${error.message}`);
    return data;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`删除订单商品失败: ${error.message}`);
  },

  async deleteItems(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (error) throw new Error(`删除订单商品失败: ${error.message}`);
  },

  async recalculateOrderTotal(orderId: string): Promise<void> {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('total')
      .eq('order_id', orderId);

    if (error) throw new Error(`获取商品列表失败: ${error.message}`);

    const sub_total = items.reduce((sum, item) => sum + item.total, 0);

    const { data: order } = await supabase
      .from('orders')
      .select('discount, shipping_fee, tax')
      .eq('id', orderId)
      .single();

    if (order) {
      const total_amount = sub_total + (order.shipping_fee || 0) + (order.tax || 0) - (order.discount || 0);
      
      await supabase
        .from('orders')
        .update({
          sub_total,
          total_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }
  },
};

export default orderItemService;