// app/admin/payment/accounts/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AccountForm } from '../../components/AccountForm';
import QRCodeAccountForm from '../../components/QRCodeAccountForm';
import Toast from '@/components/Toast';
import type { CreateAccountInput, PaymentAccount, PaymentMethodType } from '@/lib/payment/types/account';

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 扫码支付方式列表
  const QR_CODE_METHODS: PaymentMethodType[] = ['wechat', 'alipay'];

  useEffect(() => {
    loadAccount();
  }, [id]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payment/accounts/${id}`);
      const data = await res.json();
      if (data.success) {
        setAccount(data.data);
      } else {
        setToast({ message: data.error || '加载失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateAccountInput) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/payment/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setToast({ message: '更新成功', type: 'success' });
        setTimeout(() => router.push('/admin/payment/accounts'), 1000);
      } else {
        setToast({ message: result.error || '更新失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '更新失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-500">账号不存在</div>
      </div>
    );
  }

  // 使用类型守卫判断是否为扫码支付
  const isQRCode = account.payment_method === 'wechat' || account.payment_method === 'alipay';

  const getPageTitle = () => {
    switch (account.payment_method) {
      case 'tt':
        return '编辑T/T银行收款账户';
      case 'wechat':
        return '编辑微信收款账户';
      case 'alipay':
        return '编辑支付宝收款账户';
      default:
        return '编辑收款账户';
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
          initialData={account}
          onSubmit={handleSubmit}
          saving={saving}
        />
      ) : (
        <AccountForm
          initialData={account}
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