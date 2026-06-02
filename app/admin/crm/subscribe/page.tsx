'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/crm/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => router.push('/admin/crm'), 1500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">邮件订阅</h1>
        <p className="text-gray-600 mb-6">输入您的邮箱，我们将自动为您创建客户记录（IP 属地自动识别国家）</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-md p-2"
          />
          <button type="submit" disabled={status === 'loading'} className="w-full bg-green-600 text-white py-2 rounded-md disabled:opacity-50">
            {status === 'loading' ? '处理中...' : '订阅'}
          </button>
          {status === 'success' && <p className="text-green-600 text-center">订阅成功！正在跳转客户列表...</p>}
          {status === 'error' && <p className="text-red-600 text-center">订阅失败，请重试。</p>}
        </form>
      </div>
    </div>
  );
}