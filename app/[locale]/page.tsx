// app/[locale]/page.tsx
import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { getDb } from '@/lib/db';                          // 新增
import { extractAllTextIds } from '@/lib/webbuilder/text-utils'; // 新增

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

  // ========== 新增：多语言文本注入 ==========
  const textIds = extractAllTextIds(template.data);
  let texts: Record<string, string> = {};
  if (textIds.length > 0) {
    const db = getDb();
    const siteId = '100001';
    const templateId = template.id; // 例如 "default_homepage_published"
    const placeholders = textIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT text_id, text FROM component_texts
      WHERE site_id = ? AND template_id = ? AND locale = ? AND text_id IN (${placeholders})
    `).all(siteId, templateId, locale, ...textIds) as { text_id: string; text: string }[];
    texts = rows.reduce((acc, row) => ({ ...acc, [row.text_id]: row.text }), {});
  }
  const runtime = { texts, locale };
  const finalData = injectRuntimeDataSafe(template.data, runtime);
  // =======================================

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
          <TemplateRenderer data={finalData} /> {/* 使用注入后的数据 */}
        </div>
      </main>
    </>
  );
}