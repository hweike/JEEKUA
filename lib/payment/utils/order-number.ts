// lib/payment/utils/order-number.ts
import sql from '@/lib/db/admin';

/**
 * 生成订单号
 * 格式: PI-YYYYMMDD-XXX
 * 例如: PI-20260901-001
 */
export async function generateOrderNo(siteId: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const sitePrefix = siteId ? siteId.slice(-3) : '001';

  const timestamp = now.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `PI-${dateStr}-${sitePrefix}${timestamp}${random}`;
}

/**
 * 检查订单号是否已存在（用于重试验证）
 */
export async function isOrderNoExists(orderNo: string): Promise<boolean> {
  try {
    const rows = await sql<{ order_no: string }[]>`
      SELECT order_no FROM public.orders
      WHERE order_no = ${orderNo}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (error) {
    console.error('检查订单号失败:', error);
    return false;
  }
}