// components/Footer/shared/PolicyLinks.tsx
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = '000001';
const POLICY_PAGE_IDS = ['10000002', '10000003', '10000004', '10000005', '10000007', '10000006'];

const getPolicyPages = unstable_cache(
  async (locale: string) => {
    const { data, error } = await supabase
      .from('site_pages')
      .select('id, title, slug')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .in('id', POLICY_PAGE_IDS)
      .eq('visible', 'visible')
      .order('created_at', { ascending: true });

    if (error) return [];
    return data;
  },
  ['policy-pages'],
  { revalidate: 3600 }
);

export default async function PolicyLinks() {
  const locale = await getLocale();
  const pages = await getPolicyPages(locale);

  if (!pages || pages.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-center"
      style={{
        columnGap: 'var(--spacing-6, 1.5rem)',
        rowGap: 'var(--spacing-2, 0.5rem)',
      }}
    >
      {pages.map((page) => {
        const href = `/${locale}/${page.slug}`;
        return (
          <Link
            key={page.id}
            href={href}
            className="policy-link"
          >
            {page.title}
          </Link>
        );
      })}
    </div>
  );
}