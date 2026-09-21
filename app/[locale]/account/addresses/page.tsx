'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, CheckCircle, X } from 'lucide-react';
import { getAddresses, deleteAddress, createAddress, updateAddress } from '@/lib/account';
import { COUNTRIES, getCountryNameEn, getPhoneCode } from '@/lib/countries';
import type { Address } from '@/lib/CRM/types';

// ---------- 地址表单组件 ----------
function AddressForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: Partial<Address>;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('Account.Addresses');
  const tShared = useTranslations('Shared');

  const getInitialPhoneParts = (phone: string | undefined, countryCode: string) => {
    if (!phone) {
      const country = COUNTRIES.find(c => c.code === countryCode);
      return { prefix: country?.phoneCode || '+86', number: '' };
    }
    for (const c of COUNTRIES) {
      if (phone.startsWith(c.phoneCode)) {
        return { prefix: c.phoneCode, number: phone.slice(c.phoneCode.length) };
      }
    }
    const defaultCountry = COUNTRIES.find(c => c.code === countryCode);
    return { prefix: defaultCountry?.phoneCode || '+86', number: phone };
  };

  const initialCountryCode = initialData?.country_code || 'US';
  const initialParts = getInitialPhoneParts(initialData?.phone, initialCountryCode);

  const [phonePrefix, setPhonePrefix] = useState(initialParts.prefix);
  const [phoneNumber, setPhoneNumber] = useState(initialParts.number);

  const [formData, setFormData] = useState({
    country_code: initialCountryCode,
    first_name: initialData?.recipient?.split(' ')[0] || '',
    last_name: initialData?.recipient?.split(' ').slice(1).join(' ') || '',
    company: initialData?.company || '',
    address1: initialData?.detail || '',
    address2: '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    postal_code: '',
    isDefault: initialData?.isDefault || false,
  });

  useEffect(() => {
    const country = COUNTRIES.find(c => c.code === formData.country_code);
    if (country) setPhonePrefix(country.phoneCode);
  }, [formData.country_code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = `${formData.first_name} ${formData.last_name}`.trim();
    const detail = [formData.address1, formData.address2].filter(Boolean).join(', ');
    const payload = {
      recipient: recipient || initialData?.recipient || '',
      phone: phonePrefix + phoneNumber,
      country_code: formData.country_code,
      province: formData.province,
      city: formData.city,
      detail: detail || initialData?.detail || '',
      company: formData.company,
      isDefault: formData.isDefault,
    };
    if (!payload.recipient || !payload.phone || !payload.detail || !payload.city || !payload.province) {
      alert(t('form.fillAllFields'));
      return;
    }
    onSave(payload);
  };

  const sortedCountries = [...COUNTRIES].sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  // ============================================================
  // ✅ 地址管理表单 CSS 变量
  // ============================================================
  const formBg = 'var(--account-address-form-bg, #ffffff)';
  const formShadow = 'var(--account-address-form-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))';
  const formRadius = 'var(--account-address-form-radius, 0.5rem)';
  const formTitle = 'var(--account-address-form-title, #111827)';
  const labelColor = 'var(--account-address-form-label, #374151)';
  const inputBorder = 'var(--account-address-form-input-border, #d1d5db)';
  const inputBg = 'var(--account-address-form-input-bg, #ffffff)';
  const inputText = 'var(--account-address-form-input-text, #111827)';
  const prefixBg = 'var(--account-address-form-phone-prefix-bg, #f9fafb)';
  const prefixText = 'var(--account-address-form-phone-prefix-text, #374151)';
  const cancelBorder = 'var(--account-address-form-cancel-border, #d1d5db)';
  const cancelHover = 'var(--account-address-form-cancel-hover, #f9fafb)';
  const saveBg = 'var(--account-address-form-save-bg, #2563eb)';
  const saveText = 'var(--account-address-form-save-text, #ffffff)';
  const saveHover = 'var(--account-address-form-save-hover, #1d4ed8)';

  return (
    <div
      className="p-6"
      style={{
        backgroundColor: formBg,
        boxShadow: formShadow,
        borderRadius: formRadius,
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: formTitle }}>
          {initialData?.id ? t('editTitle') : t('addTitle')}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.country')}
          </label>
          <select
            value={formData.country_code}
            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
            className="flex-1 px-3 py-2 text-sm"
            style={{
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: inputText,
              borderRadius: '0.25rem',
            }}
            required
          >
            {sortedCountries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn} ({c.phoneCode})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.fullName')}
          </span>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={t('form.firstName')}
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="px-3 py-2 text-sm"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: '0.25rem',
              }}
              required
            />
            <input
              type="text"
              placeholder={t('form.lastName')}
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="px-3 py-2 text-sm"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: '0.25rem',
              }}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.company')}
          </label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="flex-1 px-3 py-2 text-sm"
            style={{
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: inputText,
              borderRadius: '0.25rem',
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.fullAddress')}
          </label>
          <input
            type="text"
            value={formData.address1}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            className="flex-1 px-3 py-2 text-sm"
            style={{
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: inputText,
              borderRadius: '0.25rem',
            }}
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.apartment')}
          </label>
          <input
            type="text"
            value={formData.address2}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
            className="flex-1 px-3 py-2 text-sm"
            style={{
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: inputText,
              borderRadius: '0.25rem',
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
              {t('form.city')}
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 text-sm"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: '0.25rem',
              }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
              {t('form.province')}
            </label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="w-full px-3 py-2 text-sm"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: '0.25rem',
              }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: labelColor }}>
              {t('form.postalCode')}
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              className="w-full px-3 py-2 text-sm"
              style={{
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                borderRadius: '0.25rem',
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.phone')}
          </label>
          <div className="flex-1 flex gap-2">
            <span
              className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l text-sm whitespace-nowrap"
              style={{
                backgroundColor: prefixBg,
                color: prefixText,
                borderColor: inputBorder,
              }}
            >
              {phonePrefix}
            </span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{
                border: `1px solid ${inputBorder}`,
                borderLeft: 'none',
                borderRadius: '0 0.25rem 0.25rem 0',
                backgroundColor: inputBg,
                color: inputText,
                '--tw-ring-color': inputBorder,
              } as React.CSSProperties}
              placeholder={t('form.phonePlaceholder')}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium flex-shrink-0" style={{ color: labelColor }}>
            {t('form.defaultCheckbox')}
          </label>
          <div className="flex-1 flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_default" className="text-sm" style={{ color: labelColor }}>
              {t('form.setDefault')}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded transition-colors"
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
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              backgroundColor: saveBg,
              color: saveText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = saveHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = saveBg;
            }}
          >
            {tShared('save')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- 地址管理主页面 ----------
export default function AddressesPage() {
  const t = useTranslations('Account.Addresses');
  const tShared = useTranslations('Shared');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);

  // ============================================================
  // ✅ 地址管理页 CSS 变量
  // ============================================================
  const pageBg = 'var(--account-address-page-bg, #ffffff)';
  const pageText = 'var(--account-address-page-text, #111827)';
  const cardBg = 'var(--account-card-bg, #ffffff)';
  const cardShadow = 'var(--account-card-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))';
  const cardRadius = 'var(--account-card-radius, 0.5rem)';
  const labelColor = 'var(--account-label-color, #6b7280)';
  const valueColor = 'var(--account-value-color, #111827)';
  const addrCardBg = 'var(--account-address-card-bg, #ffffff)';
  const addrCardShadow = 'var(--account-address-card-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))';
  const addrBorder = 'var(--account-address-border, #e5e7eb)';
  const addrRadius = 'var(--account-address-radius, 0.5rem)';
  const badgeBg = 'var(--account-default-badge-bg, #dcfce7)';
  const badgeText = 'var(--account-default-badge-text, #166534)';
  const primaryBtnBg = 'var(--account-primary-btn-bg, #2563eb)';
  const primaryBtnText = 'var(--account-primary-btn-text, #ffffff)';
  const primaryBtnHover = 'var(--account-primary-btn-hover, #1d4ed8)';
  const actionIconColor = 'var(--account-action-icon-color, #6b7280)';
  const dangerColor = 'var(--account-danger-color, #dc2626)';
  const linkColor = 'var(--account-link-color, #2563eb)';
  const linkHover = 'var(--account-link-hover, #1d4ed8)';
  const emptyText = 'var(--account-empty-text, #6b7280)';

  const fetchAddresses = async () => {
    const data = await getAddresses();
    setAddresses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddForm = () => {
    setEditingAddress({ country_code: 'US' } as Address);
  };

  const openEditForm = (addr: Address) => {
    setEditingAddress(addr);
  };

  const handleSaveAddress = async (data: any) => {
    setSaving(true);
    let result;
    if (editingAddress?.id) {
      result = await updateAddress(editingAddress.id, data);
    } else {
      result = await createAddress(data);
    }
    setSaving(false);
    if (result) {
      setEditingAddress(null);
      fetchAddresses();
    } else {
      alert(t('saveFailed'));
    }
  };

  const handleCancel = () => {
    setEditingAddress(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('deleteConfirm'))) {
      const success = await deleteAddress(id);
      if (success) fetchAddresses();
    }
  };

  const handleSetDefault = async (id: number) => {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;
    const result = await updateAddress(id, { ...addr, isDefault: true });
    if (result) fetchAddresses();
  };

  if (loading) return <div className="text-center py-12">{tShared('loading')}</div>;

  return (
    <div style={{ backgroundColor: pageBg, color: pageText }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: pageText }}>
          {t('title')}
        </h1>
        {!editingAddress && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              backgroundColor: primaryBtnBg,
              color: primaryBtnText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = primaryBtnHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = primaryBtnBg;
            }}
          >
            <Plus size={16} /> {t('addButton')}
          </button>
        )}
      </div>

      {editingAddress ? (
        <AddressForm
          initialData={editingAddress.id ? editingAddress : {}}
          onSave={handleSaveAddress}
          onCancel={handleCancel}
        />
      ) : (
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div
              className="p-8 text-center"
              style={{
                backgroundColor: cardBg,
                boxShadow: cardShadow,
                borderRadius: cardRadius,
                color: emptyText,
              }}
            >
              {t('noAddresses')}
            </div>
          ) : (
            addresses.map((addr) => {
              const countryName = addr.country_code ? getCountryNameEn(addr.country_code) : '';
              return (
                <div
                  key={addr.id}
                  className="p-4 flex justify-between items-start"
                  style={{
                    backgroundColor: addrCardBg,
                    boxShadow: addrCardShadow,
                    borderRadius: addrRadius,
                    border: `1px solid ${addrBorder}`,
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: valueColor }}>
                        {addr.recipient}
                      </span>
                      {addr.isDefault && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: badgeBg,
                            color: badgeText,
                          }}
                        >
                          {t('defaultBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-1" style={{ color: labelColor }}>
                      {addr.company && `${addr.company}, `}{addr.phone}
                    </div>
                    <div className="text-sm" style={{ color: labelColor }}>
                      {addr.detail}, {addr.city}, {addr.province}, {countryName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="transition-colors"
                        style={{ color: linkColor }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = linkHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = linkColor; }}
                        title={t('setDefault')}
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(addr)}
                      className="transition-colors"
                      style={{ color: actionIconColor }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = linkColor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = actionIconColor; }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="transition-colors"
                      style={{ color: actionIconColor }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = dangerColor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = actionIconColor; }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}