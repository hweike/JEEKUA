// app/admin/payment/orders/components/OrderCard.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  Eye, Edit, Trash2, Send, XCircle, Undo2, 
  Copy, FileText, MoreVertical, CheckCircle, 
  Truck, RotateCcw, ChevronDown
} from 'lucide-react';
import type { Order, ShippingRecord } from '@/lib/payment/types/order'; 
import { getCountryFlag, getCountryNameEn, getCountryNameZh } from '@/lib/countries';

// ✅ 扩展 Order 类型，添加可选的 items
interface OrderWithItems extends Order {
  items?: Array<{
    id: string;
    product_name: string;
    specification: string;
    price: number;
    quantity: number;
    unit: string;
    total: number;
    product_image?: string;
    product_id?: string;
  }>;
  deposit_amount?: number;
  shipping_records?: ShippingRecord[];  // ✅ 新增
}

// ✅ 用户类型
interface User {
  id: string;
  name: string;
  email: string;
}

interface OrderCardProps {
  order: OrderWithItems;
  onAction: (action: string, orderId: string) => void;
  onCopyOrderInfo?: (orderNo: string, contractNo?: string) => void;
  actionLoading?: string | null;
  usersMap?: Record<string, User>;
  productSlugMap?: Record<string, string>;
  locale?: string;
}

// ✅ 状态显示配置
const VIEW_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  sent: '已发送',
  pending: '待付款',
  paid: '准备发货',
  completed: '已完成',
  expired: '已过期',
  cancelled: '已取消',
};

