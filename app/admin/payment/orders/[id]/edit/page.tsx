// app/admin/payment/orders/[id]/edit/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Save, X, Truck } from 'lucide-react';
import Toast from '@/components/Toast';
import BuyerInfo from '../../create/components/BuyerInfo';
import PaymentMethodSelector from '../../create/components/PaymentMethodSelector';
import ProductSelector from '../../create/components/ProductSelector';
import BillInfo from '../../create/components/BillInfo';
import ShippingInfo from '../../create/components/ShippingInfo';
import OtherInfo from '../../create/components/OtherInfo';
import RemarkInfo from '../../create/components/RemarkInfo';
import type { PaymentMethodType, PaymentAccount } from '@/lib/payment/types/account';
import { accountService } from '@/lib/payment/services/account.service';

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

interface OrderDetail {
  id: string;
  site_id: string;
  order_no: string;
  contract_no?: string;
  customer_id?: string;
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
  items: OrderItem[];
  selected_account_ids?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// 常量数据
// ============================================================
const UNITS = ['pcs', 'set', 'kg', 'g', 'm', 'cm', 'L', 'mL', 'box', 'carton', 'pallet', 'roll', 'sheet'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'HKD', 'JPY', 'CAD', 'AUD', 'CHF', 'SGD'];

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [allAccounts, setAllAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<PaymentAccount[]>([]);
  
  // 商品选择器状态
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  
  // 站点ID（从cookie获取）
  const [siteId, setSiteId] = useState<string>('000001');

  // 获取 siteId
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

  // ============================================================
  // 加载订单数据和收款账号
  // ============================================================
  useEffect(() => {
    if (orderId && siteId) {
      loadData();
    }
  }, [orderId, siteId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. 加载所有收款账号
      const accounts = await accountService.getAllActive(siteId);
      setAllAccounts(accounts);

      // 2. 加载订单
      const res = await fetch(`/api/admin/payment/orders/${orderId}`);
      const result = await res.json();
      
      if (result.success) {
        const orderData = result.data;
        
        // ✅ 确保每个商品的 total 正确
        const itemsWithTotal = (orderData.items || []).map((item: OrderItem) => ({
          ...item,
          total: (item.price || 0) * (item.quantity || 0)
        }));
        
        // ✅ 强制重新计算总金额（基于 items 重新计算）
        const sub_total = itemsWithTotal.reduce((sum: number, item: OrderItem) => sum + item.total, 0);
        const total_amount = sub_total + (orderData.shipping_fee || 0) + (orderData.tax || 0) - (orderData.discount || 0);
        
        orderData.items = itemsWithTotal;
        orderData.sub_total = sub_total;
        orderData.total_amount = total_amount;
        
        console.log('[loadData] 重新计算金额:', { 
          itemsCount: itemsWithTotal.length, 
          sub_total, 
          total_amount,
          shipping_fee: orderData.shipping_fee,
          tax: orderData.tax,
          discount: orderData.discount
        });
        
        setOrder(orderData);
        
        // 3. 恢复选中的支付账号
        if (orderData.selected_account_ids && orderData.selected_account_ids.length > 0) {
          const selected = accounts.filter((a: PaymentAccount) => 
            orderData.selected_account_ids.includes(a.id)
          );
          setSelectedAccounts(selected);
        } else {
          setSelectedAccounts([]);
        }
      } else {
        setToast({ message: result.error || '加载失败', type: 'error' });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setToast({ message: '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ 计算总金额（统一方法）
  // ============================================================
  const calculateTotals = useCallback((items: OrderItem[], discount: number, shipping_fee: number, tax: number) => {
    // 确保每个商品的 total 正确
    const itemsWithTotal = items.map(item => ({
      ...item,
      total: (item.price || 0) * (item.quantity || 0)
    }));
    const sub_total = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
    const total_amount = sub_total + shipping_fee + tax - discount;
    return { sub_total, total_amount, items: itemsWithTotal };
  }, []);

  // ============================================================
  // 更新订单字段
  // ============================================================
  const updateOrderField = (field: keyof OrderDetail, value: any) => {
    if (!order) return;
    setOrder({ ...order, [field]: value });
  };

  // ============================================================
  // ✅ 处理支付方式变更（多选）
  // ============================================================
  const handleAccountsChange = (accounts: PaymentAccount[]) => {
    setSelectedAccounts(accounts);
    if (accounts.length > 0) {
      const methods = accounts.map(a => a.payment_method);
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
          setOrder(prev => prev ? { ...prev, payment_method: mapped } : null);
          break;
        }
      }
    }
  };

  // ============================================================
  // ✅ 商品操作 - 使用 calculateTotals 统一计算
  // ============================================================
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    if (!order) return;
    const newItems = [...order.items];
    newItems[index] = { ...newItems[index], [field]: value };
    // 重新计算 total
    const { items, sub_total, total_amount } = calculateTotals(
      newItems, 
      order.discount, 
      order.shipping_fee, 
      order.tax
    );
    setOrder({
      ...order,
      items,
      sub_total,
      total_amount,
    });
  };

  const addItem = () => {
    if (!order) return;
    const newItem: OrderItem = {
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
    const newItems = [...order.items, newItem];
    const { items, sub_total, total_amount } = calculateTotals(
      newItems, 
      order.discount, 
      order.shipping_fee, 
      order.tax
    );
    setOrder({
      ...order,
      items,
      sub_total,
      total_amount,
    });
  };

  const removeItem = (index: number) => {
    if (!order) return;
    if (order.items.length <= 1) {
      setToast({ message: '至少保留一个商品', type: 'error' });
      return;
    }
    const newItems = order.items.filter((_, i) => i !== index);
    const { items, sub_total, total_amount } = calculateTotals(
      newItems, 
      order.discount, 
      order.shipping_fee, 
      order.tax
    );
    setOrder({
      ...order,
      items,
      sub_total,
      total_amount,
    });
  };

  const copyItem = (index: number) => {
    if (!order) return;
    const itemToCopy = { 
      ...order.items[index], 
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() 
    };
    const newItems = [...order.items, itemToCopy];
    const { items, sub_total, total_amount } = calculateTotals(
      newItems, 
      order.discount, 
      order.shipping_fee, 
      order.tax
    );
    setOrder({
      ...order,
      items,
      sub_total,
      total_amount,
    });
  };

  // ============================================================
  // ✅ 金额更新
  // ============================================================
  const updateAmount = (field: 'discount' | 'shipping_fee' | 'tax', value: number) => {
    if (!order) return;
    const { items, sub_total, total_amount } = calculateTotals(
      order.items, 
      field === 'discount' ? value : order.discount,
      field === 'shipping_fee' ? value : order.shipping_fee,
      field === 'tax' ? value : order.tax
    );
    setOrder({
      ...order,
      [field]: value,
      items,
      sub_total,
      total_amount,
    });
  };

  // ============================================================
  // 商品选择处理
  // ============================================================
  const handleProductSelect = (selectedProducts: any[]) => {
    if (!order) return;
    
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

    let items = [...order.items];
    const emptyIndex = items.findIndex(item => !item.product_name.trim());
    if (emptyIndex !== -1 && newItems.length > 0) {
      items[emptyIndex] = newItems[0];
      if (newItems.length > 1) {
        items = [...items, ...newItems.slice(1)];
      }
    } else {
      items = [...items, ...newItems];
    }

    const { items: updatedItems, sub_total, total_amount } = calculateTotals(
      items, 
      order.discount, 
      order.shipping_fee, 
      order.tax
    );
    setOrder({
      ...order,
      items: updatedItems,
      sub_total,
      total_amount,
    });
    setProductSelectorOpen(false);
    setToast({ message: `已添加 ${selectedProducts.length} 个商品`, type: 'success' });
  };

  // ============================================================
  // ✅ 保存订单（仅 draft 状态可保存）
  // ============================================================
  const handleSave = async () => {
    if (!order) return;
    
    // ✅ 只有草稿状态可编辑
    if (order.status !== 'draft') {
      setToast({ message: '只有草稿状态的订单可以编辑', type: 'error' });
      return;
    }
    
    // 验证必填字段
    if (!order.buyer_name?.trim()) {
      setToast({ message: '买家名称不能为空', type: 'error' });
      return;
    }
    if (!order.buyer_email?.trim()) {
      setToast({ message: '买家邮箱不能为空', type: 'error' });
      return;
    }
    if (selectedAccounts.length === 0) {
      setToast({ message: '请至少选择一种付款方式', type: 'error' });
      return;
    }
    const validItems = order.items.filter(item => item.product_name?.trim());
    if (validItems.length === 0) {
      setToast({ message: '请至少添加一个商品', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // ✅ 从 order.items 获取最新数据，确保 total 正确
      const itemsWithTotal = validItems.map(item => ({
        id: item.id,
        product_name: item.product_name,
        specification: item.specification || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'pcs',
        product_image: item.product_image || '',
        product_id: item.product_id || '',
        sku: item.sku || '',
        total: (Number(item.price) || 0) * (Number(item.quantity) || 0),
      }));

      // ✅ 重新计算总金额（使用 Number 确保类型正确）
      const subTotal = itemsWithTotal.reduce((sum, item) => sum + (item.total || 0), 0);
      const discount = Number(order.discount) || 0;
      const shippingFee = Number(order.shipping_fee) || 0;
      const tax = Number(order.tax) || 0;
      const totalAmount = subTotal + shippingFee + tax - discount;

      console.log('[handleSave] 计算金额:', { subTotal, discount, shippingFee, tax, totalAmount });

      const payload = {
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        buyer_company: order.buyer_company || '',
        buyer_country: order.buyer_country || '',
        buyer_phone: order.buyer_phone || '',
        buyer_address: order.buyer_address || '',
        customer_id: order.customer_id || undefined,
        payment_method: order.payment_method,
        selected_account_ids: selectedAccounts.map(a => a.id),
        contract_no: order.contract_no || '',
        expiry_date: order.expiry_date,
        currency: order.currency,
        items: itemsWithTotal,
        discount: discount,
        shipping_fee: shippingFee,
        tax: tax,
        sub_total: subTotal,
        total_amount: totalAmount,
        shipping_method: order.shipping_method || '',
        shipping_date_type: order.shipping_date_type || '',
        shipping_date: order.shipping_date || '',
        shipping_days: Number(order.shipping_days) || 0,
        trade_term: order.trade_term || '',
        legal_terms: order.legal_terms || '',
        postscript: order.postscript || '',
        remark: order.remark || '',
      };

      console.log('[handleSave] 提交 payload:', payload);

      const res = await fetch(`/api/admin/payment/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        setToast({ message: '保存成功', type: 'success' });
        // ✅ 更新本地状态
        setOrder({
          ...order,
          items: itemsWithTotal,
          sub_total: subTotal,
          total_amount: totalAmount,
        });
        setTimeout(() => router.push('/admin/payment/orders'), 1000);
      } else {
        setToast({ message: result.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      console.error('保存失败:', error);
      setToast({ message: '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
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

  // ✅ 检查是否可编辑（只有草稿状态可编辑）
  const isEditable = order.status === 'draft';

  if (!isEditable) {
    return (
      <>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/payment/orders')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={20} /> 返回列表
              </button>
              <h1 className="text-2xl font-bold">编辑订单</h1>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700 text-lg font-medium">⚠️ 订单无法编辑</p>
            <p className="text-yellow-600 mt-1">
              当前订单状态为 <strong>{order.status}</strong>，只有草稿状态的订单可以编辑。
            </p>
            <button
              onClick={() => router.push(`/admin/payment/orders/${orderId}`)}
              className="mt-4 text-blue-600 hover:underline"
            >
              查看订单详情
            </button>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // 主渲染（仅草稿状态可编辑）
  // ============================================================
  return (
    <>
      <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
        {/* 页面头部 */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin/payment/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} /> 返回列表
          </button>
          <div>
            <h1 className="text-2xl font-bold">编辑订单</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              订单号: {order.order_no} {order.contract_no && `| 合同号: ${order.contract_no}`}
            </p>
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
                <div className="font-medium">Shenzhen Feisman Technology Co., Ltd.</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">联系电话</label>
                <div className="font-medium">+86 18123913227</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">公司地址</label>
                <div className="font-medium">217, Building B, South International Plaza, NO.3013 Yitian Road, Shenzhen, Guangdong, China</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">电子邮箱</label>
                <div className="font-medium">vic@feisman.cn</div>
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
                buyer_name: order.buyer_name || '',
                buyer_company: order.buyer_company || '',
                buyer_country: order.buyer_country || '',
                buyer_phone: order.buyer_phone || '',
                buyer_email: order.buyer_email || '',
                buyer_address: order.buyer_address || '',
                customer_id: order.customer_id || undefined,
              }}
              onChange={(field, val) => updateOrderField(field as any, val)}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. 支付方式 - 启用多选 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">支付方式</h3>
            <span className="text-sm text-gray-400 ml-2">可多选，建议最多选择3种付款方式</span>
          </div>
          <div className="p-4">
            <PaymentMethodSelector
              siteId={siteId}
              value={order.payment_method as PaymentMethodType}
              onChange={(method) => updateOrderField('payment_method', method)}
              multiple={true}
              maxSelect={3}
              selectedAccounts={selectedAccounts}
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
              contractNo={order.contract_no || ''}
              onContractNoChange={(value) => updateOrderField('contract_no', value)}
              expiryDate={order.expiry_date?.split('T')[0] || ''}
              onExpiryDateChange={(date) => updateOrderField('expiry_date', date)}
              currency={order.currency || 'USD'}
              onCurrencyChange={(value) => updateOrderField('currency', value)}
              items={order.items}
              onItemsChange={(items) => {
                // ✅ 使用 calculateTotals 统一计算
                const { items: updatedItems, sub_total, total_amount } = calculateTotals(
                  items, 
                  order.discount, 
                  order.shipping_fee, 
                  order.tax
                );
                setOrder({
                  ...order,
                  items: updatedItems,
                  sub_total,
                  total_amount,
                });
              }}
              discount={order.discount || 0}
              onDiscountChange={(value) => updateAmount('discount', value)}
              shippingFee={order.shipping_fee || 0}
              onShippingFeeChange={(value) => updateAmount('shipping_fee', value)}
              tax={order.tax || 0}
              onTaxChange={(value) => updateAmount('tax', value)}
              subTotal={order.sub_total || 0}
              totalAmount={order.total_amount || 0}
              onSelectProduct={() => setProductSelectorOpen(true)}
              readOnly={false}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. 发货信息 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium">运输信息</h3>
            <span className="text-sm text-gray-400 ml-2">贸易涉及到的相关运输条款，为方便您后续的报关、运输、清关等，请务必如实填写</span>
          </div>
          <div className="p-4">
            <ShippingInfo
              shippingMethod={order.shipping_method || ''}
              onShippingMethodChange={(value) => updateOrderField('shipping_method', value)}
              shippingDateType={order.shipping_date_type || ''}
              onShippingDateTypeChange={(value) => updateOrderField('shipping_date_type', value)}
              shippingDate={order.shipping_date || ''}
              onShippingDateChange={(value) => updateOrderField('shipping_date', value)}
              shippingDays={order.shipping_days || 0}
              onShippingDaysChange={(value) => updateOrderField('shipping_days', value)}
              tradeTerm={order.trade_term || ''}
              onTradeTermChange={(value) => updateOrderField('trade_term', value)}
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
              legalTerms={order.legal_terms || ''}
              onLegalTermsChange={(value) => updateOrderField('legal_terms', value)}
              postscript={order.postscript || ''}
              onPostscriptChange={(value) => updateOrderField('postscript', value)}
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
              remark={order.remark || ''}
              onRemarkChange={(value) => updateOrderField('remark', value)}
              readOnly={false}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 商品选择器 */}
        {/* ============================================================ */}
        <ProductSelector
          open={productSelectorOpen}
          onClose={() => setProductSelectorOpen(false)}
          onSelect={handleProductSelect}
          mode="multiple"
          maxSelect={10}
          locale="en"
        />
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
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          <span>{saving ? '保存中...' : '保存'}</span>
        </button>
      </div>

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