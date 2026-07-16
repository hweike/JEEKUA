// app/robots.ts

import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/getSiteSettings';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  
  // 移除末尾斜杠，避免出现双斜杠
  const baseUrl = (settings.websiteUrl?.trim() || 'https://example.com').replace(/\/+$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap/sitemap-index.xml`,
  };
}