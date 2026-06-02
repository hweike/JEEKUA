'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface Tier {
  min_qty: number;
  price: number;
}

interface PriceTiersInputProps {
  value?: Tier[];
  onChange: (tiers: Tier[]) => void;
  currency: string;
}

export function PriceTiersInput({ value = [], onChange, currency }: PriceTiersInputProps) {
  const [minQtyInputs, setMinQtyInputs] = useState<string[]>([]);
  const [priceInputs, setPriceInputs] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ minQty?: string; price?: string; global?: string }[]>([]);

  // 同步外部 value 到内部输入字符串
  useEffect(() => {
    setMinQtyInputs(value.map(t => (t.min_qty === 0 ? '' : t.min_qty.toString())));
    setPriceInputs(value.map(t => (t.price === 0 ? '' : t.price.toString())));
    setErrors(value.map(() => ({})));
  }, [value]);

  // 校验单个起订量格式
  const validateMinQtyFormat = (val: string): { valid: boolean; value: number | null; error?: string } => {
    const trimmed = val.trim();
    if (trimmed === '') {
      return { valid: false, value: null, error: '请输入1-99999的整数' };
    }
    if (!/^\d+$/.test(trimmed)) {
      return { valid: false, value: null, error: '请输入1-99999的整数' };
    }
    const num = parseInt(trimmed, 10);
    if (num < 1 || num > 99999) {
      return { valid: false, value: null, error: '请输入1-99999的整数' };
    }
    return { valid: true, value: num, error: undefined };
  };

  // 校验单个单价格式
  const validatePriceFormat = (val: string): { valid: boolean; value: number | null; error?: string } => {
    const trimmed = val.trim();
    if (trimmed === '') {
      return { valid: false, value: null, error: '请输入0.01-999999999.99的数值，最多两位小数' };
    }
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return { valid: false, value: null, error: '请输入0.01-999999999.99的数值，最多两位小数' };
    }
    const num = parseFloat(trimmed);
    if (num < 0.01 || num > 999999999.99) {
      return { valid: false, value: null, error: '请输入0.01-999999999.99的数值' };
    }
    return { valid: true, value: Math.round(num * 100) / 100, error: undefined };
  };

  // 整体校验（起订量递增、价格递减）
  const validateGlobal = (tiers: Tier[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const validTiers = tiers.filter(t => t.min_qty > 0 && t.price > 0);
    for (let i = 0; i < validTiers.length - 1; i++) {
      const current = validTiers[i];
      const next = validTiers[i + 1];
      // 起订量校验：后一个必须大于前一个
      if (next.min_qty <= current.min_qty) {
        errors.push(`起订量必须递增：第${i+2}档起订量 (${next.min_qty}) 应大于第${i+1}档 (${current.min_qty})`);
      }
      // 价格校验：后一个必须小于前一个
      if (next.price >= current.price) {
        errors.push(`价格必须递减：第${i+2}档价格 (${next.price}) 应小于第${i+1}档 (${current.price})`);
      }
    }
    return { valid: errors.length === 0, errors };
  };

  // 提交有效数据到父组件（排序+分离无效）
  const commitToParent = (newTiers: Tier[]) => {
    const valid = newTiers.filter(t => t.min_qty > 0 && t.price > 0);
    const invalid = newTiers.filter(t => t.min_qty === 0 || t.price === 0);
    valid.sort((a, b) => a.min_qty - b.min_qty);
    const sorted = [...valid, ...invalid];
    onChange(sorted);
  };

  // 失焦处理：校验并保存
  const handleBlur = (index: number) => {
    const rawMin = minQtyInputs[index] || '';
    const rawPrice = priceInputs[index] || '';
    const minValid = validateMinQtyFormat(rawMin);
    const priceValid = validatePriceFormat(rawPrice);

    const newErrors = [...errors];
    newErrors[index] = {};

    let newMinQty = 0;
    let newPrice = 0;
    if (minValid.valid) newMinQty = minValid.value!;
    else newErrors[index].minQty = minValid.error;
    if (priceValid.valid) newPrice = priceValid.value!;
    else newErrors[index].price = priceValid.error;

    const newTiers = [...value];
    newTiers[index] = { min_qty: newMinQty, price: newPrice };
    setErrors(newErrors);

    if (minValid.valid && priceValid.valid) {
      const global = validateGlobal(newTiers);
      if (!global.valid) {
        newErrors[index].global = global.errors.join('；');
        setErrors(newErrors);
        return;
      }
    } else {
      // 字段无效时不提交，但清除全局错误
      if (newErrors[index].global) delete newErrors[index].global;
      setErrors(newErrors);
      return;
    }

    // 全部有效，提交
    commitToParent(newTiers);
  };

  const handleMinQtyChange = (index: number, raw: string) => {
    const filtered = raw.replace(/[^0-9]/g, '');
    const newInputs = [...minQtyInputs];
    newInputs[index] = filtered;
    setMinQtyInputs(newInputs);
    const newErrors = [...errors];
    delete newErrors[index]?.minQty;
    delete newErrors[index]?.global;
    setErrors(newErrors);
  };

  const handlePriceChange = (index: number, raw: string) => {
    let filtered = raw.replace(/[^0-9.]/g, '');
    const parts = filtered.split('.');
    if (parts.length > 2) filtered = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) filtered = parts[0] + '.' + parts[1].slice(0, 2);
    const newInputs = [...priceInputs];
    newInputs[index] = filtered;
    setPriceInputs(newInputs);
    const newErrors = [...errors];
    delete newErrors[index]?.price;
    delete newErrors[index]?.global;
    setErrors(newErrors);
  };

  const addTier = () => {
    const newTiers = [...value, { min_qty: 0, price: 0 }];
    commitToParent(newTiers);
  };

  const removeTier = (index: number) => {
    const newTiers = value.filter((_, i) => i !== index);
    commitToParent(newTiers);
  };

  return (
    <div className="space-y-4 w-full">
      {/* 移除了 min-w-[600px] 和 overflow-x-auto */}
      <div className="w-full">
        <div className="grid grid-cols-[2fr_2fr_1fr] gap-2 sm:gap-4 items-start">
          {/* 表头 */}
          <div className="text-xs sm:text-sm font-medium text-gray-700 pb-2 border-b border-gray-200">
            <span className="text-red-500">*</span> 最小起订量
            <span className="text-xs text-gray-400 ml-1">(件)</span>
          </div>
          <div className="text-xs sm:text-sm font-medium text-gray-700 pb-2 border-b border-gray-200">
            <span className="text-red-500">*</span> 单价
          </div>
          <div className="text-xs sm:text-sm font-medium text-gray-700 pb-2 border-b border-gray-200 text-center">
            操作
          </div>

          {value.map((tier, idx) => (
            <React.Fragment key={idx}>
              {/* 最小起订量 */}
              <div className="py-1 sm:py-2">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-l-md border border-r-0 bg-gray-100 text-gray-600 text-xs sm:text-sm">
                      ≥
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minQtyInputs[idx] || ''}
                      onChange={(e) => handleMinQtyChange(idx, e.target.value)}
                      onBlur={() => handleBlur(idx)}
                      className={`border rounded-r-md px-1 sm:px-2 py-1 w-full min-w-0 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${
                        errors[idx]?.minQty ? 'border-red-500' : ''
                      }`}
                      placeholder="请输入"
                    />
                  </div>
                  {errors[idx]?.minQty && (
                    <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors[idx].minQty}
                    </div>
                  )}
                </div>
              </div>

              {/* 单价 */}
              <div className="py-1 sm:py-2">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-l-md border border-r-0 bg-gray-100 text-gray-600 text-xs sm:text-sm">
                      {currency}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={priceInputs[idx] || ''}
                      onChange={(e) => handlePriceChange(idx, e.target.value)}
                      onBlur={() => handleBlur(idx)}
                      className={`border rounded-r-md px-1 sm:px-2 py-1 w-full min-w-0 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${
                        errors[idx]?.price ? 'border-red-500' : ''
                      }`}
                      placeholder="输入价格"
                    />
                  </div>
                  {errors[idx]?.price && (
                    <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors[idx].price}
                    </div>
                  )}
                </div>
              </div>

              {/* 删除按钮 */}
              <div className="py-1 sm:py-2 text-center">
                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                >
                  删除
                </button>
              </div>

              {/* 全局错误信息（横跨三列） */}
              {errors[idx]?.global && (
                <div className="col-span-3 -mt-1 mb-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors[idx].global}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {value.length < 10 && (
        <button
          type="button"
          onClick={addTier}
          className="text-blue-600 text-sm inline-flex items-center gap-1 hover:underline"
        >
          <Plus size={14} /> 添加阶梯价格
        </button>
      )}

      <div className="text-xs text-gray-400">
        阶梯价格将按最小起订量升序自动排列。起订量必须严格递增，价格必须严格递减。
      </div>
    </div>
  );
}