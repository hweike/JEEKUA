// app/[locale]/payment/order/share/[token]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orderService } from '@/lib/payment/services/order.service';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { Copy, Printer, Loader2, ChevronDown, ChevronUp, Shield, Check, Truck, CreditCard, Clock, ExternalLink } from 'lucide-react';
import { 
  BANK_LOGOS, 
  PRESET_LOGOS, 
  DEFAULT_LOGO,
  getBankLogo as getBankLogoFromConfig,
} from '@/lib/payment/types/logos';
import { getCountryFlag, getCountryNameEn, getCountryNameZh } from '@/lib/countries';
import { getCustomerProfile } from '@/lib/account/client';

interface ShareOrderPageProps {
  params: {
    locale: string;
    token: string;
  };
}

// ✅ 完整的订单类型
interface OrderData {
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
  sent_status?: string;
  items: Array<{
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
  created_at: string;
  payment_account_id?: string;
  selected_account_ids?: string[];
  deposit_amount?: number;
  paid_at?: string;
  tracking_number?: string;
  carrier?: string;
  carrier_name?: string;
  tracking_image?: string;
  sent_at?: string;
  shipping_records?: Array<{
    id: string;
    carrier_key: string;
    carrier_name_cn: string;
    carrier_name_en: string;
    tracking_number: string;
    tracking_image?: string;
    shipping_method: string;
    created_at: string;
  }>;
}

// ✅ 使用 lib/countries.ts 获取国家旗帜和名称
const getCountryDisplay = (countryCode: string) => {
  if (!countryCode) return { flag: '🌍', name: 'Unknown' };
  const flag = getCountryFlag(countryCode);
  const nameZh = getCountryNameZh(countryCode);
  const nameEn = getCountryNameEn(countryCode);
  return { flag, name: `${flag} ${nameZh} (${nameEn})` };
};

const getBankLogo = (account: any): string => {
  if (account.display_name_zh && BANK_LOGOS[account.display_name_zh]) {
    return BANK_LOGOS[account.display_name_zh];
  }
  return getBankLogoFromConfig(account);
};

const isDomestic = (account: any): boolean => {
  return account.account_type === 'domestic';
};

// ✅ 邮箱脱敏函数
const maskEmail = (email: string): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const domain = parts[1];
  return `****@${domain}`;
};

// ✅ 电话脱敏函数：保留前2位和后3位，中间用 **** 替换
const maskPhone = (phone: string): string => {
  if (!phone) return '';
  const clean = phone.replace(/\s/g, '');
  if (clean.length <= 7) return clean;
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-3);
  return `${prefix}****${suffix}`;
};

// ✅ 统一 Logo 渲染函数
const renderLogo = (logo: string, alt: string) => {
  if (!logo || logo === DEFAULT_LOGO) {
    const countryInfo = getCountryDisplay(alt);
    return (
      <div className="w-[100px] h-[50px] rounded-lg border bg-gray-100 flex items-center justify-center text-3xl"
        style={{
          backgroundColor: 'var(--order-share-muted-bg, #f3f4f6)',
          borderColor: 'var(--order-share-border-color, #e5e7eb)',
        }}
      >
        {countryInfo.flag}
      </div>
    );
  }
  return (
    <img 
      src={logo} 
      alt={alt}
      className="w-[100px] h-[50px] object-contain rounded-lg border bg-white p-1"
      style={{
        borderColor: 'var(--order-share-border-color, #e5e7eb)',
        backgroundColor: 'var(--order-share-card-bg, #ffffff)',
      }}
      onError={(e) => {
        (e.target as HTMLImageElement).src = DEFAULT_LOGO;
      }}
    />
  );
};

