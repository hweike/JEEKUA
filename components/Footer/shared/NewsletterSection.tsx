'use client';

import { useState } from 'react';

interface NewsletterSectionProps {
  title: string;
  subtitle: string;
}

// ============================================================
// 公共样式常量
// ============================================================
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BORDER_TRANSITION = `border-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease), box-shadow var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function NewsletterSection({ title, subtitle }: NewsletterSectionProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('Thank you for subscribing!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    } finally {
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  // ✅ 输入框样式
  const inputStyle: React.CSSProperties = {
    width: '100%',
    paddingLeft: 'var(--spacing-4, 1rem)',
    paddingRight: 'var(--spacing-4, 1rem)',
    paddingTop: 'var(--spacing-2, 0.5rem)',
    paddingBottom: 'var(--spacing-2, 0.5rem)',
    borderRadius: 'var(--radius-full, 9999px)',
    border: '1px solid var(--input, #e2e8f0)',
    backgroundColor: 'var(--background, #ffffff)',
    color: 'var(--foreground, #0f172a)',
    fontSize: 'var(--font-size-base, 1rem)',
    outline: 'none',
    transition: BORDER_TRANSITION,
  };

  // ✅ 按钮样式
  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 'var(--spacing-6, 1.5rem)',
    paddingRight: 'var(--spacing-6, 1.5rem)',
    paddingTop: 'var(--spacing-2, 0.5rem)',
    paddingBottom: 'var(--spacing-2, 0.5rem)',
    borderRadius: 'var(--radius-full, 9999px)',
    backgroundColor: 'var(--primary, #1e293b)',
    color: 'var(--primary-foreground, #f8fafc)',
    fontSize: 'var(--font-size-base, 1rem)',
    fontWeight: 'var(--font-weight-medium, 500)',
    gap: 'var(--spacing-2, 0.5rem)',
    whiteSpace: 'nowrap',
    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
    opacity: status === 'loading' ? 0.5 : 1,
    border: 'none',
    transition: BG_COLOR_TRANSITION,
  };

  return (
    // ✅ 已移除独立背景色，继承 footer 的 --footer-bg，整页背景统一
    <div>
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        style={{
          paddingTop: 'var(--spacing-12, 3rem)',
          paddingBottom: 'var(--spacing-12, 3rem)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h2
            style={{
              fontSize: 'var(--font-size-4xl, 2.25rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              marginBottom: 'var(--spacing-2, 0.5rem)',
              color: 'var(--footer-text, var(--foreground, #0f172a))',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: 'var(--font-size-lg, 1.125rem)',
                color: 'var(--muted-foreground, #64748b)',
                marginBottom: 'var(--spacing-6, 1.5rem)',
              }}
            >
              {subtitle}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex flex-row items-center justify-center"
            style={{ gap: 'var(--spacing-3, 0.75rem)' }}
          >
            <div className="flex-1 min-w-0" style={{ maxWidth: '28rem' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                disabled={status === 'loading'}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary, #1e293b)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary, #1e293b)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input, #e2e8f0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              style={buttonStyle}
              onMouseEnter={(e) => {
                if (status !== 'loading') {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--primary, #1e293b) 90%, transparent)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary, #1e293b)';
              }}
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          {message && (
            <p
              style={{
                marginTop: 'var(--spacing-3, 0.75rem)',
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: status === 'success'
                  ? 'var(--notification-success, #16a34a)'
                  : 'var(--notification-error, #dc2626)',
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}