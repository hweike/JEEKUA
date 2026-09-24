// app/admin/payment/orders/create/page.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Copy, X, Search, Truck, ArrowLeft, Save, Send } from 'lucide-react';
import Toast from '@/components/Toast';
import BuyerInfo from './components/BuyerInfo';
import PaymentMethodSelector from './components/PaymentMethodSelector';
import ProductSelector from './components/ProductSelector';
import BillInfo from './components/BillInfo';
import ShippingInfo from './components/ShippingInfo';
import OtherInfo from './components/OtherInfo';
import RemarkInfo from './components/RemarkInfo';
import type { PaymentMethodType, PaymentAccount } from '@/lib/payment/types/account';

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
  product_id?: string;
  sku?: string;
}

interface Product {
  id: string | number;
  product_name: string;
  parent_product_name?: string;
  _isVariant?: boolean;
  sku: string;
  price: number;
  main_image_url?: string;
}

interface FormData {
  buyer_name: string;
  buyer_email: string;
  buyer_company: string;
  buyer_country: string;
  buyer_phone: string;
  buyer_address: string;
  customer_id?: string;
  payment_method: 'bank_transfer' | 'qr_code' | 'online_payment';
  selectedAccounts: PaymentAccount[];
  order_no: string;
  contract_no: string;
  expiry_date: string;
  currency: string;
  items: OrderItem[];
  discount: number;
  shipping_fee: number;
  tax: number;
  sub_total: number;
  total_amount: number;
  shipping_method: string;
  shipping_date_type: string;
  shipping_date: string;
  shipping_days: number;
  trade_term: string;
  legal_terms: string;
  postscript: string;
  remark: string;
}

// ============================================================
// 常量数据
// ============================================================
const defaultItem: OrderItem = {
  id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
  product_name: '',
  specification: '',
  price: 0,
  quantity: 0,
  unit: 'pcs',
  total: 0,
  product_image: '',
  product_id: '',
  sku: '',
};

const UNITS = ['pcs', 'set', 'kg', 'g', 'm', 'cm', 'L', 'mL', 'box', 'carton', 'pallet', 'roll', 'sheet'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'HKD', 'JPY', 'CAD', 'AUD', 'CHF', 'SGD'];

// ============================================================
// 站点配置
// ============================================================
const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 卖家信息
// ============================================================
const SELLER_INFO = {
  company: 'Shenzhen Feisman Technology Co., Ltd.',
  address: '217, Building B, South International Plaza, NO.3013 Yitian Road, Shenzhen, Guangdong, China',
  phone: '+86 18123913227',
  email: 'vic@feisman.cn',
};

