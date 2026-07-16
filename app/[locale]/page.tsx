// app/[locale]/page.tsx
import { notFound } from 'next/navigation';
import { readPage, getHomePageId } from '@/lib/pages/storage';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { withStaticLocale } from '@/lib/withPageLocale';
import { getSiteSettings } from '@/lib/getSiteSettings';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;

  // 1. 获取站点基础 URL（用于构建绝对链接）
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

  // 2. 获取页面 SEO 输入
  const seoInput = await getSeoInput('home', 'home', locale);

  // 3. 若没有 SEO 数据，返回最小化的 metadata（仅包含必需字段）
  if (!seoInput) {
    return {
      alternates: {
        canonical: `${baseUrl}/${locale}`,
      },
      openGraph: {
        locale: locale,
      },
    };
  }

  // 4. 调用底层 SEO 生成器（不包含 hreflang）
  const { metadata } = await generatePageMetadata(seoInput, locale);

  // 5. 构建绝对 canonical URL
  const canonicalPath = seoInput.canonical || seoInput.url || `/${locale}`;
  const canonical = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

  // 6. 覆盖 openGraph，确保 locale 和 url 正确
  const openGraph = {
    ...metadata.openGraph,
    locale: locale,
    url: metadata.openGraph?.url || canonical,
  };

  // 7. 返回最终 metadata，显式控制 alternates（只保留 canonical）
  return {
    ...metadata,
    alternates: {
      canonical,
    },
    openGraph,
    // 确保没有其他字段可能产生 hreflang
  };
}

async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // 获取当前语言的首页页面 ID
  const pageId = await getHomePageId(locale);
  if (!pageId) notFound();

  // 读取页面 MD 文件
  const page = await readPage(locale, pageId);
  if (!page) notFound();

  // 提取嵌入的模板数据
  const templateData = page.templateData;
  if (!templateData) notFound();

  // 获取页面 SEO 信息（用于 Alt 自动生成）
  const seoInput = await getSeoInput('home', 'home', locale);
  const seoTitle = seoInput?.title || page.title || '';

  // 构造运行时注入对象
  const runtime = {
    seoTitle: seoTitle,
    locale: locale,
    // 如果有多语言文本数据，可以在这里传递
    // texts: extractedTexts,
  };

  // 生成 JSON-LD 脚本
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
          <TemplateRenderer data={templateData} runtime={runtime} />
        </div>
      </main>
    </>
  );
}

export default withStaticLocale(HomePage);