// app/admin/payment/orders/create/components/BillInfo.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

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

interface BillInfoProps {
  contractNo: string;
  onContractNoChange: (value: string) => void;
  expiryDate: string;
  onExpiryDateChange: (date: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  items: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
  discount: number;
  onDiscountChange: (value: number) => void;
  shippingFee: number;
  onShippingFeeChange: (value: number) => void;
  tax: number;
  onTaxChange: (value: number) => void;
  subTotal: number;
  totalAmount: number;
  onAddItem?: () => void;
  onSelectProduct?: () => void;
  readOnly?: boolean;
}

const UNITS = ['pcs', 'set', 'kg', 'g', 'm', 'cm', 'L', 'mL', 'box', 'carton', 'pallet', 'roll', 'sheet'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'HKD', 'JPY', 'CAD', 'AUD', 'CHF', 'SGD'];

export default function BillInfo({
  contractNo,
  onContractNoChange,
  expiryDate,
  onExpiryDateChange,
  currency,
  onCurrencyChange,
  items,
  onItemsChange,
  discount,
  onDiscountChange,
  shippingFee,
  onShippingFeeChange,
  tax,
  onTaxChange,
  subTotal,
  totalAmount,
  onAddItem,
  onSelectProduct,
  readOnly = false,
}: BillInfoProps) {
  // 运费/折扣/税费展开状态
  const [feeExpanded, setFeeExpanded] = useState(false);
  
  // ✅ 折扣类型状态：'amount' | 'percent'
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  // ✅ 折扣输入值（显示用）
  const [discountInputValue, setDiscountInputValue] = useState<string>('');
  // ✅ 防抖定时器
  const discountTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ 当外部 discount 变化时，同步更新输入框显示值
  useEffect(() => {
    if (discountType === 'amount') {
      setDiscountInputValue(discount ? String(discount) : '');
    } else {
      // 百分比模式：计算百分比值 = (折扣金额 / 商品总金额) * 100
      if (subTotal > 0 && discount > 0) {
        const percent = (discount / subTotal) * 100;
        setDiscountInputValue(percent.toFixed(1));
      } else {
        setDiscountInputValue('');
      }
    }
  }, [discount, subTotal, discountType]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (discountTimerRef.current) {
        clearTimeout(discountTimerRef.current);
      }
    };
  }, []);

  // ============================================================
  // 商品操作
  // ============================================================
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'price' || field === 'quantity') {
      newItems[index].total = (newItems[index].price || 0) * (newItems[index].quantity || 0);
    }
    onItemsChange(newItems);
  };

  const addItem = () => {
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
    onItemsChange([...items, newItem]);
    if (onAddItem) onAddItem();
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const copyItem = (index: number) => {
    const itemToCopy = { ...items[index], id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() };
    onItemsChange([...items, itemToCopy]);
  };

  // ============================================================
  // ✅ 折扣处理 - 与金额折扣一样的方式（按 Enter 或失焦时计算）
  // ============================================================
  const handleDiscountTypeChange = (type: 'amount' | 'percent') => {
    setDiscountType(type);
    // 切换类型时清空折扣值
    setDiscountInputValue('');
    onDiscountChange(0);
  };

  // ✅ 输入变化时只更新显示值，不触发计算
  const handleDiscountInputChange = (value: string) => {
    setDiscountInputValue(value);
  };

  // ✅ 按 Enter 或失焦时计算折扣
  const handleDiscountConfirm = () => {
    const numValue = parseFloat(discountInputValue) || 0;
    
    if (discountType === 'percent') {
      // 百分比模式：计算实际折扣金额 = 商品总金额 * 百分比 / 100
      const actualDiscount = (subTotal * numValue) / 100;
      onDiscountChange(Math.round(actualDiscount * 100) / 100);
    } else {
      // 金额模式：直接使用输入值
      onDiscountChange(numValue);
    }
  };

  // ✅ 按 Enter 键时触发计算
  const handleDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDiscountConfirm();
    }
  };

  // ✅ 获取折扣显示文本
  const getDiscountDisplay = () => {
    if (discountType === 'percent' && subTotal > 0 && discount > 0) {
      const percent = (discount / subTotal) * 100;
      return `${percent.toFixed(1)}% (${currency} ${discount.toFixed(2)})`;
    }
    return `${currency} ${discount.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 第一部分：基本信息 */}
      {/* ============================================================ */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">基本信息</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">合同号</label>
            <input
              type="text"
              value={contractNo}
              onChange={(e) => onContractNoChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入合同号（留空自动生成）"
              disabled={readOnly}
            />
            <p className="text-xs text-gray-400 mt-1">留空将自动生成，格式: PI-YYYYMMDD-XXXX</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">账单截止时间</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => onExpiryDateChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 第二部分：账单金额 */}
      {/* ============================================================ */}
      <div className="border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">账单币种</label>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {!readOnly && (
            <button
              onClick={onSelectProduct || (() => {})}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus size={16} /> 选择商品
            </button>
          )}
        </div>

        {/* 商品表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left w-[70px]">商品图片</th>
                <th className="px-3 py-2 text-left min-w-[120px]">商品名称 <span className="text-red-500">*</span></th>
                <th className="px-3 py-2 text-left w-[140px]">规格</th>
                <th className="px-3 py-2 text-right w-[100px]">单价 <span className="text-red-500">*</span></th>
                <th className="px-3 py-2 text-center w-[80px]">数量 <span className="text-red-500">*</span></th>
                <th className="px-3 py-2 text-center w-[80px]">单位</th>
                <th className="px-3 py-2 text-right w-[100px]">小计</th>
                <th className="px-3 py-2 text-center w-[90px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    {/* ✅ 根据是否有 product_id 决定显示方式 */}
                    {item.product_id ? (
                      // ✅ 有 product_id：从产品关联获取图片，只显示不提供上传
                      <div className="w-12 h-12 rounded border overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {item.product_image ? (
                          <img 
                            src={item.product_image} 
                            alt={item.product_name || '产品图片'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              // 显示占位
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const placeholder = document.createElement('span');
                                placeholder.className = 'text-lg';
                                placeholder.textContent = '📦';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>
                    ) : (
                      // ✅ 没有 product_id：手工填写，提供图片上传
                      <ImageUpload
                        value={item.product_image || ''}
                        onChange={(url) => {
                          const imageUrl = Array.isArray(url) ? url[0] : url;
                          updateItem(index, 'product_image', imageUrl);
                        }}
                        billMode={true}
                        maxCount={1}
                        className="inline-block"
                        showUploadButtons={false}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      value={item.product_name}
                      onChange={e => updateItem(index, 'product_name', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      placeholder="商品名称"
                      rows={2}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.specification}
                      onChange={e => updateItem(index, 'specification', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="规格"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={item.unit}
                      onChange={e => updateItem(index, 'unit', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={readOnly}
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-600">
                    {currency} {(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => copyItem(index)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                        title="复制"
                        disabled={readOnly}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="删除"
                        disabled={readOnly}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 添加商品按钮 */}
        {!readOnly && (
          <div className="mt-3">
            <button
              onClick={addItem}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus size={16} /> 添加商品行
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 运费/折扣/税费 */}
        {/* ============================================================ */}
        <div className="mt-4 pt-4 border-t">
          {/* 商品总金额行 */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">商品总金额</span>
            <span className="font-mono">{currency} {subTotal.toFixed(2)}</span>
          </div>

          {/* 添加运费/折扣/税费 展开按钮 */}
          <div 
            className="flex items-center gap-1 text-sm text-blue-600 cursor-pointer hover:text-blue-700 select-none"
            onClick={() => setFeeExpanded(!feeExpanded)}
          >
            <span>添加运费/折扣/税费</span>
            {feeExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>

          {/* 展开的运费/折扣/税费表单 */}
          {feeExpanded && (
            <div className="mt-3 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
              {/* ✅ 折扣 - 修复百分比输入体验 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <label className="text-sm text-gray-600">折扣</label>
                  <button 
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    title="折扣说明"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 1024 1024" fill="currentColor">
                      <path d="M493.324 714.679v-64h58.685v64zm-62.708-381.733c32.427-34.743 78.385-40.618 121.686-31.841 42.666 8.606 92.964 49.298 92.964 107.69 0 52.37-38.156 75.289-59.44 88.089a289 289 0 0 0-6.437 3.9c-19.115 12.24-26.965 26.942-26.965 43.033v60.806H493.69v-85.796c0-10.24 1.658-18.53 5.34-25.795 3.656-7.217 9.532-13.727 18.602-20.042l4.267-2.803 38.522-25.6v-.025a48.76 48.76 0 0 0 21.552-36.522c1.22-13.386-2.999-26.893-11.873-35.45l-.17-.171a73.92 73.92 0 0 0-64.61-16.579c-22.528 4.437-35.792 14.824-43.179 28.526-7.217 13.385-8.533 29.257-8.655 43.983v11.703H395.02c.195-25.795 1.95-44.52 6.827-60.465 5.169-16.75 13.921-30.72 28.77-46.665z"/>
                      <path d="M512 917.333c223.866 0 405.333-181.467 405.333-405.333S735.866 106.667 512 106.667 106.667 288.134 106.667 512 288.134 917.333 512 917.333m0-58.66c-191.464 0-346.673-155.21-346.673-346.673S320.537 165.327 512 165.327 858.673 320.537 858.673 512 703.463 858.673 512 858.673"/>
                    </svg>
                  </button>
                  <span className="text-xs text-gray-400 ml-1">
                    {discount > 0 ? getDiscountDisplay() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <select 
                    value={discountType}
                    onChange={(e) => handleDiscountTypeChange(e.target.value as 'amount' | 'percent')}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={readOnly}
                  >
                    <option value="amount">金额</option>
                    <option value="percent">百分比</option>
                  </select>
                  <input
                    type="number"
                    value={discountInputValue}
                    onChange={(e) => handleDiscountInputChange(e.target.value)}
                    onBlur={handleDiscountConfirm}
                    onKeyDown={handleDiscountKeyDown}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={discountType === 'percent' ? '请输入百分比（如: 10）' : '请输入金额'}
                    min="0"
                    step="0.01"
                    disabled={readOnly}
                  />
                  {discountType === 'percent' && subTotal > 0 && discount > 0 && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      = {currency} {discount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* 运费 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <label className="text-sm text-gray-600">运费</label>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={shippingFee || ''}
                    onChange={e => onShippingFeeChange(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入"
                    min="0"
                    step="0.01"
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* 税费 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <label className="text-sm text-gray-600">税费</label>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={tax || ''}
                    onChange={e => onTaxChange(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入"
                    min="0"
                    step="0.01"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 账单总金额 */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <span className="text-sm text-gray-500">账单总金额</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">自动计算</span>
              <span className="text-lg font-bold text-blue-600">{currency} {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}