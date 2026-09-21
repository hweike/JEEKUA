'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { COUNTRIES } from '@/lib/countries';
import { getCustomerProfile, updateCustomerProfile } from '@/lib/account';

export default function ProfilePage() {
  const t = useTranslations('Account.Profile');
  const tShared = useTranslations('Shared');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    country_code: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const locale = useLocale();

  // ============================================================
  // ✅ 个人资料页专属 CSS 变量
  // ============================================================
  const titleColor = 'var(--account-profile-title-color, #111827)';
  const formBg = 'var(--account-profile-form-bg, #ffffff)';
  const formShadow = 'var(--account-profile-form-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))';
  const formRadius = 'var(--account-profile-form-radius, 0.5rem)';
  const inputBorder = 'var(--account-profile-input-border, #d1d5db)';
  const inputBg = 'var(--account-profile-input-bg, #ffffff)';
  const inputText = 'var(--account-profile-input-text, #111827)';
  const inputRadius = 'var(--account-profile-input-radius, 0.25rem)';
  const emailBg = 'var(--account-profile-email-bg, #f3f4f6)';
  const emailText = 'var(--account-profile-email-text, #374151)';
  const emailNote = 'var(--account-profile-email-note, #6b7280)';
  const labelColor = 'var(--account-label-color, #374151)';
  const cancelBorder = 'var(--account-profile-cancel-border, #d1d5db)';
  const cancelHover = 'var(--account-profile-cancel-hover, #f9fafb)';
  const saveBg = 'var(--account-profile-save-bg, #2563eb)';
  const saveText = 'var(--account-profile-save-text, #ffffff)';
  const saveHover = 'var(--account-profile-save-hover, #1d4ed8)';
  const dividerColor = 'var(--account-divider, #e5e7eb)';

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getCustomerProfile();
      if (data) {
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          country_code: data.country_code || '',
        });
      } else {
        router.push(`/${locale}/login`);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await updateCustomerProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      country_code: form.country_code,
    });
    setSaving(false);
    if (success) {
      router.push(`/${locale}/account`);
    } else {
      alert(tShared('updateFailed'));
    }
  };

  if (loading) return <div className="text-center py-12">{tShared('loading')}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: titleColor }}>
        {t('title')}
      </h1>
      <form
        onSubmit={handleSubmit}
        className="p-6 space-y-4"
        style={{
          backgroundColor: formBg,
          boxShadow: formShadow,
          borderRadius: formRadius,
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" style={{ color: labelColor }}>
              {t('firstName')}
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="mt-1 w-full p-2"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: inputRadius,
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" style={{ color: labelColor }}>
              {t('lastName')}
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="mt-1 w-full p-2"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: inputRadius,
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium" style={{ color: labelColor }}>
            {tShared('email')}
          </label>
          <div
            className="mt-1 w-full p-2"
            style={{
              backgroundColor: emailBg,
              color: emailText,
              borderRadius: inputRadius,
              border: `1px solid ${inputBorder}`,
            }}
          >
            {form.email}
          </div>
          <p className="text-xs mt-1" style={{ color: emailNote }}>
            {t('emailNote')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium" style={{ color: labelColor }}>
            {t('country')}
          </label>
          <select
            value={form.country_code}
            onChange={(e) => setForm({ ...form, country_code: e.target.value })}
            className="mt-1 w-full p-2"
            style={{
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: inputText,
              borderRadius: inputRadius,
            }}
          >
            <option value="">{t('selectCountry')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: `1px solid ${dividerColor}` }}>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/account`)}
            className="px-4 py-2 rounded transition-colors"
            style={{
              border: `1px solid ${cancelBorder}`,
              backgroundColor: 'transparent',
              color: labelColor,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = cancelHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {tShared('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: saveBg,
              color: saveText,
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.backgroundColor = saveHover;
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.backgroundColor = saveBg;
            }}
          >
            {saving ? tShared('saving') : tShared('save')}
          </button>
        </div>
      </form>
    </div>
  );
}