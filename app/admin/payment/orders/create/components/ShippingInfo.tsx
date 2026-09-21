// app/admin/payment/orders/create/components/ShippingInfo.tsx
'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface ShippingInfoProps {
  shippingMethod: string;
  onShippingMethodChange: (method: string) => void;
  shippingDateType: string;
  onShippingDateTypeChange: (type: string) => void;
  shippingDate: string;
  onShippingDateChange: (date: string) => void;
  shippingDays: number;
  onShippingDaysChange: (days: number) => void;
  tradeTerm: string;
  onTradeTermChange: (term: string) => void;
  readOnly?: boolean;
}

const SHIPPING_METHODS = ['快递', '多式联运', '海运', '空运', '陆运', '邮政'];
const SHIPPING_DATE_TYPES = [
  { key: 'deposit', label: '预付款到账后发货' },
  { key: 'balance', label: '尾款到账后发货' },
  { key: 'fixed', label: '指定发货日期' },
];
const TRADE_TERMS = [
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF',
  'CPT', 'CIP', 'DAT', 'DAP', 'DDP'
];

export default function ShippingInfo({
  shippingMethod,
  onShippingMethodChange,
  shippingDateType,
  onShippingDateTypeChange,
  shippingDate,
  onShippingDateChange,
  shippingDays = 0,
  onShippingDaysChange,
  tradeTerm,
  onTradeTermChange,
  readOnly = false,
}: ShippingInfoProps) {
  const [showTradeTermsHelp, setShowTradeTermsHelp] = useState(false);

  // ✅ 处理天数变化
  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (onShippingDaysChange) {
      onShippingDaysChange(isNaN(value) ? 0 : Math.max(0, value));
    }
  };

  // ✅ 判断是否显示天数输入（deposit 或 balance）
  const showDaysInput = shippingDateType === 'deposit' || shippingDateType === 'balance';
  // ✅ 判断是否显示日期选择器（fixed）
  const showDatePicker = shippingDateType === 'fixed';

  // ✅ 判断是否使用默认天数
  const useDefaultDays = showDaysInput && shippingDays === 0;

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 运输方式 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> 运输方式
          </label>
        </div>
        <div className="md:col-span-3">
          <div className="flex flex-wrap gap-2">
            {SHIPPING_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => !readOnly && onShippingMethodChange(method)}
                disabled={readOnly}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  shippingMethod === method
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 发货日期 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> 发货日期
            <HelpCircle size={14} className="text-gray-400 cursor-help" title="请选择发货日期" />
          </label>
        </div>
        <div className="md:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {SHIPPING_DATE_TYPES.map((type) => {
                const isActive = shippingDateType === type.key;
                
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => !readOnly && onShippingDateTypeChange(type.key)}
                    disabled={readOnly}
                    className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            
            {/* ✅ 预付款/尾款到账后 - 显示天数输入（不显示日期选择器） */}
            {showDaysInput && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">到账后</span>
                <input
                  type="number"
                  value={shippingDays || ''}
                  onChange={handleDaysChange}
                  className="w-16 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                  min="1"
                  max="90"
                  disabled={readOnly}
                />
                <span className="text-gray-600">个自然日内发货</span>
                {useDefaultDays && (
                  <span className="text-xs text-gray-400">（默认 10 天）</span>
                )}
              </div>
            )}

            {/* ✅ 指定发货日期 - 显示日期选择器（不显示天数输入） */}
            {showDatePicker && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={shippingDate}
                  onChange={(e) => onShippingDateChange(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={readOnly}
                />
                {!shippingDate && (
                  <span className="text-xs text-gray-400">请选择日期</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 贸易术语 - 全部可选 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> 贸易术语
          </label>
        </div>
        <div className="md:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            {TRADE_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => !readOnly && onTradeTermChange(term)}
                disabled={readOnly}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  tradeTerm === term
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                {term}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowTradeTermsHelp(!showTradeTermsHelp)}
              className="text-sm text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
            >
              贸易术语解释
            </button>
          </div>

          {/* 贸易术语解释 */}
          {showTradeTermsHelp && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div><span className="font-medium">EXW</span> - 工厂交货</div>
                <div><span className="font-medium">FCA</span> - 货交承运人</div>
                <div><span className="font-medium">FAS</span> - 船边交货</div>
                <div><span className="font-medium">FOB</span> - 船上交货</div>
                <div><span className="font-medium">CFR</span> - 成本加运费</div>
                <div><span className="font-medium">CIF</span> - 成本保险费加运费</div>
                <div><span className="font-medium">CPT</span> - 运费付至</div>
                <div><span className="font-medium">CIP</span> - 运费保险费付至</div>
                <div><span className="font-medium">DAT</span> - 运输终端交货</div>
                <div><span className="font-medium">DAP</span> - 目的地交货</div>
                <div><span className="font-medium">DDP</span> - 完税后交货</div>
              </div>
              {/* 贸易术语图片 */}
              <div className="mt-3">
                <img
                  src="/share/trade-terminology.png"
                  alt="贸易术语"
                  className="w-full h-auto rounded border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}