'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface InquiryFormProps {
  locale: string;
  defaultProductUrl?: string;
  defaultProductName?: string;
}

export default function InquiryForm({ locale, defaultProductUrl, defaultProductName }: InquiryFormProps) {
  const t = useTranslations('Inquiry');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    productUrl: defaultProductUrl || '',
    productName: defaultProductName || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          company: '',
          phone: '',
          message: '',
          productUrl: '',
          productName: '',
        });
      } else {
        setError(data.error || t('error'));
      }
    } catch (err) {
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-6 text-center">
        <h2 className="text-xl font-semibold text-green-800">{t('success')}</h2>
        <p className="text-green-700 mt-2">{t('thanks')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block font-medium mb-1">{t('name')} *</label>
        <input
          type="text"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block font-medium mb-1">{t('email')} *</label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block font-medium mb-1">{t('company')}</label>
        <input
          type="text"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block font-medium mb-1">{t('phone')}</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block font-medium mb-1">{t('message')} *</label>
        <textarea
          name="message"
          required
          rows={5}
          value={formData.message}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>
      {(defaultProductUrl || defaultProductName) && (
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">{t('relatedProduct')}:</p>
          {defaultProductName && <p className="font-medium">{defaultProductName}</p>}
          {defaultProductUrl && (
            <a href={defaultProductUrl} target="_blank" className="text-blue-600 text-sm break-all">
              {defaultProductUrl}
            </a>
          )}
        </div>
      )}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary-600 text-white py-3 rounded hover:bg-primary-700 disabled:opacity-50"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}