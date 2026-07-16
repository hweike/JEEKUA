'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Plus, Pencil, Trash2, CheckCircle, X } from 'lucide-react';
import { getAddresses, deleteAddress, createAddress, updateAddress } from '@/lib/account';
import { COUNTRIES, getCountryNameEn, getPhoneCode } from '@/lib/countries';
import type { Address } from '@/lib/CRM/types';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    country_code: 'CN',
    first_name: '',
    last_name: '',
    company: '',
    address: '',
    apartment: '',
    city: '',
    province: '',
    phone: '',
    is_default: false,
  });
  const [phoneCode, setPhoneCode] = useState('+86');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const locale = useLocale();

  const fetchAddresses = async () => {
    const data = await getAddresses();
    setAddresses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData({
      country_code: 'CN',
      first_name: '',
      last_name: '',
      company: '',
      address: '',
      apartment: '',
      city: '',
      province: '',
      phone: '',
      is_default: false,
    });
    setPhoneCode('+86');
    setShowModal(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    const nameParts = (addr.recipient || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    setFormData({
      country_code: addr.country_code || 'CN',
      first_name: firstName,
      last_name: lastName,
      company: addr.company || '',
      address: addr.detail || '',
      apartment: '',
      city: addr.city || '',
      province: addr.province || '',
      phone: addr.phone.replace(/^\+\d+\s*/, ''),
      is_default: addr.is_default || false,
    });
    setPhoneCode(getPhoneCode(addr.country_code || 'CN'));
    setShowModal(true);
  };

  const handleCountryChange = (code: string) => {
    setFormData({ ...formData, country_code: code });
    setPhoneCode(getPhoneCode(code));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const fullName = `${formData.first_name} ${formData.last_name}`.trim();
    if (!fullName || !formData.phone || !formData.address || !formData.city || !formData.province) {
      alert('Please fill in all required fields');
      setSaving(false);
      return;
    }

    const payload = {
      recipient: fullName,
      phone: `${phoneCode} ${formData.phone}`.trim(),
      country_code: formData.country_code,
      company: formData.company || '',
      province: formData.province,
      city: formData.city,
      detail: formData.address + (formData.apartment ? `, ${formData.apartment}` : ''),
      is_default: formData.is_default,
    };

    let result;
    if (editingAddress) {
      result = await updateAddress(editingAddress.id, payload);
    } else {
      result = await createAddress(payload);
    }

    setSaving(false);
    if (result) {
      setShowModal(false);
      fetchAddresses();
    } else {
      alert('Failed to save address');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this address?')) {
      const success = await deleteAddress(id);
      if (success) fetchAddresses();
    }
  };

  const handleSetDefault = async (id: number) => {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;
    const result = await updateAddress(id, { ...addr, is_default: true });
    if (result) fetchAddresses();
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Addresses</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
        >
          <Plus size={16} /> Add Address
        </button>
      </div>

      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
            No addresses yet. Add one now.
          </div>
        ) : (
          addresses.map((addr) => {
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
                  <div className="text-sm text-gray-600 mt-1">
                    {addr.company && `${addr.company}, `}{addr.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    {addr.detail}, {addr.city}, {addr.province}, {countryName}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Set default"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(addr)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="text-gray-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 模态框 - 使用 createPortal 渲染到 body */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">
                {editingAddress ? 'Edit Address' : 'Add Address'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Country/region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country/region *</label>
                  <select
                    value={formData.country_code}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameEn}
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
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                    required
                  />
                </div>

                {/* Apartment, suite, etc */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Apartment, suite, etc (optional)</label>
                  <input
                    type="text"
                    value={formData.apartment}
                    onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  />
                </div>

                {/* City, Province */}
                <div className="grid grid-cols-2 gap-3">
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
                </div>

                {/* Phone with country code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone *</label>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      className="w-28 border rounded px-2 py-2 text-sm"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.phoneCode}>
                          {c.phoneCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>

                {/* Default checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">Set as default address</label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}