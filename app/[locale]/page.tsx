import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { supabase } from '@/lib/supabase/client';
import { extractAllTextIds } from '@/lib/webbuilder/text-utils';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001'; // 与原硬编码 siteId = '100001' 保持一致

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

// 生成 Metadata 和 JSON-LD 脚本
export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  const seoInput = await getSeoInput('home', 'home', locale);
  if (!seoInput) return {};
  const { metadata } = await generatePageMetadata(seoInput, locale);
  return metadata;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const template = await getTemplateById('default_homepage_published');
  if (!template) notFound();

  // ========== 多语言文本注入 ==========
  const textIds = extractAllTextIds(template.data);
  let texts: Record<string, string> = {};
  if (textIds.length > 0) {
    const { data, error } = await supabase
      .from('component_texts')
      .select('text_id, text')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('template_id', template.id)
      .eq('locale', locale)
      .in('text_id', textIds);
    if (!error && data) {
      texts = data.reduce((acc, row) => ({ ...acc, [row.text_id]: row.text }), {});
    } else {
      console.error('Failed to fetch component texts:', error);
    }
  }
  const runtime = { texts, locale };
  const finalData = injectRuntimeDataSafe(template.data, runtime);
  // ===================================

  const seoInput = await getSeoInput('home', 'home', locale);
  let jsonLdScripts: string[] = [];
  if (seoInput) {
    const { jsonLdScripts: scripts } = await generatePageMetadata(seoInput, locale);
    jsonLdScripts = scripts;
  }

  return (
    <>
      {jsonLdScripts.map((script, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: script }}
        />
      ))}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <TemplateRenderer data={finalData} />
        </div>
      </main>
    </>
  );
}