export default function ShareOrderPage({ params }: ShareOrderPageProps) {
  const { locale, token } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const [accountCopiedIndex, setAccountCopiedIndex] = useState<number | null>(null);
  const [showTrackingImage, setShowTrackingImage] = useState(false);
  
  // ✅ 权限验证状态
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ============================================================
  // ✅ 主题 CSS 变量
  // ============================================================
  // ---- 页面容器 ----
  const pageBg = 'var(--order-share-bg, #f9fafb)';
  const pageText = 'var(--order-share-text-color, #374151)';
  
  // ---- 卡片 ----
  const cardBg = 'var(--order-share-card-bg, #ffffff)';
  const cardShadow = 'var(--order-share-card-shadow, 0 10px 15px -3px rgba(0,0,0,0.1))';
  const cardRadius = 'var(--order-share-card-radius, 0.5rem)';
  
  // ---- 标题 ----
  const titleColor = 'var(--order-share-title-color, #111827)';
  const mutedColor = 'var(--order-share-muted-color, #6b7280)';
  const mutedBg = 'var(--order-share-muted-bg, #f3f4f6)';
  const borderColor = 'var(--order-share-border-color, #e5e7eb)';
  
  // ---- 按钮 ----
  const primaryBtnBg = 'var(--order-share-primary-btn-bg, #2563eb)';
  const primaryBtnHover = 'var(--order-share-primary-btn-hover, #1d4ed8)';
  const primaryBtnText = 'var(--order-share-primary-btn-text, #ffffff)';
  const secondaryBtnBg = 'var(--order-share-secondary-btn-bg, #f3f4f6)';
  const secondaryBtnHover = 'var(--order-share-secondary-btn-hover, #e5e7eb)';
  const secondaryBtnText = 'var(--order-share-secondary-btn-text, #374151)';
  
  // ---- 状态色 ----
  const successColor = 'var(--order-share-success-color, #16a34a)';
  const successBg = 'var(--order-share-success-bg, #dcfce7)';
  const successText = 'var(--order-share-success-text, #166534)';
  const warningBg = 'var(--order-share-warning-bg, #fef3c7)';
  const warningText = 'var(--order-share-warning-text, #92400e)';
  const dangerBg = 'var(--order-share-danger-bg, #fef2f2)';
  const dangerText = 'var(--order-share-danger-text, #991b1b)';
  const infoBg = 'var(--order-share-info-bg, #eff6ff)';
  const infoBorder = 'var(--order-share-info-border, #bfdbfe)';
  const infoText = 'var(--order-share-info-text, #1e40af)';
  
  // ---- 加载状态 ----
  const loadingColor = 'var(--order-share-loading-color, #2563eb)';

  // ✅ 第一步：验证用户登录和权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. 获取当前登录客户
        const userData = await getCustomerProfile();
        
        if (!userData) {
          // 未登录，跳转到登录页，登录后返回
          const redirectUrl = encodeURIComponent(`/payment/order/share/${token}`);
          router.push(`/${locale}/login?redirect=${redirectUrl}`);
          return;
        }
        
        setCurrentUser(userData);
        
        // 2. 加载订单数据
        const orderResult = await orderService.getByShareToken(token);
        if (!orderResult) {
          router.replace('/404');
          return;
        }
        
        setOrder(orderResult as OrderData);
        
        // 3. ✅ 验证邮箱是否匹配
        if (userData.email && orderResult.buyer_email) {
          if (userData.email.toLowerCase() === orderResult.buyer_email.toLowerCase()) {
            setAuthorized(true);
          } else {
            setAuthorized(false);
          }
        } else {
          setAuthorized(false);
        }
        
        // 4. ✅ 加载站点设置 - 使用正确的字段名
        try {
          const settings = await getSiteSettings();
          setSellerInfo({
            company: settings.companyName || '',
            address: settings.address || '',
            phone: settings.phone || '',
            email: settings.email || '',
          });
        } catch (settingsError) {
          console.warn('[ShareOrderPage] 获取站点设置失败:', settingsError);
          setSellerInfo({
            company: '',
            address: '',
            phone: '',
            email: '',
          });
        }

        // 5. 获取支付账户信息
        try {
          const accounts: any[] = [];
          const selectedIds = (orderResult as any).selected_account_ids || [];
          
          if (selectedIds.length > 0) {
            for (const id of selectedIds) {
              try {
                const account = await accountService.getById(orderResult.site_id, id);
                if (account) {
                  accounts.push(account);
                }
              } catch (e) {
                console.warn('获取账号失败:', id, e);
              }
            }
          } else {
            const methodMap: Record<string, string> = {
              'bank_transfer': 'tt',
              'online_payment': 'paypal',
              'qr_code': 'wechat'
            };
            const method = methodMap[orderResult.payment_method] || 'tt';
            const accountList = await accountService.list(orderResult.site_id, {
              method: method
            });
            if (accountList && accountList.length > 0) {
              const defaultAccount = accountList.find(a => a.is_default) || accountList[0];
              accounts.push(defaultAccount);
            }
          }
          
          setPaymentAccounts(accounts);
        } catch (accError) {
          console.warn('获取支付账户失败:', accError);
        }
        
      } catch (error) {
        console.error('[ShareOrderPage] 加载失败:', error);
        router.replace('/404');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [token, router, locale]);

  // ✅ 复制订单信息（含脱敏）
  const handleCopy = async () => {
    if (!order) return;
    const copyText = generateOrderCopyText(order);
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePayNow = () => {
    setShowPaymentDetail(!showPaymentDetail);
  };

  const handleCopyAccount = async (account: any, index: number) => {
    const copyText = generateAccountCopyText(account, locale);
    try {
      await navigator.clipboard.writeText(copyText);
      setAccountCopiedIndex(index);
      setTimeout(() => setAccountCopiedIndex(null), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: pageBg }}
      >
        <Loader2 size={32} className="animate-spin"
          style={{ color: loadingColor }}
        />
        <span className="ml-3"
          style={{ color: mutedColor }}
        >
          加载中...
        </span>
      </div>
    );
  }

  // ✅ 无权限访问
  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: pageBg }}
      >
        <div className="rounded-lg shadow-lg p-8 max-w-md w-full text-center"
          style={{
            backgroundColor: cardBg,
            boxShadow: cardShadow,
            borderRadius: cardRadius,
          }}
        >
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2"
            style={{ color: titleColor }}
          >
            无权限访问
          </h2>
          <p className="mb-4"
            style={{ color: pageText }}
          >
            您没有权限查看此订单。该订单属于 <strong>{order?.buyer_email || '其他用户'}</strong>，请使用正确的账户登录。
          </p>
          <button
            onClick={() => router.push(`/${locale}/account`)}
            className="px-6 py-2 rounded-lg transition-colors"
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
            返回我的账户
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  // ============================================================
  // ✅ 支持的语言列表
  // ============================================================
  const SUPPORTED_LOCALES = ['zh', 'en'];
  // ✅ 如果当前语言不在支持列表中，默认使用英文
  const lang = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';

  // ============================================================
  // ✅ 语言映射
  // ============================================================
  const t = {
    zh: {
      title: '订单详情',
      contract_no: '合同号',
      seller: '卖家信息',
      buyer: '买家信息',
      name: '名称',
      company: '公司',
      email: '邮箱',
      phone: '电话',
      address: '地址',
      country: '国家/地区',
      items: '商品清单',
      product_name: '商品名称',
      specification: '规格',
      quantity: '数量',
      unit: '单位',
      price: '单价',
      total: '小计',
      sub_total: '商品总金额',
      discount: '折扣',
      shipping_fee: '运费',
      tax: '税费',
      total_amount: '账单总金额',
      payment_method: '支付方式',
      status: '订单状态',
      created_at: '创建时间',
      expiry_date: '截止时间',
      note: '备注',
      copy: '复制',
      copied: '已复制',
      print: '打印',
      pay_now: '支付账单',
      shipping_info: '运输信息',
      shipping_method: '运输方式',
      shipping_date: '发货日期',
      trade_term: '贸易术语',
      legal_terms: 'Terms & Conditions',
      postscript: '附言',
      footer: '此订单由 {{site_name}} 提供',
      deposit_shipping: '预付款到账后{{days}}个自然日内发货',
      balance_shipping: '尾款到账后{{days}}个自然日内发货',
      fixed_shipping: '{{date}}发货',
      payment_detail: '支付详情',
      account_info: '收款账户信息',
      beneficiary_name: '收款人名称',
      account_number: '收款账号',
      swift_code: 'SWIFT代码',
      bank: '收款银行',
      bank_address: '银行地址',
      country_region: '国家/地区',
      pay_via: '用电汇转账支付',
      save_as_image: '保存为图片',
      default: '默认',
      currency: '支持货币',
      all_currencies: '全部',
      beneficiary_address: '收款人地址',
      bank_code: '银行代码',
      branch_code: '分行代码',
      iban: 'IBAN',
      attention: '注意事项',
      intermediary_bank: '中间行',
      copy_account: '复制账户信息',
      payment_records: '支付记录',
      total_amount_label: '订单总金额',
      paid_amount: '已付金额',
      pending_amount: '待付金额',
      payment_status: '支付状态',
      unpaid: '未支付',
      partial_paid: '部分支付',
      fully_paid: '已付全款',
      logistics_records: '物流记录',
      logistics_status: '物流状态',
      tracking_number_label: '物流单号',
      carrier_label: '承运商',
      shipped_at: '发货时间',
      not_shipped: '未发货',
      shipped: '已发货',
      view_tracking: '查看物流凭证',
      shipping_record: '发货记录',
      shipping_records: '发货记录',
      no_shipping_records: '暂无发货记录',
      unauthorized_title: '无权限访问',
      unauthorized_desc: '您没有权限查看此订单。该订单属于 {{email}}，请使用正确的账户登录。',
      go_to_account: '返回我的账户',
      payment_time: '付款时间',
      amount_summary: '金额汇总',
      shipping_record_latest: '最新',
      shipping_record_tracking: '单号',
      shipping_record_method: '运输方式',
      shipping_record_no_records: '暂无发货记录',
      secure_payment: '安全支付',
      fully_paid_badge: '已付全款',
      no_payment_needed: '无需支付',
      paid_in_full: '已付清',
    },
    en: {
      title: 'Order Details',
      contract_no: 'Contract No.',
      seller: 'Seller Information',
      buyer: 'Buyer Information',
      name: 'Name',
      company: 'Company',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      country: 'Country/Region',
      items: 'Order Items',
      product_name: 'Product Name',
      specification: 'Specification',
      quantity: 'Quantity',
      unit: 'Unit',
      price: 'Unit Price',
      total: 'Subtotal',
      sub_total: 'Sub Total',
      discount: 'Discount',
      shipping_fee: 'Shipping Fee',
      tax: 'Tax',
      total_amount: 'Total Amount',
      payment_method: 'Payment Method',
      status: 'Status',
      created_at: 'Created At',
      expiry_date: 'Expiry Date',
      note: 'Note',
      copy: 'Copy',
      copied: 'Copied!',
      print: 'Print',
      pay_now: 'Pay Now',
      shipping_info: 'Shipping Information',
      shipping_method: 'Shipping Method',
      shipping_date: 'Shipping Date',
      trade_term: 'Trade Term',
      legal_terms: 'Terms & Conditions',
      postscript: 'Remarks',
      footer: 'This order is provided by {{site_name}}',
      deposit_shipping: 'Ship within {{days}} days after deposit received',
      balance_shipping: 'Ship within {{days}} days after balance received',
      fixed_shipping: 'Ship on {{date}}',
      payment_detail: 'Payment Details',
      account_info: 'Payment Account Information',
      beneficiary_name: 'Beneficiary Name',
      account_number: 'Account Number',
      swift_code: 'SWIFT Code',
      bank: 'Beneficiary Bank',
      bank_address: 'Bank Address',
      country_region: 'Country/Region',
      pay_via: 'Pay via Bank Transfer',
      save_as_image: 'Save as Image',
      default: 'Default',
      currency: 'Supported Currencies',
      all_currencies: 'All',
      beneficiary_address: 'Beneficiary Address',
      bank_code: 'Bank Code',
      branch_code: 'Branch Code',
      iban: 'IBAN',
      attention: 'Attention',
      intermediary_bank: 'Intermediary Bank',
      copy_account: 'Copy Account Info',
      payment_records: 'Payment Records',
      total_amount_label: 'Total Amount',
      paid_amount: 'Paid Amount',
      pending_amount: 'Pending Amount',
      payment_status: 'Payment Status',
      unpaid: 'Unpaid',
      partial_paid: 'Partial Paid',
      fully_paid: 'Fully Paid',
      logistics_records: 'Logistics Records',
      logistics_status: 'Logistics Status',
      tracking_number_label: 'Tracking Number',
      carrier_label: 'Carrier',
      shipped_at: 'Shipped At',
      not_shipped: 'Not Shipped',
      shipped: 'Shipped',
      view_tracking: 'View Tracking Image',
      shipping_record: 'Shipping Record',
      shipping_records: 'Shipping Records',
      no_shipping_records: 'No Shipping Records',
      unauthorized_title: 'Unauthorized Access',
      unauthorized_desc: 'You do not have permission to view this order. This order belongs to {{email}}. Please log in with the correct account.',
      go_to_account: 'Go to My Account',
      payment_time: 'Payment Time',
      amount_summary: 'Amount Summary',
      shipping_record_latest: 'Latest',
      shipping_record_tracking: 'Tracking No.',
      shipping_record_method: 'Shipping Method',
      shipping_record_no_records: 'No Shipping Records',
      secure_payment: 'Secure Payment',
      fully_paid_badge: 'Fully Paid',
      no_payment_needed: 'No Payment Needed',
      paid_in_full: 'Paid in Full',
    },
  };

  const text = t[lang];
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '';

  // ✅ 状态映射
  const statusMap: Record<string, Record<string, string>> = {
    zh: {
      draft: '草稿',
      formal: '正式订单',
      paid: '已付款',
      completed: '已完成',
      cancelled: '已取消',
    },
    en: {
      draft: 'Draft',
      formal: 'Formal Order',
      paid: 'Paid',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  };

  const sentStatusMap: Record<string, Record<string, string>> = {
    zh: {
      sent: '已发送',
      unsent: '未发送',
    },
    en: {
      sent: 'Sent',
      unsent: 'Unsent',
    },
  };

  const paymentMethodMap: Record<string, Record<string, string>> = {
    zh: {
      bank_transfer: 'T/T银行转账',
      qr_code: '扫码支付',
      online_payment: '在线支付',
    },
    en: {
      bank_transfer: 'Bank Transfer',
      qr_code: 'QR Code',
      online_payment: 'Online Payment',
    },
  };

  // ✅ 运输方式映射
  const shippingMethodMap: Record<string, Record<string, string>> = {
    zh: {
      '快递': '快递',
      '多式联运': '多式联运',
      '海运': '海运',
      '空运': '空运',
      '陆运': '陆运',
      '邮政': '邮政',
    },
    en: {
      '快递': 'Express',
      '多式联运': 'Intermodal',
      '海运': 'Sea Freight',
      '空运': 'Air Freight',
      '陆运': 'Land Transport',
      '邮政': 'Postal',
    },
  };

  // ✅ 贸易术语映射
  const tradeTermMap: Record<string, Record<string, string>> = {
    zh: {
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
    },
    en: {
      'EXW': 'Ex Works',
      'FCA': 'Free Carrier',
      'FAS': 'Free Alongside Ship',
      'FOB': 'Free On Board',
      'CFR': 'Cost and Freight',
      'CIF': 'Cost Insurance and Freight',
      'CPT': 'Carriage Paid To',
      'CIP': 'Carriage and Insurance Paid To',
      'DAT': 'Delivered At Terminal',
      'DAP': 'Delivered At Place',
      'DDP': 'Delivered Duty Paid',
    },
  };

  const statusLabel = statusMap[lang][order.status] || order.status;
  const sentStatusLabel = order.sent_status ? sentStatusMap[lang][order.sent_status] || order.sent_status : '';
  const paymentMethodLabel = paymentMethodMap[lang][order.payment_method] || order.payment_method;
  
  const shippingMethodDisplay = order.shipping_method 
    ? (shippingMethodMap[lang][order.shipping_method] || order.shipping_method)
    : '-';
  
  const tradeTermDisplay = order.trade_term 
    ? (tradeTermMap[lang][order.trade_term] || order.trade_term)
    : '-';

  // 获取发货日期显示
  const getShippingDateDisplay = () => {
    if (!order.shipping_date_type) return '-';
    if (order.shipping_date_type === 'deposit') {
      return text.deposit_shipping.replace('{{days}}', String(order.shipping_days || 10));
    }
    if (order.shipping_date_type === 'balance') {
      return text.balance_shipping.replace('{{days}}', String(order.shipping_days || 10));
    }
    if (order.shipping_date_type === 'fixed' && order.shipping_date) {
      return text.fixed_shipping.replace('{{date}}', new Date(order.shipping_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN'));
    }
    return '-';
  };

  // ============================================================
  // ✅ 支付记录数据
  // ============================================================
  const getPaymentRecords = () => {
    const total = order.total_amount || 0;
    const deposit = order.deposit_amount || 0;
    const paid = deposit;
    const pending = total - paid;

    let paymentStatus = 'unpaid';
    let statusText = text.unpaid;
    let statusColor = 'text-gray-600';
    let statusBg = 'bg-gray-100';
    let isFullPaid = false;

    if (paid >= total && total > 0) {
      paymentStatus = 'fully_paid';
      statusText = text.fully_paid;
      statusColor = successText;
      statusBg = successBg;
      isFullPaid = true;
    } else if (paid > 0 && paid < total) {
      paymentStatus = 'partial_paid';
      statusText = text.partial_paid;
      statusColor = warningText;
      statusBg = warningBg;
    }

    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

    return {
      total,
      paid,
      pending,
      status: paymentStatus,
      statusText,
      statusColor,
      statusBg,
      isFullPaid,
      percent,
      currency: order.currency || 'USD',
      paid_at: order.paid_at,
      deposit,
    };
  };

  const paymentRecords = getPaymentRecords();

  // ============================================================
  // ✅ 物流记录 - 支持多条记录
  // ============================================================
  const getLogisticsRecords = () => {
    const shippingRecords = order.shipping_records || [];
    
    if (shippingRecords.length > 0) {
      return {
        records: shippingRecords,
        hasRecords: true,
        isShipped: true,
        latest: shippingRecords[shippingRecords.length - 1],
      };
    }
    
    const hasTracking = order.tracking_number || order.carrier || order.carrier_name;
    if (hasTracking) {
      const legacyRecord = {
        id: 'legacy',
        carrier_key: order.carrier || '',
        carrier_name_cn: order.carrier_name || order.carrier || '',
        carrier_name_en: order.carrier_name || '',
        tracking_number: order.tracking_number || '',
        tracking_image: order.tracking_image || '',
        shipping_method: order.shipping_method || '',
        created_at: order.sent_at || order.shipping_date || order.created_at,
      };
      return {
        records: [legacyRecord],
        hasRecords: true,
        isShipped: true,
        latest: legacyRecord,
      };
    }
    
    return {
      records: [],
      hasRecords: false,
      isShipped: false,
      latest: null,
    };
  };

  const logisticsData = getLogisticsRecords();

  // ✅ 格式化日期（用于物流记录）
  const formatLogisticsDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', {
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

  // ✅ 生成账户复制文本
  function generateAccountCopyText(account: any, locale: string): string {
    const isEn = lang === 'en';
    const labels = {
      zh: {
        beneficiary_name: '收款人名称',
        account_number: '收款账号',
        country_region: '国家/地区',
        swift_code: 'SWIFT代码',
        beneficiary_address: '收款人地址',
        bank: '收款银行',
        bank_address: '银行地址',
        bank_code: '银行代码',
        branch_code: '分行代码',
        iban: 'IBAN',
        currency: '支持货币',
        intermediary_bank: '中间行',
        attention: '注意事项',
      },
      en: {
        beneficiary_name: 'Beneficiary Name',
        account_number: 'Account Number',
        country_region: 'Country/Region',
        swift_code: 'SWIFT Code',
        beneficiary_address: 'Beneficiary Address',
        bank: 'Beneficiary Bank',
        bank_address: 'Bank Address',
        bank_code: 'Bank Code',
        branch_code: 'Branch Code',
        iban: 'IBAN',
        currency: 'Supported Currencies',
        intermediary_bank: 'Intermediary Bank',
        attention: 'Attention',
      },
    };

    const l = isEn ? labels.en : labels.zh;
    const isDomesticAccount = isDomestic(account);
    const currencyDisplay = Array.isArray(account.currency) 
      ? account.currency.join(', ') 
      : account.currency || 'All';
    const displayName = account.display_name_en || account.display_name_zh || 'Account';

    let text = `=== ${displayName} ===\n\n`;
    text += `${l.beneficiary_name}: ${account.beneficiary_name || '-'}\n`;
    text += `${l.account_number}: ${account.beneficiary_account || '-'}\n`;
    text += `${l.country_region}: ${account.country_region || '-'}\n`;
    if (!isDomesticAccount && account.swift_code) {
      text += `${l.swift_code}: ${account.swift_code}\n`;
    }
    if (!isDomesticAccount && account.beneficiary_address) {
      text += `${l.beneficiary_address}: ${account.beneficiary_address}\n`;
    }
    text += `${l.bank}: ${account.beneficiary_bank || '-'}\n`;
    if (account.beneficiary_bank_address) {
      text += `${l.bank_address}: ${account.beneficiary_bank_address}\n`;
    }
    if (account.bank_code) {
      text += `${l.bank_code}: ${account.bank_code}\n`;
    }
    if (account.branch_code) {
      text += `${l.branch_code}: ${account.branch_code}\n`;
    }
    if (!isDomesticAccount && account.iban) {
      text += `${l.iban}: ${account.iban}\n`;
    }
    text += `${l.currency}: ${currencyDisplay}\n`;
    if (account.intermediary_bank) {
      text += `${l.intermediary_bank}: ${account.intermediary_bank}\n`;
    }
    if (account.attention) {
      text += `\n${l.attention}: ${account.attention}\n`;
    }
    return text;
  }

  // ✅ 生成产品详情链接 - 必须使用 slug
  const getProductLink = (item: any) => {
    if (!item?.slug) return '#';
    return `/${locale}/product/${item.slug}`;
  };

  // ✅ 判断是否有有效链接（必须有 slug）
  const hasValidProductLink = (item: any) => {
    return item && !!item.slug;
  };

  // ✅ 生成订单复制文本（含脱敏）
  function generateOrderCopyText(order: OrderData): string {
    let text = `=== 合同号: ${order.contract_no || order.order_no} ===\n\n`;
    text += `买家: ${order.buyer_name}\n`;
    if (order.buyer_company) text += `公司: ${order.buyer_company}\n`;
    text += `邮箱: ${maskEmail(order.buyer_email)}\n`;
    if (order.buyer_phone) text += `电话: ${maskPhone(order.buyer_phone)}\n`;
    text += `\n--- 商品清单 ---\n`;
    
    order.items.forEach((item: any, index: number) => {
      text += `${index + 1}. ${item.product_name}`;
      if (item.specification) text += ` (${item.specification})`;
      text += ` x${item.quantity}${item.unit || 'pcs'} = ${order.currency} ${item.total.toFixed(2)}\n`;
    });
    
    text += `\n--- 金额汇总 ---\n`;
    text += `商品总金额: ${order.currency} ${order.sub_total.toFixed(2)}\n`;
    if (order.discount > 0) text += `折扣: -${order.currency} ${order.discount.toFixed(2)}\n`;
    if (order.shipping_fee > 0) text += `运费: ${order.currency} ${order.shipping_fee.toFixed(2)}\n`;
    if (order.tax > 0) text += `税费: ${order.currency} ${order.tax.toFixed(2)}\n`;
    text += `账单总金额: ${order.currency} ${order.total_amount.toFixed(2)}\n`;
    
    return text;
  }

  // ============================================================
  // ✅ 动态样式辅助函数
  // ============================================================
  const getStatusColor = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
      formal: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    };
    return map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  };

  return (
    <div className="min-h-screen py-6 print:py-0 print:bg-white"
      style={{
        backgroundColor: pageBg,
        color: pageText,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 print:px-0">
        <div className="rounded-lg shadow-lg p-6 md:p-8 print:shadow-none print:p-4"
          style={{
            backgroundColor: cardBg,
            boxShadow: cardShadow,
            borderRadius: cardRadius,
          }}
        >
          {/* 头部 */}
          <div className="flex justify-between items-start mb-6 print:hidden">
            <div>
              <h1 className="text-2xl font-bold"
                style={{ color: titleColor }}
              >
                {text.title}
              </h1>
              <p className="text-sm mt-1"
                style={{ color: mutedColor }}
              >
                {text.contract_no}: {order.contract_no || order.order_no}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-sm"
                style={{
                  backgroundColor: secondaryBtnBg,
                  color: secondaryBtnText,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = secondaryBtnHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = secondaryBtnBg;
                }}
              >
                {copied ? '✅' : '📋'} {copied ? text.copied : text.copy}
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-sm"
                style={{
                  backgroundColor: secondaryBtnBg,
                  color: secondaryBtnText,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = secondaryBtnHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = secondaryBtnBg;
                }}
              >
                🖨️ {text.print}
              </button>
            </div>
          </div>

          {/* 头部 - 打印时显示 */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold" style={{ color: titleColor }}>{text.title}</h1>
            <p className="text-sm" style={{ color: mutedColor }}>{text.contract_no}: {order.contract_no || order.order_no}</p>
          </div>

          {/* ✅ 卖家信息 */}
          <div className="border rounded-lg p-4 mb-4 print:border-gray-300 print:p-3"
            style={{ borderColor: borderColor }}
          >
            <h3 className="font-semibold mb-3" style={{ color: titleColor }}>{text.seller}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="md:col-span-2">
                <span className="text-gray-500">{text.company}:</span>
                <span className="ml-1 font-medium" style={{ color: pageText }}>{sellerInfo?.company || '-'}</span>
              </div>
              {sellerInfo?.address && (
                <div className="md:col-span-2">
                  <span className="text-gray-500">{text.address}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{sellerInfo.address}</span>
                </div>
              )}
              {sellerInfo?.phone && (
                <div>
                  <span className="text-gray-500">{text.phone}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{sellerInfo.phone}</span>
                </div>
              )}
              {sellerInfo?.email && (
                <div>
                  <span className="text-gray-500">{text.email}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{sellerInfo.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ 买家信息 */}
          <div className="border rounded-lg p-4 mb-4 print:border-gray-300 print:p-3"
            style={{ borderColor: borderColor }}
          >
            <h3 className="font-semibold mb-3" style={{ color: titleColor }}>{text.buyer}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">{text.name}:</span>
                <span className="ml-1 font-medium" style={{ color: pageText }}>{order.buyer_name}</span>
              </div>
              {order.buyer_company && (
                <div>
                  <span className="text-gray-500">{text.company}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{order.buyer_company}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">{text.email}:</span>
                <span className="ml-1" style={{ color: pageText }}>{maskEmail(order.buyer_email)}</span>
              </div>
              {order.buyer_phone && (
                <div>
                  <span className="text-gray-500">{text.phone}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{maskPhone(order.buyer_phone)}</span>
                </div>
              )}
              {order.buyer_country && (
                <div>
                  <span className="text-gray-500">{text.country}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{order.buyer_country}</span>
                </div>
              )}
              {order.buyer_address && (
                <div className="md:col-span-2">
                  <span className="text-gray-500">{text.address}:</span>
                  <span className="ml-1" style={{ color: pageText }}>{order.buyer_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ 商品清单 */}
          <div className="mb-4">
            <h3 className="font-semibold mb-3" style={{ color: titleColor }}>{text.items}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="print:bg-gray-100"
                    style={{ backgroundColor: mutedBg }}
                  >
                    <th className="px-3 py-2 text-left w-[50%]" style={{ color: pageText }}>{text.product_name}</th>
                    <th className="px-3 py-2 text-left w-[15%]" style={{ color: pageText }}>{text.specification}</th>
                    <th className="px-3 py-2 text-center w-[15%]" style={{ color: pageText }}>{text.quantity}</th>
                    <th className="px-3 py-2 text-right w-[10%]" style={{ color: pageText }}>{text.price}</th>
                    <th className="px-3 py-2 text-right w-[10%]" style={{ color: pageText }}>{text.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: borderColor }}>
                  {order.items.map((item: any) => {
                    const productLink = getProductLink(item);
                    const hasLink = hasValidProductLink(item);
                    
                    return (
                      <tr key={item.id} style={{ borderColor: borderColor }}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.product_image && (
                              hasLink ? (
                                <a 
                                  href={productLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0"
                                >
                                  <img 
                                    src={item.product_image} 
                                    alt={item.product_name}
                                    className="w-8 h-8 object-cover rounded border flex-shrink-0 hover:opacity-80 transition-opacity"
                                    style={{ borderColor: borderColor }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </a>
                              ) : (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name}
                                  className="w-8 h-8 object-cover rounded border flex-shrink-0"
                                  style={{ borderColor: borderColor }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )
                            )}
                            {hasLink ? (
                              <a 
                                href={productLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline"
                                style={{ color: titleColor }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = primaryBtnBg;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = titleColor;
                                }}
                              >
                                {item.product_name}
                              </a>
                            ) : (
                              <span className="font-medium" style={{ color: pageText }}>{item.product_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2" style={{ color: mutedColor }}>{item.specification || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <div>
                            <div style={{ color: pageText }}>{item.quantity}</div>
                            <div className="text-xs" style={{ color: mutedColor }}>{item.unit || 'pcs'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: pageText }}>
                          {order.currency} {item.price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: pageText }}>
                          {order.currency} {item.total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 金额汇总 + 运输信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border rounded-lg p-4 print:border-gray-300 print:p-3"
              style={{ borderColor: borderColor }}
            >
              <h4 className="font-semibold mb-2" style={{ color: titleColor }}>{text.amount_summary}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{text.sub_total}</span>
                  <span className="font-mono" style={{ color: pageText }}>{order.currency} {order.sub_total.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between" style={{ color: successColor }}>
                    <span>{text.discount}</span>
                    <span className="font-mono">-{order.currency} {order.discount.toFixed(2)}</span>
                  </div>
                )}
                {order.shipping_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{text.shipping_fee}</span>
                    <span className="font-mono" style={{ color: pageText }}>{order.currency} {order.shipping_fee.toFixed(2)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{text.tax}</span>
                    <span className="font-mono" style={{ color: pageText }}>{order.currency} {order.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-lg"
                  style={{ borderColor: borderColor }}
                >
                  <span style={{ color: titleColor }}>{text.total_amount}</span>
                  <span className="font-mono" style={{ color: primaryBtnBg }}>{order.currency} {order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 print:border-gray-300 print:p-3"
              style={{ borderColor: borderColor }}
            >
              <h4 className="font-semibold mb-2" style={{ color: titleColor }}>{text.shipping_info}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{text.shipping_method}:</span>
                  <span style={{ color: pageText }}>{shippingMethodDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{text.shipping_date}:</span>
                  <span style={{ color: pageText }}>{getShippingDateDisplay()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{text.trade_term}:</span>
                  <span style={{ color: pageText }}>{tradeTermDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 法律条款 */}
          {order.legal_terms && (
            <div className="border rounded-lg p-4 mb-3 print:border-gray-300 print:p-3"
              style={{ borderColor: borderColor }}
            >
              <h4 className="font-semibold mb-1" style={{ color: titleColor }}>{text.legal_terms}</h4>
              <p className="text-sm whitespace-pre-wrap" style={{ color: pageText }}>{order.legal_terms}</p>
            </div>
          )}

          {/* 附言 */}
          {order.postscript && (
            <div className="border rounded-lg p-4 mb-3 print:border-gray-300 print:p-3"
              style={{ borderColor: borderColor }}
            >
              <h4 className="font-semibold mb-1" style={{ color: titleColor }}>{text.postscript}</h4>
              <p className="text-sm whitespace-pre-wrap" style={{ color: pageText }}>{order.postscript}</p>
            </div>
          )}

          {/* ============================================================ */}
          {/* ✅ 支付账单卡片 */}
          {/* ============================================================ */}
          {order.sent_status === 'sent' && (
            <div className="mt-6 border-t pt-6 print:hidden"
              style={{ borderColor: borderColor }}
            >
              <div className="rounded-lg p-4"
                style={{
                  backgroundColor: infoBg,
                  borderColor: infoBorder,
                  borderWidth: 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold" style={{ color: infoText }}>
                      {order.currency} {paymentRecords.pending.toFixed(2)}
                    </div>
                    <div className="text-sm" style={{ color: mutedColor }}>
                      <Shield size={16} className="inline mr-1" style={{ color: successColor }} />
                      {text.secure_payment}
                    </div>
                    {paymentAccounts.length > 1 && (
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: infoBg,
                          color: infoText,
                        }}
                      >
                        {paymentAccounts.length} 种支付方式
                      </span>
                    )}
                    {paymentRecords.isFullPaid && (
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: successBg,
                          color: successText,
                        }}
                      >
                        ✅ {text.fully_paid_badge}
                      </span>
                    )}
                    {paymentRecords.pending <= 0 && (
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: successBg,
                          color: successText,
                        }}
                      >
                        ✅ {text.no_payment_needed}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handlePayNow}
                    disabled={paymentRecords.pending <= 0}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                      paymentRecords.pending > 0
                        ? 'text-white'
                        : 'cursor-not-allowed'
                    }`}
                    style={{
                      backgroundColor: paymentRecords.pending > 0 ? primaryBtnBg : mutedBg,
                      color: paymentRecords.pending > 0 ? primaryBtnText : mutedColor,
                    }}
                    onMouseEnter={(e) => {
                      if (paymentRecords.pending > 0) {
                        e.currentTarget.style.backgroundColor = primaryBtnHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (paymentRecords.pending > 0) {
                        e.currentTarget.style.backgroundColor = primaryBtnBg;
                      }
                    }}
                  >
                    {paymentRecords.pending > 0 ? text.pay_now : text.paid_in_full}
                    {paymentRecords.pending > 0 && (
                      showPaymentDetail ? <ChevronUp size={18} /> : <ChevronDown size={18} />
                    )}
                  </button>
                </div>

                {/* 支付详情 */}
                {showPaymentDetail && paymentAccounts.length > 0 && (
                  <div className="mt-4 pt-4 border-t"
                    style={{ borderColor: infoBorder }}
                  >
                    <h4 className="font-semibold mb-3" style={{ color: titleColor }}>{text.payment_detail}</h4>
                    
                    <div className="space-y-4">
                      {paymentAccounts.map((account, index) => {
                        const isCopied = accountCopiedIndex === index;
                        const displayName = account.display_name_en || account.display_name_zh || 'Account';
                        const logo = getBankLogo(account);
                        const currencyDisplay = Array.isArray(account.currency) 
                          ? account.currency.join(', ') 
                          : account.currency || text.all_currencies;
                        
                        return (
                          <div key={account.id} className="rounded-lg border overflow-hidden"
                            style={{
                              backgroundColor: cardBg,
                              borderColor: borderColor,
                            }}
                          >
                            <div className="flex items-center justify-between p-4 border-b"
                              style={{ borderColor: borderColor }}
                            >
                              <div className="flex items-center gap-3">
                                {paymentAccounts.length > 1 && (
                                  <span className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                      backgroundColor: mutedBg,
                                      color: mutedColor,
                                    }}
                                  >
                                    #{index + 1}
                                  </span>
                                )}
                                {renderLogo(logo, displayName)}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold" style={{ color: titleColor }}>{displayName}</span>
                                    <span className="text-xs px-2 py-0.5 rounded"
                                      style={{
                                        backgroundColor: mutedBg,
                                        color: mutedColor,
                                      }}
                                    >
                                      {paymentMethodLabel}
                                    </span>
                                    {account.is_default && (
                                      <span className="text-xs px-2 py-0.5 rounded"
                                        style={{
                                          backgroundColor: infoBg,
                                          color: infoText,
                                        }}
                                      >
                                        {text.default}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs mt-0.5" style={{ color: mutedColor }}>
                                    {text.currency}: {currencyDisplay}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCopyAccount(account, index)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all flex-shrink-0 ${
                                  isCopied 
                                    ? 'border border-green-300' 
                                    : 'border border-transparent'
                                }`}
                                style={{
                                  backgroundColor: isCopied ? successBg : secondaryBtnBg,
                                  color: isCopied ? successText : secondaryBtnText,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isCopied) {
                                    e.currentTarget.style.backgroundColor = secondaryBtnHover;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isCopied) {
                                    e.currentTarget.style.backgroundColor = secondaryBtnBg;
                                  }
                                }}
                              >
                                {isCopied ? (
                                  <>
                                    <Check size={16} />
                                    <span>{text.copied}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={16} />
                                    <span>{text.copy_account}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="p-4" style={{ backgroundColor: mutedBg }}>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs" style={{ color: mutedColor }}>{text.beneficiary_name}</div>
                                  <div className="font-medium" style={{ color: pageText }}>{account.beneficiary_name || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs" style={{ color: mutedColor }}>{text.account_number}</div>
                                  <div className="font-medium font-mono font-bold select-all text-base"
                                    style={{ color: infoText }}
                                  >
                                    {account.beneficiary_account || '-'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs" style={{ color: mutedColor }}>{text.country_region}</div>
                                  <div className="font-medium" style={{ color: pageText }}>{account.country_region || '-'}</div>
                                </div>
                                {!isDomestic(account) && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.swift_code}</div>
                                    <div className="font-medium font-mono" style={{ color: pageText }}>{account.swift_code || '-'}</div>
                                  </div>
                                )}
                                {!isDomestic(account) && account.beneficiary_address && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.beneficiary_address}</div>
                                    <div className="font-medium" style={{ color: pageText }}>{account.beneficiary_address}</div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs" style={{ color: mutedColor }}>{text.bank}</div>
                                  <div className="font-medium" style={{ color: pageText }}>{account.beneficiary_bank || '-'}</div>
                                </div>
                                {account.beneficiary_bank_address && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.bank_address}</div>
                                    <div className="font-medium" style={{ color: pageText }}>{account.beneficiary_bank_address}</div>
                                  </div>
                                )}
                                {account.bank_code && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.bank_code}</div>
                                    <div className="font-medium" style={{ color: pageText }}>{account.bank_code}</div>
                                  </div>
                                )}
                                {account.branch_code && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.branch_code}</div>
                                    <div className="font-medium" style={{ color: pageText }}>{account.branch_code}</div>
                                  </div>
                                )}
                                {!isDomestic(account) && account.iban && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.iban}</div>
                                    <div className="font-medium font-mono" style={{ color: pageText }}>{account.iban}</div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs" style={{ color: mutedColor }}>{text.currency}</div>
                                  <div className="font-medium" style={{ color: pageText }}>{currencyDisplay}</div>
                                </div>
                                {account.intermediary_bank && (
                                  <div>
                                    <div className="text-xs" style={{ color: mutedColor }}>{text.intermediary_bank}</div>
                                    <div className="font-medium" style={{ color: pageText }}>{account.intermediary_bank}</div>
                                  </div>
                                )}
                                {account.attention && (
                                  <div>
                                    <div className="text-xs font-medium" style={{ color: warningText }}>⚠️ {text.attention}</div>
                                    <div className="text-sm whitespace-pre-wrap" style={{ color: warningText }}>{account.attention}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ✅ 支付记录 */}
          {/* ============================================================ */}
          <div className="mt-4 border rounded-lg p-4 print:border-gray-300 print:p-3"
            style={{ borderColor: borderColor }}
          >
            <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: titleColor }}>
              <CreditCard size={18} style={{ color: mutedColor }} />
              {text.payment_records}
            </h4>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${paymentRecords.isFullPaid ? 'text-emerald-600' : ''}`}
                  style={{ color: paymentRecords.isFullPaid ? successText : pageText }}
                >
                  {paymentRecords.isFullPaid ? text.fully_paid : `${paymentRecords.percent}%`}
                </span>
                <span className="text-sm font-medium" style={{ color: pageText }}>
                  {paymentRecords.currency} {paymentRecords.paid.toFixed(2)} / {paymentRecords.currency} {paymentRecords.total.toFixed(2)}
                </span>
              </div>
              <div className="w-full rounded-full h-2.5" style={{ backgroundColor: mutedBg }}>
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${paymentRecords.isFullPaid ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{
                    width: `${Math.min(paymentRecords.percent, 100)}%`,
                    backgroundColor: paymentRecords.isFullPaid ? successColor : primaryBtnBg,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.total_amount_label}</div>
                <div className="font-semibold" style={{ color: pageText }}>{paymentRecords.currency} {paymentRecords.total.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.paid_amount}</div>
                <div className="font-semibold" style={{ color: successColor }}>{paymentRecords.currency} {paymentRecords.paid.toFixed(2)}</div>
              </div>
              {paymentRecords.pending > 0 && (
                <div>
                  <div className="text-xs" style={{ color: mutedColor }}>{text.pending_amount}</div>
                  <div className="font-semibold" style={{ color: warningText }}>{paymentRecords.currency} {paymentRecords.pending.toFixed(2)}</div>
                </div>
              )}
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.payment_status}</div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${paymentRecords.statusBg}`}
                  style={{ color: paymentRecords.statusColor }}
                >
                  {paymentRecords.statusText}
                </span>
              </div>
            </div>

            {paymentRecords.paid_at && (
              <div className="mt-2 text-xs" style={{ color: mutedColor }}>
                {text.payment_time}: {new Date(paymentRecords.paid_at).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN')}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* ✅ 物流记录 */}
          {/* ============================================================ */}
          <div className="mt-4 border rounded-lg p-4 print:border-gray-300 print:p-3"
            style={{ borderColor: borderColor }}
          >
            <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: titleColor }}>
              <Truck size={18} style={{ color: mutedColor }} />
              {text.logistics_records}
            </h4>

            {logisticsData.hasRecords ? (
              <div className="space-y-3">
                {logisticsData.records.map((record, index) => {
                  const carrierDisplayName = record.carrier_name_cn || record.carrier_name_en || record.carrier_key;
                  const isLatest = index === logisticsData.records.length - 1;
                  const shippingMethodDisplay = record.shipping_method 
                    ? (shippingMethodMap[lang][record.shipping_method] || record.shipping_method)
                    : '';
                  
                  return (
                    <div 
                      key={record.id || index} 
                      className={`p-3 rounded-lg border ${isLatest ? 'border-blue-200' : 'border-gray-200'}`}
                      style={{
                        backgroundColor: isLatest ? infoBg : mutedBg,
                        borderColor: isLatest ? infoBorder : borderColor,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: mutedColor }}>
                            #{index + 1}
                          </span>
                          {isLatest && (
                            <span className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: infoBg,
                                color: infoText,
                              }}
                            >
                              {text.shipping_record_latest}
                            </span>
                          )}
                          <span className="text-sm font-medium" style={{ color: titleColor }}>
                            {carrierDisplayName || record.carrier_key}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: mutedColor }}>
                          {formatLogisticsDate(record.created_at)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-mono" style={{ color: pageText }}>
                          {text.shipping_record_tracking}: {record.tracking_number || '-'}
                        </span>
                        {shippingMethodDisplay && (
                          <span style={{ color: mutedColor }}>
                            {text.shipping_record_method}: {shippingMethodDisplay}
                          </span>
                        )}
                      </div>
                      {record.tracking_image && (
                        <div className="mt-2">
                          <img 
                            src={record.tracking_image} 
                            alt="物流凭证"
                            className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ borderColor: borderColor }}
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
              <div className="text-center py-4 text-sm" style={{ color: mutedColor }}>
                <Clock size={16} className="inline mr-1" />
                {text.shipping_record_no_records}
              </div>
            )}
          </div>

          {/* 页脚 */}
          <div className="mt-6 text-center text-sm border-t pt-4 print:border-gray-300"
            style={{ color: mutedColor, borderColor: borderColor }}
          >
            {siteName ? text.footer.replace('{{site_name}}', siteName) : ''}
            <br />
            <span className="text-xs" style={{ color: mutedColor }}>
              {new Date().toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}