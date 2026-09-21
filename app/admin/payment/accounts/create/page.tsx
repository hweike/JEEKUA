// app/admin/payment/accounts/create/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AccountForm } from '../components/AccountForm';
import QRCodeAccountForm from '../components/QRCodeAccountForm';
import Toast from '@/components/Toast';
import type { CreateAccountInput, PaymentMethodType } from '@/lib/payment/types/account';

export default function CreateAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  // 安全获取类型，默认为 'tt'
  const type = (typeParam === 'wechat' || typeParam === 'alipay') ? typeParam : 'tt';
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 判断是否为扫码支付
  const isQRCode = type === 'wechat' || type === 'alipay';

  const getPageTitle = () => {
    switch (type) {
      case 'tt':
        return '添加T/T银行收款账户';
      case 'wechat':
        return '添加微信收款账户';
      case 'alipay':
        return '添加支付宝收款账户';
      default:
        return '添加收款账户';
    }
  };

  const handleSubmit = async (data: CreateAccountInput) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/payment/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setToast({ message: '创建成功', type: 'success' });
        setTimeout(() => router.push('/admin/payment/accounts'), 1000);
      } else {
        setToast({ message: result.error || '创建失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '创建失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
      </div>

      {isQRCode ? (
        <QRCodeAccountForm
          initialData={{ payment_method: type as 'wechat' | 'alipay' }}
          onSubmit={handleSubmit}
          saving={saving}
        />
      ) : (
        <AccountForm
          initialData={{ payment_method: 'tt' }}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}

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