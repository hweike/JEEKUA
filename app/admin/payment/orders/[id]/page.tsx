// app/admin/payment/orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Loader2, 
  ArrowLeft, 
  Printer, 
  Share2, 
  Copy, 
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  Undo2,
  CreditCard,
  Truck
} from 'lucide-react';
import Toast from '@/components/Toast';
import type { PaymentMethodType } from '@/lib/payment/types/account';

// ============================================================
// 类型定义
// ============================================================
interface OrderItem {
  id: string;
  product_name: string;
  specification: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
  product_image?: string;
}

// ✅ 发货记录类型
interface ShippingRecord {
  id: string;
  carrier_key: string;
  carrier_name_cn: string;
  carrier_name_en: string;
  tracking_number: string;
  tracking_image?: string;
  shipping_method: string;
  created_at: string;
}

interface OrderDetail {
  id: string;
  site_id: string;
  order_no: string;
  contract_no?: string;
  buyer_name: string;
  buyer_email: string;
  buyer_company?: string;
  buyer_country?: string;
  buyer_phone?: string;
  buyer_address?: string;
  payment_method: 'bank_transfer' | 'qr_code' | 'online_payment';
  currency: string;
  sub_total: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  total_amount: number;
  shipping_method?: string;
  shipping_date_type?: string;
  shipping_date?: string;
  shipping_days?: number;
  trade_term?: string;
  expiry_date?: string;
  legal_terms?: string;
  postscript?: string;
  remark?: string;
  status: string;
  share_token?: string;
  deposit_amount?: number;
  paid_at?: string;
  // ✅ 新增：发货记录
  shipping_records?: ShippingRecord[];
  status_logs: Array<{
    id: string;
    from_status: string;
    to_status: string;
    operator: string;
    note: string;
    created_at: string;
  }>;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  sent_at?: string;
  paid_at?: string;
  cancelled_at?: string;
  expired_at?: string;
}

// ============================================================
// 状态配置
// ============================================================
const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700',
    icon: <FileText size={16} />,
  },
  sent: {
    label: '已发送',
    color: 'bg-blue-100 text-blue-700',
    icon: <Send size={16} />,
  },
  pending_payment: {
    label: '待付款',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock size={16} />,
  },
  paid: {
    label: '已付款',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle size={16} />,
  },
  expired: {
    label: '已过期',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle size={16} />,
  },
  cancelled: {
    label: '已取消',
    color: 'bg-gray-100 text-gray-500',
    icon: <XCircle size={16} />,
  },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'T/T银行转账',
  qr_code: '扫码支付',
  online_payment: '在线支付',
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  bank_transfer: '🏦',
  qr_code: '📱',
  online_payment: '💳',
};

// ✅ 运输方式映射
const SHIPPING_METHOD_MAP: Record<string, string> = {
  '快递': '快递',
  '多式联运': '多式联运',
  '海运': '海运',
  '空运': '空运',
  '陆运': '陆运',
  '邮政': '邮政',
};

// ✅ 贸易术语映射
const TRADE_TERM_MAP: Record<string, string> = {
  'EXW': '工厂交货',
  'FCA': '货交承运人',
  'FAS': '船边交货',
  'FOB': '船上交货',
  'CFR': '成本加运费',
  'CIF': '成本保险费加运费',
  'CPT': '运费付至',
  'CIP': '运费保险费付至',
  'DAT': '运输终端交货',
  'DAP': '目的地交货',
  'DDP': '完税后交货',
};

