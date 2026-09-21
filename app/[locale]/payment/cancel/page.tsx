// app/[locale]/payment/cancel/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <XCircle className="w-20 h-20 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800 mt-4">支付已取消</h1>
        <p className="text-gray-600 mt-2">您已取消支付，订单仍然有效</p>
        {orderId && (
          <p className="text-gray-500 mt-1 text-sm">
            订单号: <span className="font-mono">{orderId}</span>
          </p>
        )}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push(`/admin/payment/orders/${orderId}`)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            返回订单
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}