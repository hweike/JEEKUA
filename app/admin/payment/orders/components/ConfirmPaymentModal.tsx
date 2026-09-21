// app/admin/payment/orders/components/ConfirmPaymentModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { depositAmount: number; depositPercent: number }) => void;
  totalAmount: number;
  currency: string;
  loading?: boolean;
  paidAmount?: number;  // ✅ 已支付的预付款金额
  orderStatus?: string; // ✅ 订单状态
}

const DEPOSIT_PERCENT_OPTIONS = [
  { label: '30%', value: 30 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '100%', value: 100 },
];

export default function ConfirmPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  currency,
  loading = false,
  paidAmount = 0,
  orderStatus = 'formal',
}: ConfirmPaymentModalProps) {
  // ✅ 计算剩余尾款
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  
  // ✅ 状态
  const [depositPercent, setDepositPercent] = useState<number | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // ✅ 判断是否已付全款
  const isFullyPaid = paidAmount >= totalAmount;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ✅ 打开弹窗时重置，默认设置为尾款金额
  useEffect(() => {
    if (isOpen) {
      // 如果已付全款，不能继续收款
      if (isFullyPaid) {
        setDepositAmount(0);
        setDepositAmountInput('');
        setDepositPercent(null);
        return;
      }
      
      // 如果有剩余尾款，默认设置为尾款金额
      if (remainingAmount > 0) {
        setDepositAmount(remainingAmount);
        setDepositAmountInput(remainingAmount.toString());
        const percent = Math.round((remainingAmount / totalAmount) * 100);
        const matched = DEPOSIT_PERCENT_OPTIONS.find(opt => opt.value === percent);
        setDepositPercent(matched ? percent : null);
      } else {
        setDepositPercent(null);
        setDepositAmountInput('');
        setDepositAmount(0);
      }
    }
  }, [isOpen, totalAmount, remainingAmount, isFullyPaid]);

  const handlePercentChange = (percent: number) => {
    setDepositPercent(percent);
    const amount = totalAmount * (percent / 100);
    // 不能超过剩余尾款
    const finalAmount = Math.min(amount, remainingAmount);
    setDepositAmount(finalAmount);
    setDepositAmountInput(finalAmount.toString());
  };

  // ✅ 处理金额输入
  const handleAmountChange = (value: string) => {
    if (value === '') {
      setDepositAmountInput('');
      setDepositAmount(0);
      setDepositPercent(null);
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= remainingAmount) {
      setDepositAmountInput(value);
      setDepositAmount(num);
      
      if (num === 0) {
        setDepositPercent(null);
      } else {
        const percent = Math.round((num / totalAmount) * 100);
        const matched = DEPOSIT_PERCENT_OPTIONS.find(opt => opt.value === percent);
        setDepositPercent(matched ? percent : null);
      }
    }
  };

  const handleBlur = () => {
    if (depositAmountInput === '') {
      setDepositAmountInput('0');
      setDepositAmount(0);
    }
  };

  const isPercentSelected = (percent: number) => {
    return depositPercent === percent;
  };

  const isPercentDisabled = (percent: number) => {
    const amount = totalAmount * (percent / 100);
    return amount > remainingAmount || isFullyPaid;
  };

  if (!mounted || !isOpen) return null;

  // ✅ 已付全款时显示提示
  if (isFullyPaid) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">确认收款</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-600">该订单已付全款</p>
            <p className="text-sm text-gray-400 mt-1">
              已付金额: {currency} {paidAmount.toFixed(2)} / 总金额: {currency} {totalAmount.toFixed(2)}
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {paidAmount > 0 ? '继续收款' : '确认收款'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* ✅ 总金额 */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">总金额</span>
            <span className="font-bold text-lg">
              {currency} {totalAmount.toFixed(2)}
            </span>
          </div>

          {/* ✅ 已付金额 */}
          {paidAmount > 0 && (
            <div className="flex justify-between items-center py-1 text-sm">
              <span className="text-gray-500">已付金额</span>
              <span className="text-green-600 font-medium">
                {currency} {paidAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* ✅ 剩余尾款 */}
          {remainingAmount > 0 && (
            <div className="flex justify-between items-center py-1 text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">剩余尾款</span>
              <span className="font-medium text-blue-600">
                {currency} {remainingAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* ✅ 本次收款金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {paidAmount > 0 ? '本次收款金额' : '预付款金额'}
            </label>
            {paidAmount > 0 && (
              <p className="text-xs text-gray-400 mb-2">
                本次将收取剩余尾款 {currency} {remainingAmount.toFixed(2)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {DEPOSIT_PERCENT_OPTIONS.map((opt) => {
                const disabled = isPercentDisabled(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !disabled && handlePercentChange(opt.value)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      isPercentSelected(opt.value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : disabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {currency}
                </span>
                <input
                  type="text"
                  value={depositAmountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="0.00"
                  className="w-full pl-12 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap min-w-[50px]">
                {depositPercent !== null ? `(${depositPercent}%)` : ''}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              可收尾款上限: {currency} {remainingAmount.toFixed(2)}
            </p>
          </div>

          {/* ✅ 本次收款金额汇总 */}
          <div className="flex justify-between items-center py-2 border-t border-gray-100">
            <span className="text-gray-600">本次确认收款</span>
            <span className="font-bold text-green-600">
              {currency} {depositAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ depositAmount, depositPercent: depositPercent || 0 })}
            disabled={loading || depositAmount <= 0 || remainingAmount <= 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                处理中...
              </>
            ) : (
              `确认收款 ${depositAmount > 0 ? `(${currency} ${depositAmount.toFixed(2)})` : ''}`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}