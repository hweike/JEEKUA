'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getImageUrl } from '@/lib/files/url';

interface ProductInfo {
  id?: string;
  name: string;
  imageUrl?: string;
  brand?: string;
  slug?: string;
  locale?: string;
}

interface InquiryFormProps {
  locale: string;
  defaultProductUrl?: string;
  defaultProductName?: string;
  product?: ProductInfo | null;
}

export default function InquiryForm({ locale, defaultProductUrl, defaultProductName, product }: InquiryFormProps) {
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
      const payload = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        phone: formData.phone,
        message: formData.message,
        productUrl: formData.productUrl || undefined,
        productName: formData.productName || product?.name || undefined,
        productId: product?.id || undefined,
        productSlug: product?.slug || undefined,
        productLocale: product?.locale || undefined,
      };

      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-green-800">{t('success')}</h2>
        <p className="text-green-700 mt-2">{t('thanks')}</p>
      </div>
    );
  }

  const imageUrl = product?.imageUrl ? getImageUrl(product.imageUrl) : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {product && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center gap-4">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-16 h-16 object-cover rounded border border-gray-200"
            />
          )}
          <div>
            <div className="font-medium text-gray-800">{product.name}</div>
            {product.brand && <div className="text-sm text-gray-500">{t('brandLabel')}: {product.brand}</div>}
          </div>
        </div>
      )}

      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">{t('title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="field relative">
          <input
            type="text"
            name="name"
            id="ContactForm-name"
            required
            value={formData.name}
            onChange={handleChange}
            className="field__input w-full border border-gray-300 rounded-lg px-4 py-3 pt-5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition peer"
            placeholder=" "
          />
          <label
            htmlFor="ContactForm-name"
            className="field__label absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm pointer-events-none"
          >
            {t('fields.name')}
          </label>
        </div>
        <div className="field relative">
          <input
            type="email"
            name="email"
            id="ContactForm-email"
            required
            value={formData.email}
            onChange={handleChange}
            className="field__input w-full border border-gray-300 rounded-lg px-4 py-3 pt-5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition peer"
            placeholder=" "
          />
          <label
            htmlFor="ContactForm-email"
            className="field__label absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm pointer-events-none"
          >
            {t('fields.email')} <span aria-hidden="true">*</span>
          </label>
        </div>
      </div>

      <div className="field relative">
        <input
          type="tel"
          name="phone"
          id="ContactForm-phone"
          value={formData.phone}
          onChange={handleChange}
          className="field__input w-full border border-gray-300 rounded-lg px-4 py-3 pt-5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition peer"
          placeholder=" "
        />
        <label
          htmlFor="ContactForm-phone"
          className="field__label absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm pointer-events-none"
        >
          {t('fields.phone')}
        </label>
      </div>

      <div className="field relative">
        <textarea
          name="message"
          id="ContactForm-body"
          rows={6}
          required
          value={formData.message}
          onChange={handleChange}
          className="field__input w-full border border-gray-300 rounded-lg px-4 py-3 pt-5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition peer resize-none"
          placeholder=" "
        />
        <label
          htmlFor="ContactForm-body"
          className="field__label absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm pointer-events-none"
        >
          {t('fields.message')}
        </label>
      </div>

      {!product && (defaultProductUrl || defaultProductName) && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
          <p className="text-gray-600">{t('relatedProduct')}:</p>
          {defaultProductName && <p className="font-medium text-gray-800">{defaultProductName}</p>}
          {defaultProductUrl && (
            <a href={defaultProductUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all hover:underline">
              {defaultProductUrl}
            </a>
          )}
        </div>
      )}

      {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="contact__button">
        <button
          type="submit"
          disabled={submitting}
          className="button bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('sending') : t('send')}
        </button>
      </div>
    </form>
  );
}