const VIEW_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-600',
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-600',
  completed: 'bg-emerald-100 text-emerald-600',
  expired: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function OrderCard({ 
  order, 
  onAction, 
  onCopyOrderInfo,
  actionLoading = null,
  usersMap = {},
  productSlugMap = {},
  locale = 'en'
}: OrderCardProps) {
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ✅ 关键：必须在所有使用 order 的代码之前检查
  if (!order) {
    return null;
  }

  // ✅ 判断当前订单是否正在执行操作
  const isOrderLoading = actionLoading === order.id;

  // ============================================================
  // ✅ 获取显示状态
  // ============================================================
  const getDisplayStatus = (order: OrderWithItems): { viewStatus: string; label: string; color: string } => {
    if (!order) {
      return { viewStatus: 'unknown', label: '未知', color: 'bg-gray-100 text-gray-600' };
    }

    const now = new Date();
    const expiryDate = order?.expiry_date ? new Date(order.expiry_date) : null;
    const isExpired = expiryDate ? now > expiryDate : false;

    if (order.status === 'draft') {
      return { viewStatus: 'draft', label: VIEW_STATUS_LABELS.draft, color: VIEW_STATUS_COLORS.draft };
    }

    if (order.status === 'cancelled') {
      return { viewStatus: 'cancelled', label: VIEW_STATUS_LABELS.cancelled, color: VIEW_STATUS_COLORS.cancelled };
    }

    if (order.sent_status === 'sent') {
      if (order.status === 'formal' && isExpired) {
        return { viewStatus: 'expired', label: VIEW_STATUS_LABELS.expired, color: VIEW_STATUS_COLORS.expired };
      }
      if (order.status === 'formal' && !isExpired) {
        return { viewStatus: 'pending', label: VIEW_STATUS_LABELS.pending, color: VIEW_STATUS_COLORS.pending };
      }
      if (order.status === 'paid') {
        return { viewStatus: 'paid', label: VIEW_STATUS_LABELS.paid, color: VIEW_STATUS_COLORS.paid };
      }
      if (order.status === 'completed') {
        return { viewStatus: 'completed', label: VIEW_STATUS_LABELS.completed, color: VIEW_STATUS_COLORS.completed };
      }
    }

    return { viewStatus: order.status, label: order.status, color: 'bg-gray-100 text-gray-600' };
  };

  const displayStatus = getDisplayStatus(order);

  // ============================================================
  // ✅ 获取主按钮配置 - 支持预付款/尾款场景
  // ============================================================
  const getPrimaryActions = (order: OrderWithItems) => {
    const actions: { label: string; icon: React.ReactNode; action: string; color: string }[] = [];
    const total = Number(order.total_amount) || 0;
    const deposit = Number(order.deposit_amount) || 0;
    const hasDeposit = deposit > 0 && deposit < total;

    // 草稿 → 确认发送
    if (order.status === 'draft') {
      actions.push({
        label: '确认发送',
        icon: <Send size={16} />,
        action: 'submit',
        color: 'bg-blue-600 hover:bg-blue-700',
      });
    }

    // ✅ 正式订单 → 确认收款
    if (order.status === 'formal') {
      actions.push({
        label: '确认收款',
        icon: <CheckCircle size={16} />,
        action: 'confirm_payment',
        color: 'bg-green-600 hover:bg-green-700',
      });
    }

    // ✅ 已付款 - 处理预付款/尾款场景
    if (order.status === 'paid') {
      const total = Number(order.total_amount) || 0;
      const deposit = Number(order.deposit_amount) || 0;
      const remaining = total - deposit;
      
      if (remaining > 0) {
        // 有尾款 → 继续收款（状态保持 paid）
        actions.push({
          label: '继续收款',
          icon: <CheckCircle size={16} />,
          action: 'confirm_payment',
          color: 'bg-green-600 hover:bg-green-700',
        });
        actions.push({
          label: '确认发货',
          icon: <Truck size={16} />,
          action: 'confirm_shipping',
          color: 'bg-indigo-600 hover:bg-indigo-700',
        });
      } else {
        // 已付全款 → 确认发货
        actions.push({
          label: '确认发货',
          icon: <Truck size={16} />,
          action: 'confirm_shipping',
          color: 'bg-indigo-600 hover:bg-indigo-700',
        });
      }
    }

    // 已完成 → 再来一单
    if (order.status === 'completed') {
      actions.push({
        label: '再来一单',
        icon: <RotateCcw size={16} />,
        action: 'reorder',
        color: 'bg-purple-600 hover:bg-purple-700',
      });
    }

    // 已取消 → 复制
    if (order.status === 'cancelled') {
      actions.push({
        label: '复制',
        icon: <Copy size={16} />,
        action: 'duplicate',
        color: 'bg-gray-600 hover:bg-gray-700',
      });
    }

    return actions;
  };

  const primaryActions = getPrimaryActions(order);
  const primaryAction = primaryActions.length > 0 ? primaryActions[0] : null;
  const hasDropdown = primaryActions.length > 1;

  // ============================================================
  // ✅ 获取更多菜单选项
  // ============================================================
  const getMoreActions = (order: OrderWithItems) => {
  const actions: { label: string; icon: React.ReactNode; action: string; show: boolean }[] = [];

  actions.push({
    label: '订单详情',
    icon: <Eye size={14} />,
    action: 'view',
    show: true,
  });

  actions.push({
    label: '编辑订单',
    icon: <Edit size={14} />,
    action: 'edit',
    show: order.status === 'draft',
  });

  actions.push({
    label: '撤回发送',
    icon: <Undo2 size={14} />,
    action: 'recall',
    show: order.status === 'formal' && order.sent_status === 'sent',
  });
  
  // ✅ 新增：发货管理（已完成订单可查看/修改发货信息）
  actions.push({
    label: '发货管理',
    icon: <Truck size={14} />,
    action: 'shipping_management',
    show: order.status === 'completed',  // 仅已完成订单显示
  });
  
  actions.push({
    label: '复制账单链接',
    icon: <Copy size={14} />,
    action: 'copy_link',
    show: ['formal', 'paid', 'completed'].includes(order.status) && order.sent_status === 'sent',
  });

  actions.push({
    label: '下载PI/账单',
    icon: <FileText size={14} />,
    action: 'download_pdf',
    show: ['formal', 'paid', 'completed'].includes(order.status) && order.sent_status === 'sent',
  });

  

  actions.push({
    label: '取消订单',
    icon: <XCircle size={14} />,
    action: 'cancel',
    show: ['draft', 'formal', 'paid'].includes(order.status),
  });

  actions.push({
    label: '删除订单',
    icon: <Trash2 size={14} />,
    action: 'delete',
    show: ['draft', 'cancelled'].includes(order.status),
  });

  return actions.filter(a => a.show);
};

  const moreActions = getMoreActions(order);

  // ✅ 安全获取商品列表
  const items = order.items || [];
  const firstItem = items.length > 0 ? items[0] : null;
  const hasMultipleItems = items.length > 1;

  // 格式化货币
  const formatCurrency = (amount: number | string | null | undefined, currency: string) => {
    const num = typeof amount === 'number' ? amount : Number(amount ?? 0);
    if (isNaN(num)) return `${currency} 0.00`;
    return `${currency} ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // ============================================================
  // ✅ 获取金额显示信息
  // ============================================================
  const getAmountDisplay = () => {
    const total = Number(order.total_amount) || 0;
    const deposit = Number(order.deposit_amount) || 0;
    const currency = order.currency || 'USD';
    
    const format = (amount: number | string | null | undefined) => {
      const num = typeof amount === 'number' ? amount : Number(amount ?? 0);
      if (isNaN(num)) return `${currency} 0.00`;
      return `${currency} ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    };

    if (order.status === 'draft' || order.status === 'cancelled') {
      return {
        totalDisplay: format(total),
        depositDisplay: null,
        balanceDisplay: null,
        isFullPaid: false,
        statusLabel: null,
      };
    }

    if (order.status === 'formal' && deposit === 0) {
      return {
        totalDisplay: format(total),
        depositDisplay: null,
        balanceDisplay: null,
        isFullPaid: false,
        statusLabel: null,
      };
    }

    if (deposit >= total || 
        (deposit === 0 && (order.status === 'paid' || order.status === 'completed'))) {
      return {
        totalDisplay: format(total),
        depositDisplay: format(total),
        balanceDisplay: null,
        isFullPaid: true,
        statusLabel: '已付全款',
        statusColor: 'bg-emerald-100 text-emerald-700',
      };
    }

    if (deposit > 0 && deposit < total) {
      return {
        totalDisplay: format(total),
        depositDisplay: format(deposit),
        balanceDisplay: format(total - deposit),
        isFullPaid: false,
        statusLabel: null,
      };
    }

    return {
      totalDisplay: format(total),
      depositDisplay: null,
      balanceDisplay: null,
      isFullPaid: false,
      statusLabel: null,
    };
  };

  const amountDisplay = getAmountDisplay();

  // 获取运输方式显示
  const getShippingDisplay = () => {
    if (order.shipping_method && order.trade_term) {
      return `${order.shipping_method} - ${order.trade_term}`;
    }
    return order.shipping_method || order.trade_term || '-';
  };

  // 使用 lib/countries.ts 获取国家信息
  const getCountryInfo = (countryCode: string) => {
    if (!countryCode) return { flag: '🌍', display: 'Unknown' };
    const flag = getCountryFlag(countryCode);
    const nameEn = getCountryNameEn(countryCode);
    const nameZh = getCountryNameZh(countryCode);
    return { flag, display: `${flag} ${nameZh} (${nameEn})` };
  };

  const countryInfo = getCountryInfo(order.buyer_country || '');

  // ✅ 获取创建者姓名
  const getCreatedByName = () => {
    if (!order.created_by) return null;
    if (usersMap && usersMap[order.created_by]) {
      return usersMap[order.created_by].name || order.created_by;
    }
    return order.created_by;
  };

  const createdByName = getCreatedByName();

  // ✅ 获取产品详情页链接（使用 slug）
  const getProductLink = (item: any) => {
    if (!item?.product_id) return '#';
    const slug = productSlugMap?.[item.product_id];
    if (slug) {
      return `/${locale}/product/${slug}`;
    }
    return '#';
  };

  // ✅ 判断是否为有效链接
  const hasValidProductLink = (item: any) => {
    return item?.product_id && productSlugMap?.[item.product_id] ? true : false;
  };

  // ✅ 打开菜单时计算位置（智能判断上下方向，避免被截断）
  const handleOpenMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = Math.min(300, moreActions.length * 40 + 20);
      
      // 如果下方空间不足，向上弹出
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setMenuPosition({
          top: rect.top - menuHeight - 4,
          left: rect.left,
        });
      } else {
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    }
    setShowMoreMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMoreMenu(false);
  };

  // ✅ 格式化时间到分秒
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return dateStr;
    }
  };

  // ✅ 处理复制订单号
  const handleCopyOrderInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopyOrderInfo) {
      onCopyOrderInfo(order.order_no, order.contract_no);
    }
  };

  // ✅ 加载状态 Spinner 组件
  const LoadingSpinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 表头：订单号 + 合同号 */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono font-medium text-gray-700 flex items-center gap-1">
            <span>订单号 {order.order_no}</span>
            {order.contract_no && (
              <span className="text-gray-400"> ({order.contract_no})</span>
            )}
            <button
              onClick={handleCopyOrderInfo}
              className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
              title="复制订单号和合同号"
            >
              <Copy size={12} />
            </button>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${displayStatus.color}`}>
            {displayStatus.label}
          </span>
          {order.sent_status === 'sent' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200">
              ✓ 已发送
            </span>
          )}
          <button
            onClick={() => router.push(`/admin/payment/orders/${order.id}`)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            订单详情 →
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {createdByName && (
            <span className="flex items-center gap-1">
              <span className="text-gray-500">👤</span>
              <span>{createdByName}</span>
            </span>
          )}
          <span>{formatDateTime(order.created_at)}</span>
        </div>
      </div>

      {/* 主体 */}
      <div className="p-4">
        <div className="grid grid-cols-12 gap-3">
          {/* 1. 买家信息 - 2列 */}
          <div className="col-span-12 sm:col-span-2">
            <div className="flex flex-col min-w-0">
              <div className="font-medium text-sm truncate">{order.buyer_name || '-'}</div>
              {order.buyer_email && (
                <div className="text-xs text-gray-400 truncate">{order.buyer_email}</div>
              )}
              <div className="text-xs text-gray-400 truncate">
                {countryInfo.display}
              </div>
            </div>
          </div>

          {/* 2. 产品信息 - 4列 */}
          <div className="col-span-12 sm:col-span-4">
            {firstItem ? (
              <div className="flex items-start gap-3">
                {firstItem.product_image && hasValidProductLink(firstItem) ? (
                  <a
                    href={getProductLink(firstItem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <img 
                      src={firstItem.product_image} 
                      alt={firstItem.product_name}
                      className="w-16 h-16 object-cover rounded border flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </a>
                ) : firstItem.product_image ? (
                  <img 
                    src={firstItem.product_image} 
                    alt={firstItem.product_name}
                    className="w-16 h-16 object-cover rounded border flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-2xl flex-shrink-0">
                    📦
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {hasValidProductLink(firstItem) ? (
                    <a
                      href={getProductLink(firstItem)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium line-clamp-2 break-words hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {firstItem.product_name || '未命名商品'}
                    </a>
                  ) : (
                    <span className="text-sm font-medium line-clamp-2 break-words">
                      {firstItem.product_name || '未命名商品'}
                    </span>
                  )}
                  {firstItem.specification && (
                    <div className="text-xs text-gray-500 truncate">
                      {firstItem.specification}
                    </div>
                  )}
                  {firstItem.price !== undefined && firstItem.quantity !== undefined && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(firstItem.price, order.currency)} × {firstItem.quantity}
                    </div>
                  )}
                  {hasMultipleItems && (
                    <div className="text-xs text-blue-600 mt-0.5">
                      +{items.length - 1} 种商品
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">暂无商品</div>
            )}
          </div>

          {/* 3. 订单金额 - 2列 */}
          <div className="col-span-6 sm:col-span-2">
            <div className="flex flex-col">
              <div className="font-bold text-sm text-gray-900">
                {amountDisplay.totalDisplay}
                {amountDisplay.isFullPaid && (
                  <span className={`text-xs font-normal ml-1 px-1.5 py-0.5 rounded ${amountDisplay.statusColor}`}>
                    已付全款
                  </span>
                )}
              </div>
              {amountDisplay.depositDisplay && (
                <div className="text-xs text-gray-400">
                  预付款: {amountDisplay.depositDisplay}
                </div>
              )}
              {amountDisplay.balanceDisplay && (
                <div className="text-xs text-gray-400">
                  尾款: {amountDisplay.balanceDisplay}
                </div>
              )}
            </div>
          </div>

          {/* 4. 出口/运输 - 1列 */}
          <div className="col-span-6 sm:col-span-1">
            <div className="text-xs text-gray-500">
              {getShippingDisplay()}
            </div>
          </div>

          {/* 5. 状态 - 1列 */}
          <div className="col-span-6 sm:col-span-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${displayStatus.color}`}>
              {displayStatus.label}
            </span>
          </div>

          {/* 6. 操作 - 2列 */}
          <div className="col-span-12 sm:col-span-2">
            <div className="flex flex-col items-end gap-1.5">
              {/* ✅ 主按钮 - 根据是否有下拉按钮决定圆角 */}
              {primaryAction && (
                <div className="relative w-full">
                  <div className="flex w-full">
                    <button
                      onClick={() => onAction(primaryAction.action, order.id)}
                      disabled={isOrderLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white transition-colors flex-1 justify-center whitespace-nowrap ${
                        hasDropdown 
                          ? `rounded-l-lg ${primaryAction.color}` 
                          : `rounded-lg ${primaryAction.color}`
                      } ${
                        isOrderLoading ? 'opacity-70 cursor-wait' : ''
                      }`}
                    >
                      {isOrderLoading ? (
                        <>
                          <LoadingSpinner />
                          <span>处理中...</span>
                        </>
                      ) : (
                        <>
                          {primaryAction.icon}
                          <span>{primaryAction.label}</span>
                        </>
                      )}
                    </button>
                    {hasDropdown && (
                      <button
                        onClick={() => setShowPrimaryDropdown(!showPrimaryDropdown)}
                        disabled={isOrderLoading}
                        className={`px-2 py-1.5 text-sm text-white rounded-r-lg ${primaryAction.color} transition-colors border-l border-white/20 flex-shrink-0 ${
                          isOrderLoading ? 'opacity-70 cursor-wait' : ''
                        }`}
                      >
                        <ChevronDown size={14} />
                      </button>
                    )}
                  </div>
                  {showPrimaryDropdown && hasDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[180px] py-1">
                      {primaryActions.slice(1).map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setShowPrimaryDropdown(false);
                            onAction(action.action, order.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors whitespace-nowrap"
                        >
                          {action.icon}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ✅ 更多菜单按钮 - whitespace-nowrap 防止换行 */}
              {moreActions.length > 0 && (
                <div className="relative w-full">
                  <button
                    ref={buttonRef}
                    onClick={handleOpenMenu}
                    disabled={isOrderLoading}
                    className={`flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full justify-center border border-gray-200 whitespace-nowrap ${
                      isOrderLoading ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    <MoreVertical size={14} />
                    <span>{isOrderLoading ? '处理中...' : '更多'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 备注 */}
      {order.remark && (
        <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-400">备注：</span>
          <span className="text-xs text-gray-600">{order.remark}</span>
        </div>
      )}

      {/* ✅ 使用 Portal 渲染下拉菜单到 body */}
      {mounted && showMoreMenu && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9999]"
            onClick={handleCloseMenu}
          />
          <div 
            className="fixed z-[10000] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] max-w-[220px]"
            style={{
              top: menuPosition.top,
              left: Math.min(menuPosition.left, window.innerWidth - 180),
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {moreActions.map((action) => (
              <button
                key={action.action}
                onClick={() => {
                  handleCloseMenu();
                  onAction(action.action, order.id);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors text-left"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}