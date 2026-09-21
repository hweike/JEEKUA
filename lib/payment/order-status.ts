// lib/payment/order-status.ts
import { ORDER_STATUS, ORDER_STATUS_LABELS } from './constants';
import type { OrderStatus } from './types/order';

// ✅ 更新为新的状态体系
export function getStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    draft: 'gray',
    formal: 'blue',        // ✅ formal 替代 sent
    paid: 'green',
    completed: 'emerald',  // ✅ 新增 completed
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
}

export function isEditable(status: OrderStatus): boolean {
  return status === 'draft';
}

export function isDeletable(status: OrderStatus): boolean {
  return status === 'draft' || status === 'cancelled';
}

export function isShareable(status: OrderStatus): boolean {
  // ✅ 已发送的正式订单、已付款、已完成可以分享
  return status === 'formal' || status === 'paid' || status === 'completed';
}

export function isPayable(status: OrderStatus): boolean {
  // ✅ 正式订单可以付款
  return status === 'formal';
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    draft: ['formal', 'cancelled'],      // ✅ draft → formal 或 cancelled
    formal: ['paid', 'cancelled'],       // ✅ formal → paid 或 cancelled
    paid: ['completed', 'cancelled'],    // ✅ paid → completed 或 cancelled
    completed: [],                       // completed 不可再转换
    cancelled: [],                       // cancelled 不可再转换
  };
  return transitions[from]?.includes(to) || false;
}

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    draft: ['formal'],
    formal: ['paid'],
    paid: ['completed'],
    completed: [],
    cancelled: [],
  };
  return transitions[current] || [];
}

export function canCancel(status: OrderStatus): boolean {
  // ✅ draft、formal、paid 可以取消
  return ['draft', 'formal', 'paid'].includes(status);
}

export function canSubmit(status: OrderStatus): boolean {
  // ✅ 只有 draft 可以提交
  return status === 'draft';
}

export function canPay(status: OrderStatus): boolean {
  // ✅ 只有 formal 可以付款
  return status === 'formal';
}

export function canConfirmShipping(status: OrderStatus): boolean {
  // ✅ 只有 paid 可以确认发货
  return status === 'paid';
}

export function canReorder(status: OrderStatus): boolean {
  // ✅ completed 和 cancelled 可以再来一单
  return status === 'completed' || status === 'cancelled';
}

export function isOrderSent(status: OrderStatus, sentStatus: string): boolean {
  // ✅ 判断订单是否已发送
  return sentStatus === 'sent' && (status === 'formal' || status === 'paid' || status === 'completed');
}