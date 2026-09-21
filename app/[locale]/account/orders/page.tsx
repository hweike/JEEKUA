// app/[locale]/account/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, Loader2, Package, Calendar, Truck, CreditCard, User } from 'lucide-react';
import { getCustomerProfile } from '@/lib/account';
import { orderService } from '@/lib/payment/services/order.service';
import { getCountryFlag, getCountryNameEn, getCountryNameZh } from '@/lib/countries';
import type { Order } from '@/lib/payment/types/order';

// ✅ 扩展 Order 类型，添加 items
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
    slug?: string;
  }>;
  deposit_amount?: number;
}

// ✅ 状态显示配置（保留颜色类，但使用主题变量）
const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
  draft: { labelKey: 'draft', color: 'var(--account-status-draft-text, #4b5563)', bg: 'var(--account-status-draft-bg, #f3f4f6)' },
  formal: { labelKey: 'formal', color: 'var(--account-status-formal-text, #2563eb)', bg: 'var(--account-status-formal-bg, #dbeafe)' },
  paid: { labelKey: 'paid', color: 'var(--account-status-paid-text, #16a34a)', bg: 'var(--account-status-paid-bg, #dcfce7)' },
  completed: { labelKey: 'completed', color: 'var(--account-status-completed-text, #059669)', bg: 'var(--account-status-completed-bg, #d1fae5)' },
  cancelled: { labelKey: 'cancelled', color: 'var(--account-status-cancelled-text, #6b7280)', bg: 'var(--account-status-cancelled-bg, #f3f4f6)' },
  expired: { labelKey: 'expired', color: 'var(--account-status-expired-text, #dc2626)', bg: 'var(--account-status-expired-bg, #fecaca)' },
};

function formatDate(dateStr: string): string {
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
}

function getDisplayStatus(order: OrderWithItems, t: any): { label: string; color: string; bg: string } {
  const status = order.status;
  // 已发送且正式订单但未付款 → 待付款
  if (order.sent_status === 'sent' && status === 'formal') {
    return { 
      label: t('pending'), 
      color: 'var(--account-status-pending-text, #92400e)', 
      bg: 'var(--account-status-pending-bg, #fef3c7)' 
    };
  }
  const config = STATUS_CONFIG[status];
  if (config) {
    return { label: t(config.labelKey), color: config.color, bg: config.bg };
  }
  return { 
    label: status, 
    color: 'var(--account-status-default-text, #4b5563)', 
    bg: 'var(--account-status-default-bg, #f3f4f6)' 
  };
}

