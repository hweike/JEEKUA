'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Pencil, Trash2, CheckCircle, Plus, X } from 'lucide-react';
import { COUNTRIES, getCountryNameEn } from '@/lib/countries';
import { getCustomerProfile, getAddresses, createAddress, updateAddress, deleteAddress, updateMarketingPreference } from '@/lib/account';
import type { Address } from '@/lib/CRM/types';

// ---------- 地址表单组件（含区号自动切换） ----------
function AddressForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: Partial<Address>;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  // 解析电话号码
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

  const initialCountryCode = initialData?.country_code || 'CN';
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
    is_default: initialData?.is_default || false,
  });

  useEffect(() => {
    const country = COUNTRIES.find(c => c.code === formData.country_code);
    if (country) {
      setPhonePrefix(country.phoneCode);
    }
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
      is_default: formData.is_default,
    };
    if (!payload.recipient || !payload.phone || !payload.detail || !payload.city || !payload.province) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(payload);
  };

  const sortedCountries = [...COUNTRIES].sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Country/region *</label>
        <select
          value={formData.country_code}
          onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          required
        >
          {sortedCountries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.nameEn} ({c.phoneCode})
            </option>
          ))}
        </select>
      </div>

      {/* First name & Last name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">First name *</label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last name *</label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Company</label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Full address */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Full address *</label>
        <input
          type="text"
          value={formData.address1}
          onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          required
        />
      </div>

      {/* Apartment, suite, etc */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Apartment, suite, etc (optional)</label>
        <input
          type="text"
          value={formData.address2}
          onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* City, Province, Postal code */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">City *</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Province *</label>
          <input
            type="text"
            value={formData.province}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Postal code</label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Phone (区号 + 号码) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone *</label>
        <div className="flex mt-1">
          <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l bg-gray-50 text-sm text-gray-700 whitespace-nowrap">
            {phonePrefix}
          </span>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="flex-1 border rounded-r px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter local number"
            required
          />
        </div>
      </div>

      {/* Default address */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
        />
        <label htmlFor="is_default" className="text-sm text-gray-700">This is my default address</label>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          Save
        </button>
      </div>
    </form>
  );
}

// ---------- Profile 主页面 ----------
export default function AccountPage() {
  const router = useRouter();
  const locale = useLocale();

  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = async () => {
    try {
      const userData = await getCustomerProfile();
      if (!userData) {
        router.push(`/${locale}/login`);
        return;
      }
      setUser(userData);
      setIsSubscribed(userData.email_subscribed === '已订阅');

      const addrData = await getAddresses();
      setAddresses(addrData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveAddress = async (data: any) => {
    let result;
    if (editingAddress) {
      result = await updateAddress(editingAddress.id, data);
    } else {
      result = await createAddress(data);
    }
    if (result) {
      setShowAddressForm(false);
      setEditingAddress(null);
      fetchData();
    } else {
      alert('Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    const success = await deleteAddress(id);
    if (success) fetchData();
  };

  const handleSetDefault = async (id: number) => {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;
    const data = { ...addr, is_default: true };
    const result = await updateAddress(id, data);
    if (result) fetchData();
  };

  const toggleSubscription = async () => {
    if (toggling) return;
    setToggling(true);
    const newState = !isSubscribed;
    const success = await updateMarketingPreference(newState);
    if (success) {
      setIsSubscribed(newState);
      // 更新用户信息缓存（可选）
      if (user) user.email_subscribed = newState ? '已订阅' : '未订阅';
    } else {
      alert('Failed to update preference');
    }
    setToggling(false);
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!user) return null;

  const countryEn = user.country_code ? getCountryNameEn(user.country_code) : '-';

  return (
    <div>
      {/* 用户信息卡片 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Email:</span> {user.email}
              </div>
              <div>
                <span className="text-gray-500">Name:</span> {user.first_name} {user.last_name}
              </div>
              <div>
                <span className="text-gray-500">Country:</span> {countryEn}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/${locale}/account/profile`)}
            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Marketing Preferences 卡片 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Marketing preferences</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">Email subscription</div>
            {isSubscribed ? (
              <p className="text-sm text-gray-500 mt-1">
                You're subscribed! You'll receive email marketing from our website.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Unsubscribe from emails? You'll no longer receive email marketing from our website.
              </p>
            )}
          </div>
          <button
            onClick={toggleSubscription}
            disabled={toggling}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
              isSubscribed ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                isSubscribed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {toggling && <div className="text-sm text-gray-400 mt-2">Saving...</div>}
      </div>

      {/* 地址管理 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Addresses</h3>
          <button
            onClick={() => {
              setEditingAddress(null);
              setShowAddressForm(true);
            }}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
          >
            <Plus size={16} /> Add address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            No addresses yet. Add one now.
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => {
              const countryName = addr.country_code ? getCountryNameEn(addr.country_code) : '';
              return (
                <div key={addr.id} className="bg-white shadow rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{addr.recipient}</span>
                      {addr.is_default && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{addr.company && `${addr.company}, `}{addr.phone}</div>
                    <div className="text-sm text-gray-600">
                      {addr.detail}, {addr.city}, {addr.province}, {countryName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!addr.is_default && (
                      <button onClick={() => handleSetDefault(addr.id)} className="text-blue-600 hover:text-blue-800" title="Set default">
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingAddress(addr);
                        setShowAddressForm(true);
                      }}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-500 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 地址表单模态框（保持不变） */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingAddress ? 'Edit Address' : 'Add Address'}</h2>
              <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <AddressForm
              initialData={editingAddress || {}}
              onSave={handleSaveAddress}
              onCancel={() => { setShowAddressForm(false); setEditingAddress(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}