// app/[locale]/login/page.tsx
'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

// ============================================================
// 公共样式常量
// ============================================================
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BORDER_TRANSITION = `border-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease), box-shadow var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function LoginPage() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('Login');

  const callback = searchParams.get('callback') || `/${locale}/account`;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const sendCode = async () => {
    if (!email || !email.includes('@')) {
      setError(t('error.emailInvalid'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/account/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
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
        setError(data.error || t('error.sendFailed'));
      }
    } catch {
      setError(t('error.network'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!code || code.length < 6) {
      setError(t('error.codeInvalid'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/account/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        const { token } = await res.json();
        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
        localStorage.setItem('token', token);
        const target = `/${locale}/account`;
        window.location.href = target;
      } else {
        const data = await res.json();
        setError(data.error || t('error.verifyFailed'));
      }
    } catch {
      setError(t('error.network'));
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

  // ============================================================
  // ✅ 登录页专属 CSS 变量
  // ============================================================
  const pageBg = 'var(--account-login-bg, #f9fafb)';
  const cardBg = 'var(--account-login-card-bg, #ffffff)';
  const cardShadow = 'var(--account-login-card-shadow, 0 10px 15px -3px rgb(0 0 0 / 0.1))';
  const cardRadius = 'var(--account-login-card-radius, 0.5rem)';
  const titleColor = 'var(--account-login-title-color, #111827)';
  const subtitleColor = 'var(--account-login-subtitle-color, #6b7280)';
  const inputBg = 'var(--account-login-input-bg, #ffffff)';
  const inputBorder = 'var(--account-login-input-border, #d1d5db)';
  const inputText = 'var(--account-login-input-text, #111827)';
  const inputFocusRing = 'var(--account-login-input-focus-ring, #2563eb)';
  const inputRadius = 'var(--account-login-input-radius, 0.375rem)';
  const primaryBtnBg = 'var(--account-login-primary-btn-bg, #2563eb)';
  const primaryBtnText = 'var(--account-login-primary-btn-text, #ffffff)';
  const primaryBtnHover = 'var(--account-login-primary-btn-hover, #1d4ed8)';
  const successBtnBg = 'var(--account-login-success-btn-bg, #16a34a)';
  const successBtnText = 'var(--account-login-success-btn-text, #ffffff)';
  const successBtnHover = 'var(--account-login-success-btn-hover, #15803d)';
  const errorColor = 'var(--account-login-error-color, #ef4444)';
  const linkColor = 'var(--account-login-link-color, #2563eb)';
  const linkHover = 'var(--account-login-link-hover, #1d4ed8)';
  const termsColor = 'var(--account-login-terms-color, #9ca3af)';

  // 通用样式
  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm, 0.875rem)',
    fontWeight: 'var(--font-weight-medium, 500)',
    color: 'var(--label-color, #374151)',
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${inputBorder}`,
    backgroundColor: inputBg,
    color: inputText,
    borderRadius: inputRadius,
    padding: 'var(--spacing-2, 0.5rem)',
    marginTop: 'var(--spacing-1, 0.25rem)',
    width: '100%',
    transition: BORDER_TRANSITION,
  };

  const buttonStyle = (bg: string, text: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: text,
    paddingTop: 'var(--spacing-2, 0.5rem)',
    paddingBottom: 'var(--spacing-2, 0.5rem)',
    borderRadius: 'var(--radius-md, 0.625rem)',
    width: '100%',
    transition: BG_COLOR_TRANSITION,
  });

  const linkStyle: React.CSSProperties = {
    color: linkColor,
    transition: COLOR_TRANSITION,
    fontSize: 'var(--font-size-sm, 0.875rem)',
  };

  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: pageBg }}
    >
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="max-w-md w-full"
          style={{
            padding: 'var(--spacing-6, 1.5rem)',
            backgroundColor: cardBg,
            boxShadow: cardShadow,
            borderRadius: cardRadius,
          }}
        >
          <h1
            className="text-center"
            style={{
              fontSize: 'var(--font-size-2xl, 1.5rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: titleColor,
              marginBottom: 'var(--spacing-4, 1rem)',
            }}
          >
            {t('title')}
          </h1>
          <p
            className="text-center"
            style={{
              fontSize: 'var(--font-size-sm, 0.875rem)',
              color: subtitleColor,
              marginBottom: 'var(--spacing-5, 1.25rem)',
            }}
          >
            {t('subtitle')}
          </p>

          {step === 'email' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 1rem)' }}>
              <div>
                <label style={labelStyle}>
                  {t('emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="disabled:opacity-50"
                  style={inputStyle}
                  disabled={loading}
                  autoComplete="email"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = inputFocusRing;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${inputFocusRing}33`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = inputBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                onClick={sendCode}
                disabled={loading || !email}
                className="disabled:opacity-50"
                style={buttonStyle(primaryBtnBg, primaryBtnText)}
                onMouseEnter={(e) => {
                  if (!loading && email) {
                    e.currentTarget.style.backgroundColor = primaryBtnHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && email) {
                    e.currentTarget.style.backgroundColor = primaryBtnBg;
                  }
                }}
              >
                {loading ? t('sending') : t('continueButton')}
              </button>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                  color: subtitleColor,
                  marginBottom: 'var(--spacing-3, 0.75rem)',
                }}
              >
                {t('codeSent', { email })}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 1rem)' }}>
                <div>
                  <label style={labelStyle}>
                    {t('codeLabel')}
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('codePlaceholder')}
                    className="disabled:opacity-50"
                    style={inputStyle}
                    disabled={loading}
                    autoComplete="one-time-code"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = inputFocusRing;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${inputFocusRing}33`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = inputBorder;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={goBack}
                    style={linkStyle}
                    disabled={loading}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.color = linkHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.color = linkColor;
                    }}
                  >
                    {t('back')}
                  </button>
                  {countdown > 0 ? (
                    <span style={{ color: subtitleColor, fontSize: 'var(--font-size-sm, 0.875rem)' }}>
                      {t('resendIn', { seconds: countdown })}
                    </span>
                  ) : (
                    <button
                      onClick={sendCode}
                      style={linkStyle}
                      disabled={loading}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.color = linkHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.color = linkColor;
                      }}
                    >
                      {t('resendButton')}
                    </button>
                  )}
                </div>
                <button
                  onClick={verify}
                  disabled={loading || code.length < 6}
                  className="disabled:opacity-50"
                  style={buttonStyle(successBtnBg, successBtnText)}
                  onMouseEnter={(e) => {
                    if (!loading && code.length >= 6) {
                      e.currentTarget.style.backgroundColor = successBtnHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && code.length >= 6) {
                      e.currentTarget.style.backgroundColor = successBtnBg;
                    }
                  }}
                >
                  {loading ? t('verifying') : t('verifyButton')}
                </button>
              </div>
            </>
          )}

          {error && (
            <p
              style={{
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: errorColor,
                marginTop: 'var(--spacing-3, 0.75rem)',
              }}
            >
              {error}
            </p>
          )}
          <p
            className="text-center"
            style={{
              fontSize: 'var(--font-size-xs, 0.75rem)',
              color: termsColor,
              marginTop: 'var(--spacing-4, 1rem)',
            }}
          >
            {t('terms')}
          </p>
        </div>
      </div>
    </div>
  );
}