function getCountryDisplay(countryCode: string) {
  if (!countryCode) return { flag: '🌍', name: '未知' };
  const flag = getCountryFlag(countryCode);
  const nameZh = getCountryNameZh(countryCode);
  const nameEn = getCountryNameEn(countryCode);
  return { flag, name: `${flag} ${nameZh} (${nameEn})` };
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// ✅ 获取产品详情链接 - 必须使用 slug
function getProductLink(item: any, locale: string): string {
  if (!item?.slug) return '#';
  return `/${locale}/product/${item.slug}`;
}

// ✅ 判断是否有有效链接（必须有 slug）
function hasValidProductLink(item: any): boolean {
  return item && !!item.slug;
}

export default function AccountOrdersPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Account.Orders');

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [user, setUser] = useState<any>(null);

  // ============================================================
  // ✅ 账户订单页专属 CSS 变量
  // ============================================================
  const pageBg = 'var(--account-content-bg, #ffffff)';
  const pageText = 'var(--account-content-text, #111827)';
  const cardBg = 'var(--account-card-bg, #ffffff)';
  const cardShadow = 'var(--account-card-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))';
  const cardRadius = 'var(--account-card-radius, 0.5rem)';
  const valueColor = 'var(--account-value-color, #111827)';
  const labelColor = 'var(--account-label-color, #6b7280)';
  const emptyText = 'var(--account-empty-text, #6b7280)';
  const borderColor = 'var(--account-divider, #e5e7eb)';
  const linkColor = 'var(--account-link-color, #2563eb)';
  const linkHover = 'var(--account-link-hover, #1d4ed8)';
  const mutedBg = 'var(--account-muted-bg, #f9fafb)';
  const primaryBtnBg = 'var(--account-primary-btn-bg, #2563eb)';
  const primaryBtnHover = 'var(--account-primary-btn-hover, #1d4ed8)';
  const primaryBtnText = 'var(--account-primary-btn-text, #ffffff)';
  const sentBg = 'var(--account-sent-bg, #f0fdf4)';
  const sentText = 'var(--account-sent-text, #16a34a)';
  const sentBorder = 'var(--account-sent-border, #bbf7d0)';
  const loadingColor = 'var(--account-loading-color, #2563eb)';

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. 获取当前用户信息
        const userData = await getCustomerProfile();
        if (!userData) {
          router.push(`/${locale}/login`);
          return;
        }
        setUser(userData);

        // 2. ✅ 使用服务层获取订单列表（含商品和 slug）
        const siteId = process.env.NEXT_PUBLIC_SITE_ID || '';
        const result = await orderService.listWithItems({
          site_id: siteId,
          buyer_email: userData.email,  // ✅ 按买家邮箱筛选
          status: ['formal', 'paid', 'completed', 'cancelled', 'expired'],
          page: 1,
          page_size: 100,
        });

        // 3. 处理订单数据
        const ordersWithItems = (result.items || []).map((order: any) => ({
          ...order,
          items: order.items || [],
        }));

        setOrders(ordersWithItems);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [locale, router]);

  // ✅ 查看详情 - 新开页面
  const handleViewOrder = (orderId: string, shareToken?: string) => {
    const path = shareToken 
      ? `/${locale}/payment/order/share/${shareToken}`
      : `/${locale}/payment/order/${orderId}`;
    window.open(path, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin" style={{ color: loadingColor }} />
        <span className="ml-3" style={{ color: labelColor }}>{t('loading')}</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        className="p-8 text-center"
        style={{
          backgroundColor: cardBg,
          boxShadow: cardShadow,
          borderRadius: cardRadius,
          color: emptyText,
        }}
      >
        <div className="text-4xl mb-3">📋</div>
        <p className="text-lg">{t('noOrders')}</p>
        <p className="text-sm mt-1">{t('noOrdersDesc')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4" style={{ color: valueColor }}>
        {t('title')}
      </h2>
      <p className="text-sm mb-6" style={{ color: labelColor }}>
        {t('totalLabel', { count: orders.length })}
      </p>

      <div className="space-y-3">
        {orders.map((order) => {
          const displayStatus = getDisplayStatus(order, t);
          const countryInfo = getCountryDisplay(order.buyer_country || '');
          const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
          const hasMultipleItems = order.items && order.items.length > 1;
          const total = order.total_amount || 0;
          const deposit = order.deposit_amount || 0;
          const hasDeposit = deposit > 0 && deposit < total;

          // ✅ 产品详情链接（使用 slug）
          const productLink = firstItem ? getProductLink(firstItem, locale) : '#';
          const hasLink = firstItem ? hasValidProductLink(firstItem) : false;

          return (
            <div
              key={order.id}
              className="border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              style={{
                backgroundColor: cardBg,
                borderColor: borderColor,
              }}
            >
              {/* 表头 */}
              <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b"
                style={{
                  backgroundColor: mutedBg,
                  borderColor: borderColor,
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono font-medium" style={{ color: valueColor }}>
                    {t('orderNo')} {order.order_no}
                  </span>
                  {order.contract_no && (
                    <span className="text-xs" style={{ color: labelColor }}>({order.contract_no})</span>
                  )}
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: displayStatus.bg, 
                      color: displayStatus.color 
                    }}
                  >
                    {displayStatus.label}
                  </span>
                  {order.sent_status === 'sent' && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: sentBg,
                        color: sentText,
                        borderColor: sentBorder,
                      }}
                    >
                      ✓ {t('sent')}
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: labelColor }}>
                  {formatDate(order.created_at)}
                </span>
              </div>

              {/* 主体 */}
              <div className="p-4">
                <div className="grid grid-cols-12 gap-3">
                  {/* 买家信息 */}
                  <div className="col-span-12 sm:col-span-2">
                    <div className="flex flex-col min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: valueColor }}>
                        {order.buyer_name || '-'}
                      </div>
                      {order.buyer_email && (
                        <div className="text-xs truncate" style={{ color: labelColor }}>
                          {order.buyer_email}
                        </div>
                      )}
                      <div className="text-xs truncate" style={{ color: labelColor }}>
                        {countryInfo.name}
                      </div>
                    </div>
                  </div>

                  {/* ✅ 产品信息 - 使用 slug 链接到产品详情页 */}
                  <div className="col-span-12 sm:col-span-4">
                    {firstItem ? (
                      <div className="flex items-start gap-3">
                        {firstItem.product_image ? (
                          hasLink ? (
                            <a
                              href={productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <img
                                src={firstItem.product_image}
                                alt={firstItem.product_name}
                                className="w-16 h-16 object-cover rounded border flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                                style={{ borderColor: borderColor }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </a>
                          ) : (
                            <img
                              src={firstItem.product_image}
                              alt={firstItem.product_name}
                              className="w-16 h-16 object-cover rounded border flex-shrink-0"
                              style={{ borderColor: borderColor }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )
                        ) : (
                          <div 
                            className="w-16 h-16 rounded border flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ 
                              backgroundColor: mutedBg, 
                              borderColor: borderColor 
                            }}
                          >
                            📦
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {hasLink ? (
                            <a
                              href={productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium line-clamp-2 break-words hover:underline cursor-pointer"
                              style={{ color: valueColor }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = linkHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = valueColor;
                              }}
                            >
                              {firstItem.product_name || t('unknownProduct')}
                            </a>
                          ) : (
                            <span className="text-sm font-medium line-clamp-2 break-words" style={{ color: valueColor }}>
                              {firstItem.product_name || t('unknownProduct')}
                            </span>
                          )}
                          {firstItem.specification && (
                            <div className="text-xs truncate" style={{ color: labelColor }}>
                              {firstItem.specification}
                            </div>
                          )}
                          {firstItem.price !== undefined && firstItem.quantity !== undefined && (
                            <div className="text-xs mt-0.5" style={{ color: labelColor }}>
                              {formatCurrency(firstItem.price, order.currency)} × {firstItem.quantity}
                            </div>
                          )}
                          {hasMultipleItems && (
                            <div className="text-xs mt-0.5" style={{ color: linkColor }}>
                              {t('plusItems', { count: order.items!.length - 1 })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: labelColor }}>{t('noProduct')}</div>
                    )}
                  </div>

                  {/* 订单金额 */}
                  <div className="col-span-6 sm:col-span-2">
                    <div className="flex flex-col">
                      <div className="font-bold text-sm" style={{ color: valueColor }}>
                        {formatCurrency(total, order.currency)}
                      </div>
                      {hasDeposit && (
                        <>
                          <div className="text-xs" style={{ color: labelColor }}>
                            {t('deposit')}: {formatCurrency(deposit, order.currency)}
                          </div>
                          <div className="text-xs" style={{ color: labelColor }}>
                            {t('balance')}: {formatCurrency(total - deposit, order.currency)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 状态 */}
                  <div className="col-span-6 sm:col-span-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: displayStatus.bg, 
                        color: displayStatus.color 
                      }}
                    >
                      {displayStatus.label}
                    </span>
                  </div>

                  {/* 操作 */}
                  <div className="col-span-12 sm:col-span-2">
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={() => handleViewOrder(order.id, order.share_token)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors w-full justify-center"
                        style={{
                          backgroundColor: primaryBtnBg,
                          color: primaryBtnText,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = primaryBtnHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = primaryBtnBg;
                        }}
                      >
                        <Eye size={16} />
                        <span>{t('viewDetail')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}