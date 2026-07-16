'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { COUNTRIES } from '@/lib/countries';
import { getCustomerProfile, updateCustomerProfile } from '@/lib/account';

export default function ProfilePage() {
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
      alert('Update failed');
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="mt-1 w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="mt-1 w-full border rounded p-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <div className="mt-1 w-full border rounded p-2 bg-gray-100 text-gray-700">
            {form.email}
          </div>
          <p className="text-xs text-gray-500 mt-1">This email is used for sign-in and order updates.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <select
            value={form.country_code}
            onChange={(e) => setForm({ ...form, country_code: e.target.value })}
            className="mt-1 w-full border rounded p-2"
          >
            <option value="">Select Country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/account`)}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}