export default function CreateOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [siteId, setSiteId] = useState<string>(DEFAULT_SITE_ID);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);

  // ✅ 当前登录用户信息
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // 在客户端获取 siteId
  useEffect(() => {
    try {
      const siteIdFromCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('site_id='))
        ?.split('=')[1];
      
      if (siteIdFromCookie) {
        setSiteId(siteIdFromCookie);
      }
    } catch (error) {
      console.error('获取 siteId 失败:', error);
    }
  }, []);

  // ✅ 获取当前登录用户 - 保存 ID 和姓名
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          const userId = data.id || data.user?.id || 'system';
          const userName = data.name || data.nickname || data.user?.name || data.user?.email || data.email || '系统用户';
          const userEmail = data.email || data.user?.email || '';
          
          setCurrentUser({
            id: userId,
            name: userName,
            email: userEmail,
          });
        } else {
          console.warn('[CreateOrderPage] 获取当前用户失败，使用默认值');
          setCurrentUser({
            id: 'system',
            name: '系统用户',
            email: '',
          });
        }
      } catch (error) {
        console.error('[CreateOrderPage] 获取当前用户异常:', error);
        setCurrentUser({
          id: 'system',
          name: '系统用户',
          email: '',
        });
      }
    };
    loadCurrentUser();
  }, []);

  const [formData, setFormData] = useState<FormData>({
    buyer_name: '',
    buyer_email: '',
    buyer_company: '',
    buyer_country: '',
    buyer_phone: '',
    buyer_address: '',
    customer_id: undefined,
    payment_method: 'bank_transfer',
    selectedAccounts: [],
    order_no: '',
    contract_no: '',
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currency: 'USD',
    items: [{ ...defaultItem }],
    discount: 0,
    shipping_fee: 0,
    tax: 0,
    sub_total: 0,
    total_amount: 0,
    shipping_method: '快递',
    shipping_date_type: 'fixed',
    shipping_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    shipping_days: 10,
    trade_term: 'FOB',
    legal_terms: '',
    postscript: '',
    remark: '',
  });

  // ============================================================
  // ✅ 复制到剪贴板（带降级方案 + 先 focus 修复 NotAllowedError）
  // ============================================================
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // ✅ 先聚焦文档（修复 NotAllowedError: Document is not focused）
      if (typeof window !== 'undefined' && document.hasFocus && !document.hasFocus()) {
        window.focus();
        await new Promise((r) => setTimeout(r, 50));
      }

      await navigator.clipboard.writeText(text);
      console.log('[copyToClipboard] Clipboard API 复制成功');
      return true;
    } catch (err) {
      console.warn('[copyToClipboard] Clipboard API 失败，使用降级方案:', err);
      
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (success) {
          console.log('[copyToClipboard] 降级方案复制成功');
          return true;
        }
      } catch (fallbackErr) {
        console.warn('[copyToClipboard] 降级方案也失败:', fallbackErr);
      }
      
      return false;
    }
  };

  // ============================================================
  // ✅ 买家信息更新函数
  // ============================================================
  const handleBuyerChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ============================================================
  // ✅ 付款方式变更处理（多选）
  // ============================================================
  const handleAccountsChange = (accounts: PaymentAccount[]) => {
    setFormData((prev) => ({
      ...prev,
      selectedAccounts: accounts,
    }));
    
    if (accounts.length > 0) {
      const methods = accounts.map(a => a.payment_method);
      if (methods.every(m => m === methods[0])) {
        const methodMap: Record<string, 'bank_transfer' | 'qr_code' | 'online_payment'> = {
          'tt': 'bank_transfer',
          'wechat': 'qr_code',
          'alipay': 'qr_code',
          'paypal': 'online_payment',
          'credit_card': 'online_payment',
        };
        setFormData((prev) => ({
          ...prev,
          payment_method: methodMap[methods[0]] || 'bank_transfer',
        }));
      } else {
        const methodMap: Record<string, 'bank_transfer' | 'qr_code' | 'online_payment'> = {
          'tt': 'bank_transfer',
          'wechat': 'qr_code',
          'alipay': 'qr_code',
          'paypal': 'online_payment',
          'credit_card': 'online_payment',
        };
        for (const m of methods) {
          const mapped = methodMap[m];
          if (mapped) {
            setFormData((prev) => ({
              ...prev,
              payment_method: mapped,
            }));
            break;
          }
        }
      }
    }
  };

  // ============================================================
  // ✅ 发货日期类型变更处理
  // ============================================================
  const handleShippingDateTypeChange = (type: string) => {
    // 如果类型没有变化，不做任何处理
    if (type === formData.shipping_date_type) return;

    setFormData((prev) => {
      let shippingDate = prev.shipping_date;
      let shippingDays = prev.shipping_days;

      if (type === 'fixed') {
        // 固定日期：清空 shipping_days，保留 shipping_date
        shippingDays = 0;
      } else {
        // deposit 或 balance：清空 shipping_date，保留 shipping_days
        shippingDate = '';
        // 如果 shipping_days 为 0，设置默认值 10
        if (shippingDays === 0) {
          shippingDays = 10;
        }
      }

      return {
        ...prev,
        shipping_date_type: type,
        shipping_date: shippingDate,
        shipping_days: shippingDays,
      };
    });
  };

  // ============================================================
  // 计算总金额
  // ============================================================
  const calculateTotals = useCallback((items: OrderItem[], discount: number, shipping_fee: number, tax: number) => {
    const sub_total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    const total_amount = sub_total + shipping_fee + tax - discount;
    return { sub_total, total_amount };
  }, []);

  // ============================================================
  // 商品操作
  // ============================================================
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'price' || field === 'quantity') {
      newItems[index].total = (newItems[index].price || 0) * (newItems[index].quantity || 0);
    }
    const totals = calculateTotals(newItems, formData.discount, formData.shipping_fee, formData.tax);
    setFormData({
      ...formData,
      items: newItems,
      sub_total: totals.sub_total,
      total_amount: totals.total_amount,
    });
  };

  const addItem = () => {
    const newItem: OrderItem = {
      ...defaultItem,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    };
    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) {
      setToast({ message: '至少保留一个商品', type: 'error' });
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    const totals = calculateTotals(newItems, formData.discount, formData.shipping_fee, formData.tax);
    setFormData({
      ...formData,
      items: newItems,
      sub_total: totals.sub_total,
      total_amount: totals.total_amount,
    });
  };

  const copyItem = (index: number) => {
    const itemToCopy = { ...formData.items[index], id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() };
    const newItems = [...formData.items, itemToCopy];
    const totals = calculateTotals(newItems, formData.discount, formData.shipping_fee, formData.tax);
    setFormData({
      ...formData,
      items: newItems,
      sub_total: totals.sub_total,
      total_amount: totals.total_amount,
    });
  };

  // ============================================================
  // 金额更新
  // ============================================================
  const updateAmount = (field: 'discount' | 'shipping_fee' | 'tax', value: number) => {
    const newFormData = { ...formData, [field]: value };
    const totals = calculateTotals(newFormData.items, newFormData.discount, newFormData.shipping_fee, newFormData.tax);
    setFormData({
      ...newFormData,
      sub_total: totals.sub_total,
      total_amount: totals.total_amount,
    });
  };

  // ============================================================
  // 商品选择处理
  // ============================================================
  const handleProductSelect = (selectedProducts: Product[]) => {
    const newItems: OrderItem[] = selectedProducts.map(p => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      product_name: p._isVariant && p.parent_product_name 
        ? `${p.parent_product_name} (${p.product_name})` 
        : p.product_name,
      specification: p.sku || '',
      price: p.price || 0,
      quantity: 1,
      unit: 'pcs',
      total: p.price || 0,
      product_image: p.main_image_url || '',
      product_id: typeof p.id === 'string' ? p.id : String(p.id),
      sku: p.sku || '',
    }));

    let items = [...formData.items];
    const emptyIndex = items.findIndex(item => !item.product_name.trim());
    if (emptyIndex !== -1 && newItems.length > 0) {
      items[emptyIndex] = newItems[0];
      if (newItems.length > 1) {
        items = [...items, ...newItems.slice(1)];
      }
    } else {
      items = [...items, ...newItems];
    }

    const totals = calculateTotals(items, formData.discount, formData.shipping_fee, formData.tax);
    setFormData({
      ...formData,
      items,
      sub_total: totals.sub_total,
      total_amount: totals.total_amount,
    });
    setProductSelectorOpen(false);
    setToast({ message: `已添加 ${selectedProducts.length} 个商品`, type: 'success' });
  };

  // ============================================================
  // ✅ 表单验证
  // ============================================================
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.buyer_name.trim()) {
      errors.push('请填写买家名称');
    }
    if (!formData.buyer_email.trim()) {
      errors.push('请填写买家邮箱');
    }

    if (formData.selectedAccounts.length === 0) {
      errors.push('请至少选择一种付款方式');
    }

    const validItems = formData.items.filter(item => item.product_name.trim() !== '');
    if (validItems.length === 0) {
      errors.push('请至少添加一个商品');
    }

    formData.items.forEach((item, index) => {
      const rowNum = index + 1;
      if (!item.product_name.trim()) {
        return;
      }
      if (item.price <= 0) {
        errors.push(`第 ${rowNum} 行商品 "${item.product_name}" 的单价必须大于 0`);
      }
      if (item.quantity <= 0) {
        errors.push(`第 ${rowNum} 行商品 "${item.product_name}" 的数量必须大于 0`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  // ============================================================
  // ✅ 构建提交数据 - 使用用户 ID 作为 created_by
  // ============================================================
  const buildPayload = (status: 'draft' | 'submitted') => {
    const validItems = formData.items.filter(item => item.product_name.trim() !== '');
    
    return {
      buyer_name: formData.buyer_name,
      buyer_email: formData.buyer_email,
      buyer_company: formData.buyer_company,
      buyer_country: formData.buyer_country,
      buyer_phone: formData.buyer_phone,
      buyer_address: formData.buyer_address,
      customer_id: formData.customer_id || undefined,
      payment_method: formData.payment_method,
      selected_account_ids: formData.selectedAccounts.map(a => a.id),
      contract_no: formData.contract_no || undefined,
      expiry_date: formData.expiry_date,
      currency: formData.currency,
      items: validItems.map(item => ({
        product_name: item.product_name,
        specification: item.specification || '',
        price: item.price,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        product_image: item.product_image || '',
        product_id: item.product_id || undefined,
        sku: item.sku || '',
        category: '',
        locale: 'en',
      })),
      discount: formData.discount,
      shipping_fee: formData.shipping_fee,
      tax: formData.tax,
      shipping_method: formData.shipping_method,
      shipping_date_type: formData.shipping_date_type,
      shipping_date: formData.shipping_date,
      shipping_days: formData.shipping_days || 0,
      trade_term: formData.trade_term,
      legal_terms: formData.legal_terms,
      postscript: formData.postscript,
      remark: formData.remark,
      // ✅ 使用用户 ID 作为 created_by
      created_by: currentUser?.id || 'system',
      status,
    };
  };

  // ============================================================
  // ✅ 提交
  // ============================================================
  const handleSaveDraft = async () => {
    if (!formData.buyer_name.trim()) {
      setToast({ message: '请填写买家名称', type: 'error' });
      return;
    }
    
    const validItems = formData.items.filter(item => item.product_name.trim() !== '');
    if (validItems.length === 0) {
      setToast({ message: '请至少添加一个商品', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload('draft');

      const res = await fetch('/api/admin/payment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setToast({ message: '草稿保存成功', type: 'success' });
        setTimeout(() => router.push('/admin/payment/orders'), 1000);
      } else {
        setToast({ message: data.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      console.error('保存草稿失败:', error);
      setToast({ message: '保存失败，请检查网络连接', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const { valid, errors } = validateForm();
    
    if (!valid) {
      setToast({ message: errors[0] || '请完善表单信息', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload('submitted');

      const res = await fetch('/api/admin/payment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        const submitRes = await fetch(`/api/admin/payment/orders/${data.data.id}/actions?action=submit`, {
          method: 'POST',
        });
        const submitData = await submitRes.json();

        if (submitData.success && submitData.data?.shareUrl) {
          // ✅ 尝试复制链接
          const copied = await copyToClipboard(submitData.data.shareUrl);
          
          // ✅ 根据复制结果给出不同提示
          if (copied) {
            setToast({ message: '✅ 订单提交成功，分享链接已复制', type: 'success' });
          } else {
            setToast({ 
              message: `✅ 订单提交成功。分享链接：${submitData.data.shareUrl}（请手动复制）`, 
              type: 'success' 
            });
          }
          setTimeout(() => router.push('/admin/payment/orders'), 1000);
        } else {
          setToast({ message: submitData.error || '提交失败', type: 'error' });
        }
      } else {
        setToast({ message: data.error || '创建失败', type: 'error' });
      }
    } catch (error) {
      console.error('提交订单失败:', error);
      setToast({ message: '提交失败，请检查网络连接', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // 主渲染
  // ============================================================
  return (
    <>
      <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>返回列表</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold">创建收款订单</h1>
              <p className="text-gray-500 text-sm mt-1">填写订单信息，生成收款账单</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. 卖家信息 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">卖家信息</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">公司名称</label>
                <div className="font-medium">{SELLER_INFO.company}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">联系电话</label>
                <div className="font-medium">{SELLER_INFO.phone}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">公司地址</label>
                <div className="font-medium">{SELLER_INFO.address}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">电子邮箱</label>
                <div className="font-medium">{SELLER_INFO.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. 买家信息 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">买家信息</h3>
          </div>
          <div className="p-4">
            <BuyerInfo
              value={{
                buyer_name: formData.buyer_name,
                buyer_company: formData.buyer_company,
                buyer_country: formData.buyer_country,
                buyer_phone: formData.buyer_phone,
                buyer_email: formData.buyer_email,
                buyer_address: formData.buyer_address,
                customer_id: formData.customer_id,
              }}
              onChange={handleBuyerChange}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. 支付方式 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">支付方式</h3>
            <span className="text-sm text-gray-400 ml-2">可多选，建议最多选择3种付款方式</span>
          </div>
          <div className="p-4">
            <PaymentMethodSelector
              siteId={siteId}
              value={formData.payment_method as PaymentMethodType}
              onChange={(method, accountId) => {
                setFormData({ 
                  ...formData, 
                  payment_method: method,
                });
                if (accountId) {
                  console.log('选中的账号ID:', accountId);
                }
              }}
              multiple={true}
              maxSelect={3}
              selectedAccounts={formData.selectedAccounts}
              onAccountsChange={handleAccountsChange}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. 账单信息 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">账单信息</h3>
          </div>
          <div className="p-4">
            <BillInfo
              contractNo={formData.contract_no}
              onContractNoChange={(value) => setFormData({ ...formData, contract_no: value })}
              expiryDate={formData.expiry_date}
              onExpiryDateChange={(date) => setFormData({ ...formData, expiry_date: date })}
              currency={formData.currency}
              onCurrencyChange={(currency) => setFormData({ ...formData, currency })}
              items={formData.items}
              onItemsChange={(items) => {
                const totals = calculateTotals(items, formData.discount, formData.shipping_fee, formData.tax);
                setFormData({
                  ...formData,
                  items,
                  sub_total: totals.sub_total,
                  total_amount: totals.total_amount,
                });
              }}
              discount={formData.discount}
              onDiscountChange={(value) => updateAmount('discount', value)}
              shippingFee={formData.shipping_fee}
              onShippingFeeChange={(value) => updateAmount('shipping_fee', value)}
              tax={formData.tax}
              onTaxChange={(value) => updateAmount('tax', value)}
              subTotal={formData.sub_total}
              totalAmount={formData.total_amount}
              onSelectProduct={() => setProductSelectorOpen(true)}
              readOnly={false}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. 发货信息 - 使用 handleShippingDateTypeChange */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">运输信息</h3>
            <span className="text-sm text-gray-400 ml-2">贸易涉及到的相关运输条款，为方便您后续的报关、运输、清关等，请务必如实填写</span>
          </div>
          <div className="p-4">
            <ShippingInfo
              shippingMethod={formData.shipping_method}
              onShippingMethodChange={(method) => setFormData({ ...formData, shipping_method: method })}
              shippingDateType={formData.shipping_date_type}
              onShippingDateTypeChange={handleShippingDateTypeChange}
              shippingDate={formData.shipping_date}
              onShippingDateChange={(date) => setFormData({ ...formData, shipping_date: date })}
              shippingDays={formData.shipping_days}
              onShippingDaysChange={(days) => setFormData({ ...formData, shipping_days: days })}
              tradeTerm={formData.trade_term}
              onTradeTermChange={(term) => setFormData({ ...formData, trade_term: term })}
              readOnly={false}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 6. 其他信息 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">其他信息</h3>
          </div>
          <div className="p-4">
            <OtherInfo
              legalTerms={formData.legal_terms}
              onLegalTermsChange={(value) => setFormData({ ...formData, legal_terms: value })}
              postscript={formData.postscript}
              onPostscriptChange={(value) => setFormData({ ...formData, postscript: value })}
              readOnly={false}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 7. 备注 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">备注</h3>
          </div>
          <div className="p-4">
            <RemarkInfo
              remark={formData.remark}
              onRemarkChange={(value) => setFormData({ ...formData, remark: value })}
              readOnly={false}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ✅ 悬浮操作栏 */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-4 py-3 flex flex-wrap items-center justify-end gap-3 z-50">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
          <span>返回列表</span>
        </button>
        
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          <span>{saving ? '保存中...' : '存为草稿'}</span>
        </button>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send size={16} />
          <span>{submitting ? '提交中...' : '提交'}</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 商品选择器模态窗口 */}
      {/* ============================================================ */}
      <ProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onSelect={handleProductSelect}
        mode="multiple"
        maxSelect={10}
        locale="en"
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}