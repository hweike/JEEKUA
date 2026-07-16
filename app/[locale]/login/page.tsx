'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const callback = searchParams.get('callback') || `/${locale}/account`;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 发送验证码（不再区分登录/注册，统一发送）
  const sendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/account/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }), // 不再传 type
      });
      if (res.ok) {
        setStep('code');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) clearInterval(timer);
            return prev - 1;
          });
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error || '发送失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 验证码验证（自动判断登录或注册）
  const verify = async () => {
    if (!code || code.length < 6) {
      setError('请输入6位验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/account/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }), // 不再传 type
      });
      if (res.ok) {
        const { token } = await res.json();
        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
        router.push(callback);
      } else {
        const data = await res.json();
        setError(data.error || '验证失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('email');
    setError('');
    setCode('');
    setCountdown(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Sign in or create an account
        </p>
        {step === 'email' ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 w-full border rounded-md p-2"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <button
                onClick={sendCode}
                disabled={loading || !email}
                className="w-full bg-blue-600 text-white py-2 rounded-md disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Continue with email'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">
              We sent a verification code to <span className="font-medium">{email}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Verification code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  className="mt-1 w-full border rounded-md p-2"
                  disabled={loading}
                  autoComplete="one-time-code"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={goBack}
                  className="text-blue-600 hover:underline"
                  disabled={loading}
                >
                  Back
                </button>
                {countdown > 0 && (
                  <span className="text-gray-500">Resend in {countdown}s</span>
                )}
                {countdown === 0 && (
                  <button
                    onClick={sendCode}
                    className="text-blue-600 hover:underline"
                    disabled={loading}
                  >
                    Resend code
                  </button>
                )}
              </div>
              <button
                onClick={verify}
                disabled={loading || code.length < 6}
                className="w-full bg-green-600 text-white py-2 rounded-md disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Sign in / Create account'}
              </button>
            </div>
          </>
        )}
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        <p className="text-xs text-gray-400 mt-6 text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}