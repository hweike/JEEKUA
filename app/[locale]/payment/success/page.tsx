// app/[locale]/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderNo, setOrderNo] = useState<string>('');

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      return;
    }

    // 查询订单状态
    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`/api/payment/paypal/status/${orderId}`);
        const data = await res.json();

        if (data.success && data.data?.orderStatus === 'paid') {
          setStatus('success');
          // 获取订单号
          const orderRes = await fetch(`/api/admin/payment/orders/${orderId}`);
          const orderData = await orderRes.json();
          if (orderData.success) {
            setOrderNo(orderData.data.order_no);
          }
        } else if (data.success && data.data?.orderStatus === 'pending_payment') {
          // 等待 Webhook 处理，3秒后重试
          setTimeout(checkOrderStatus, 3000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        setStatus('error');
      }
    };

    checkOrderStatus();
  }, [orderId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">正在确认支付状态...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-700">支付确认失败</h1>
          <p className="text-gray-500 mt-2">请稍后查看订单状态或联系客服</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800 mt-4">支付成功！</h1>
        {orderNo && (
          <p className="text-gray-600 mt-2">
            订单号: <span className="font-mono font-semibold">{orderNo}</span>
          </p>
        )}
        <p className="text-gray-500 mt-1 text-sm">我们已收到您的付款</p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            返回首页
          </button>
          <button
            onClick={() => router.push('/admin/payment/orders')}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            查看订单
          </button>
        </div>
      </div>
    </div>
  );
}