// ============================================================
// 主组件
// ============================================================
export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  // ============================================================
  // 加载订单数据
  // ============================================================
  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payment/orders/${orderId}`);
      const result = await res.json();
      
      if (result.success) {
        setOrder(result.data);
      } else {
        setToast({ message: result.error || '加载失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 操作处理
  // ============================================================
  const handleSubmit = async () => {
    if (!order) return;
    if (!confirm('确认要提交此订单吗？提交后将发送给客户。')) return;

    try {
      const res = await fetch(`/api/admin/payment/orders/${orderId}/actions?action=submit`, {
        method: 'POST',
      });
      const result = await res.json();
      
      if (result.success) {
        setToast({ message: '订单已提交', type: 'success' });
        // 复制分享链接
        if (result.data?.shareUrl) {
          await navigator.clipboard.writeText(result.data.shareUrl);
          setToast({ message: '订单已提交，分享链接已复制', type: 'success' });
        }
        loadOrder();
      } else {
        setToast({ message: result.error || '提交失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '提交失败', type: 'error' });
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const reason = prompt('请输入取消原因（可选）：');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/admin/payment/orders/${orderId}/actions?action=cancel&reason=${encodeURIComponent(reason || '')}`, {
        method: 'POST',
      });
      const result = await res.json();
      
      if (result.success) {
        setToast({ message: '订单已取消', type: 'success' });
        loadOrder();
      } else {
        setToast({ message: result.error || '取消失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '取消失败', type: 'error' });
    }
  };

  const handleRecall = async () => {
    if (!order) return;
    if (!confirm('确认要撤回此订单吗？撤回后客户将无法查看。')) return;

    try {
      const res = await fetch(`/api/admin/payment/orders/${orderId}/actions?action=recall`, {
        method: 'POST',
      });
      const result = await res.json();
      
      if (result.success) {
        setToast({ message: '订单已撤回', type: 'success' });
        loadOrder();
      } else {
        setToast({ message: result.error || '撤回失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '撤回失败', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm('确定要删除此订单吗？此操作不可恢复。')) return;

    try {
      const res = await fetch(`/api/admin/payment/orders/${orderId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      
      if (result.success) {
        setToast({ message: '订单已删除', type: 'success' });
        setTimeout(() => router.push('/admin/payment/orders'), 1000);
      } else {
        setToast({ message: result.error || '删除失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '删除失败', type: 'error' });
    }
  };

  // ✅ 修复分享链接 - 自动提取当前 locale
  const handleCopyShareLink = async () => {
    if (!order?.share_token) {
      setToast({ message: '暂无分享链接', type: 'error' });
      return;
    }
    
    const pathname = window.location.pathname;
    const localeMatch = pathname.match(/^\/([a-z]{2})\//);
    const locale = localeMatch ? localeMatch[1] : 'en';
    
    const url = `${window.location.origin}/${locale}/payment/order/share/${order.share_token}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setToast({ message: '分享链接已复制', type: 'success' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setToast({ message: '复制失败', type: 'error' });
    }
  };

  // ✅ 下载 PDF
  const handleDownloadPDF = () => {
    window.open(`/api/admin/payment/orders/${orderId}/pdf`, '_blank');
  };

  // ============================================================
  // 获取操作按钮
  // ============================================================
  const getActionButtons = () => {
    if (!order) return null;
    
    const status = order.status;
    const buttons: React.ReactNode[] = [];

    switch (status) {
      case 'draft':
        buttons.push(
          <button
            key="edit"
            onClick={() => router.push(`/admin/payment/orders/${orderId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            编辑订单
          </button>,
          <button
            key="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Send size={16} className="inline mr-1" /> 提交
          </button>,
          <button
            key="delete"
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            删除
          </button>
        );
        break;

      case 'sent':
        buttons.push(
          <button
            key="share"
            onClick={handleCopyShareLink}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Share2 size={16} className="inline mr-1" /> 复制分享链接
          </button>,
          <button
            key="recall"
            onClick={handleRecall}
            className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Undo2 size={16} className="inline mr-1" /> 撤回
          </button>,
          <button
            key="delete"
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            删除
          </button>
        );
        break;

      case 'pending_payment':
        buttons.push(
          <button
            key="copy"
            onClick={handleCopyShareLink}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Copy size={16} className="inline mr-1" /> 复制链接
          </button>,
          <button
            key="cancel"
            onClick={handleCancel}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            取消订单
          </button>
        );
        break;

      case 'paid':
      case 'expired':
      case 'cancelled':
        if (status === 'expired' || status === 'cancelled') {
          buttons.push(
            <button
              key="delete"
              onClick={handleDelete}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              删除
            </button>
          );
        }
        break;
    }

    // ✅ 所有状态都添加下载PDF按钮
    buttons.push(
      <button
        key="download"
        onClick={handleDownloadPDF}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Download size={16} className="inline mr-1" /> 下载PI
      </button>
    );

    return buttons;
  };

  // ============================================================
  // 渲染订单状态徽章
  // ============================================================
  const renderStatusBadge = (status: string) => {
    const config = ORDER_STATUS_CONFIG[status];
    if (!config) return <span>{status}</span>;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // ============================================================
  // ✅ 获取支付记录数据
  // ============================================================
  const getPaymentRecords = () => {
    if (!order) return null;
    const total = order.total_amount || 0;
    const deposit = order.deposit_amount || 0;
    const paid = deposit;
    const pending = total - paid;

    let paymentStatus = 'unpaid';
    let statusText = '未支付';
    let statusColor = 'bg-gray-100 text-gray-600';
    let isFullPaid = false;

    if (paid >= total && total > 0) {
      paymentStatus = 'fully_paid';
      statusText = '已付全款';
      statusColor = 'bg-emerald-100 text-emerald-700';
      isFullPaid = true;
    } else if (paid > 0 && paid < total) {
      paymentStatus = 'partial_paid';
      statusText = '部分支付';
      statusColor = 'bg-yellow-100 text-yellow-700';
    }

    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

    return {
      total,
      paid,
      pending,
      status: paymentStatus,
      statusText,
      statusColor,
      isFullPaid,
      percent,
      currency: order.currency || 'USD',
      paid_at: order.paid_at,
      deposit,
    };
  };

  // ✅ 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // ✅ 获取发货日期显示
  const getShippingDateDisplay = () => {
    if (!order) return '-';
    if (!order.shipping_date_type) return '-';
    if (order.shipping_date_type === 'deposit') {
      return `预付款到账后${order.shipping_days || 10}个自然日内发货`;
    }
    if (order.shipping_date_type === 'balance') {
      return `尾款到账后${order.shipping_days || 10}个自然日内发货`;
    }
    if (order.shipping_date_type === 'fixed' && order.shipping_date) {
      return new Date(order.shipping_date).toLocaleDateString('zh-CN');
    }
    return '-';
  };

  // ============================================================
  // 加载状态
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">加载订单...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-2xl mb-2">📋</p>
        <p>订单不存在或已被删除</p>
        <button
          onClick={() => router.push('/admin/payment/orders')}
          className="mt-4 text-blue-600 hover:underline flex items-center gap-1 mx-auto"
        >
          <ArrowLeft size={16} /> 返回列表
        </button>
      </div>
    );
  }

  const paymentRecords = getPaymentRecords();

  // ============================================================
  // 主渲染
  // ============================================================
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/payment/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} /> 返回列表
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              订单详情
              {renderStatusBadge(order.status)}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              订单号: {order.order_no} {order.contract_no && `| 合同号: ${order.contract_no}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {getActionButtons()}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 订单概览卡片 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">订单金额</div>
          <div className="text-xl font-bold text-blue-600">
            {order.currency} {order.total_amount.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">支付方式</div>
          <div className="text-lg font-medium">
            {PAYMENT_METHOD_ICONS[order.payment_method]} {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">创建时间</div>
          <div className="text-lg font-medium">
            {new Date(order.created_at).toLocaleDateString('zh-CN')}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleTimeString('zh-CN')}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">买家</div>
          <div className="text-lg font-medium truncate" title={order.buyer_name}>
            {order.buyer_name}
          </div>
          <div className="text-xs text-gray-400 truncate" title={order.buyer_email}>
            {order.buyer_email}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. 买家信息 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium">👤 买家信息</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">买家名称</div>
              <div className="font-medium">{order.buyer_name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">公司名称</div>
              <div className="font-medium">{order.buyer_company || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">联系电话</div>
              <div className="font-medium">{order.buyer_phone || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">买家邮箱</div>
              <div className="font-medium">{order.buyer_email || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">国家/地区</div>
              <div className="font-medium">{order.buyer_country || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">收货地址</div>
              <div className="font-medium">{order.buyer_address || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. 账单信息 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium">📋 账单信息</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-500">合同号</div>
              <div className="font-medium">{order.contract_no || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">账单截止时间</div>
              <div className="font-medium">
                {order.expiry_date ? new Date(order.expiry_date).toLocaleDateString('zh-CN') : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">账单币种</div>
              <div className="font-medium">{order.currency}</div>
            </div>
          </div>

          {/* 商品表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left w-[70px]">图片</th>
                  <th className="px-3 py-2 text-left">商品名称</th>
                  <th className="px-3 py-2 text-left w-[120px]">规格</th>
                  <th className="px-3 py-2 text-right w-[100px]">单价</th>
                  <th className="px-3 py-2 text-center w-[80px]">数量</th>
                  <th className="px-3 py-2 text-center w-[80px]">单位</th>
                  <th className="px-3 py-2 text-right w-[100px]">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-300 text-2xl">
                          📦
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.product_name}</td>
                    <td className="px-3 py-2 text-gray-600">{item.specification || '-'}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {order.currency} {item.price.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-center">{item.unit || 'pcs'}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600">
                      {order.currency} {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 金额汇总 */}
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">商品总金额</span>
                <span className="font-mono">{order.currency} {order.sub_total.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>折扣</span>
                  <span className="font-mono">-{order.currency} {order.discount.toFixed(2)}</span>
                </div>
              )}
              {order.shipping_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">运费</span>
                  <span className="font-mono">{order.currency} {order.shipping_fee.toFixed(2)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">税费</span>
                  <span className="font-mono">{order.currency} {order.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>账单总金额</span>
                <span className="font-mono text-blue-600">{order.currency} {order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. 运输信息 - 只显示订单级运输信息 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium">🚚 运输信息</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">运输方式</div>
              <div className="font-medium">
                {order.shipping_method 
                  ? (SHIPPING_METHOD_MAP[order.shipping_method] || order.shipping_method)
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">发货日期</div>
              <div className="font-medium">
                {getShippingDateDisplay()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">贸易术语</div>
              <div className="font-medium">
                {order.trade_term 
                  ? `${order.trade_term} (${TRADE_TERM_MAP[order.trade_term] || order.trade_term})`
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. 其他信息（法律条款 + 附言） */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium">📄 其他信息</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">法律条款</div>
              <div className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap min-h-[60px]">
                {order.legal_terms || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">附言</div>
              <div className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap min-h-[60px]">
                {order.postscript || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. 备注 - 单独一个卡片 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium">📝 备注</h3>
        </div>
        <div className="p-4">
          <div className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap min-h-[60px]">
            {order.remark || '无备注'}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. 支付记录 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium flex items-center gap-2">
            <CreditCard size={18} className="text-gray-500" />
            支付记录
          </h3>
        </div>
        <div className="p-4">
          {paymentRecords ? (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${paymentRecords.isFullPaid ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {paymentRecords.isFullPaid ? '已付全款' : `${paymentRecords.percent}%`}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {paymentRecords.currency} {paymentRecords.paid.toFixed(2)} / {paymentRecords.currency} {paymentRecords.total.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      paymentRecords.isFullPaid ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(paymentRecords.percent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400">订单总金额</div>
                  <div className="font-semibold">{paymentRecords.currency} {paymentRecords.total.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">已付金额</div>
                  <div className="font-semibold text-green-600">{paymentRecords.currency} {paymentRecords.paid.toFixed(2)}</div>
                </div>
                {paymentRecords.pending > 0 && (
                  <div>
                    <div className="text-xs text-gray-400">待付金额</div>
                    <div className="font-semibold text-orange-500">{paymentRecords.currency} {paymentRecords.pending.toFixed(2)}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400">支付状态</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${paymentRecords.statusColor}`}>
                    {paymentRecords.statusText}
                  </span>
                </div>
              </div>

              {paymentRecords.paid_at && (
                <div className="mt-2 text-xs text-gray-400">
                  付款时间: {formatDate(paymentRecords.paid_at)}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-400">暂无支付记录</div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 7. 物流记录 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium flex items-center gap-2">
            <Truck size={18} className="text-gray-500" />
            物流记录
          </h3>
        </div>
        <div className="p-4">
          {order.shipping_records && order.shipping_records.length > 0 ? (
            <div className="space-y-3">
              {order.shipping_records.map((record, index) => {
                const carrierDisplayName = record.carrier_name_cn || record.carrier_name_en || record.carrier_key;
                const isLatest = index === order.shipping_records!.length - 1;
                
                return (
                  <div 
                    key={record.id || index} 
                    className={`p-3 rounded-lg border ${isLatest ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          #{index + 1}
                        </span>
                        {isLatest && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            最新
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-800">
                          {carrierDisplayName || record.carrier_key}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(record.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-gray-600 font-mono">
                        单号: {record.tracking_number || '-'}
                      </span>
                      {record.shipping_method && (
                        <span className="text-gray-500">
                          运输方式: {record.shipping_method}
                        </span>
                      )}
                    </div>
                    {record.tracking_image && (
                      <div className="mt-2">
                        <img 
                          src={record.tracking_image} 
                          alt="物流凭证"
                          className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(record.tracking_image, '_blank')}
                          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              <Clock size={16} className="inline mr-1" />
              暂无发货记录
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 8. 状态日志 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium">⏱️ 状态日志</h3>
        </div>
        <div className="p-4 max-h-[300px] overflow-y-auto">
          {order.status_logs && order.status_logs.length > 0 ? (
            <div className="space-y-2">
              {order.status_logs.map((log) => (
                <div key={log.id} className="text-sm flex items-start gap-2">
                  <span className="text-gray-400 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                  <span className="text-gray-600">
                    {log.from_status ? `${ORDER_STATUS_CONFIG[log.from_status]?.label || log.from_status} → ` : ''}
                    <span className="font-medium">{ORDER_STATUS_CONFIG[log.to_status]?.label || log.to_status}</span>
                    {log.operator && <span className="text-gray-400 ml-1">(by {log.operator})</span>}
                    {log.note && <span className="text-gray-400 ml-1">: {log.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">暂无状态日志</div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}