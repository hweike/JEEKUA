import fs from 'fs/promises';
import path from 'path';
import { supabase } from '@/lib/supabase/client';
import { getSiteSettings } from '@/lib/getSiteSettings';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHUNK_SIZE = 45000;
const SITEMAP_DIR = path.join(process.cwd(), 'public', 'sitemap');

interface PageGroup {
  id: string;
  type: string;
  locales: Map<string, { url: string; updatedAt: string; priority: number; changefreq: string }>;
}

// 获取并验证 BASE_URL
async function getBaseUrl(): Promise<string> {
  const settings = await getSiteSettings();
  const baseUrl = settings.websiteUrl?.trim();
  if (!baseUrl) {
    throw new Error('网站未配置网址，请前往“网站设置 > 基本设置”页面填写“网站名称”和“网站网址”后重试。');
  }
  // 确保以 / 结尾
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export async function generateSitemaps() {
  // 验证 baseUrl
  const baseUrl = await getBaseUrl();

  // 确保目录存在
  await fs.mkdir(SITEMAP_DIR, { recursive: true });

  // 查询所有需要包含的页面（noindex = 0）
  const { data: rows, error } = await supabase
    .from('pages')
    .select('id, locale, url, updatedAt, priority, changefreq')
    .eq('site_id', SITE_ID)
    .eq('noindex', 0)
    .order('id', { ascending: true })
    .order('locale', { ascending: true });

  if (error) {
    console.error('Failed to fetch pages for sitemap:', error);
    throw new Error('Database query failed');
  }

  // 按 id 分组
  const groupMap = new Map<string, PageGroup>();
  for (const row of rows || []) {
    if (!groupMap.has(row.id)) {
      const type = row.id.split(':')[0] || 'other';
      groupMap.set(row.id, {
        id: row.id,
        type,
        locales: new Map(),
      });
    }
    const group = groupMap.get(row.id)!;
    group.locales.set(row.locale, {
      url: row.url,
      updatedAt: row.updatedAt,
      priority: row.priority,
      changefreq: row.changefreq,
    });
  }

  // 按类型分组
  const typeGroups = new Map<string, PageGroup[]>();
  for (const group of groupMap.values()) {
    if (!typeGroups.has(group.type)) typeGroups.set(group.type, []);
    typeGroups.get(group.type)!.push(group);
  }

  const allSitemapFiles: string[] = [];
  for (const [type, groups] of typeGroups.entries()) {
    const totalGroups = groups.length;
    const chunkCount = Math.ceil(totalGroups / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const chunk = groups.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const fileName = `sitemap-${type}-${i + 1}.xml`;
      const filePath = path.join(SITEMAP_DIR, fileName);
      const xml = generateSitemapChunk(chunk, baseUrl);
      await fs.writeFile(filePath, xml, 'utf-8');
      allSitemapFiles.push(`/sitemap/${fileName}`);
      console.log(`Generated ${fileName}`);
    }
  }

  // 生成索引文件
  const indexXml = generateSitemapIndex(allSitemapFiles, baseUrl);
  await fs.writeFile(path.join(SITEMAP_DIR, 'sitemap-index.xml'), indexXml, 'utf-8');
  console.log('Generated sitemap-index.xml');

  return allSitemapFiles;
}

function generateSitemapChunk(groups: PageGroup[], baseUrl: string): string {
  const urlsXml = groups.map(group => {
    let defaultLocale = 'zh';
    if (!group.locales.has(defaultLocale)) {
      defaultLocale = Array.from(group.locales.keys())[0];
    }
    const defaultPage = group.locales.get(defaultLocale)!;
    const alternatives = Array.from(group.locales.entries()).map(([locale, data]) => ({
      hreflang: locale,
      href: `${baseUrl}${data.url}`,
    }));
    alternatives.push({ hreflang: 'x-default', href: `${baseUrl}${defaultPage.url}` });
    return `
    <url>
      <loc>${escapeXml(`${baseUrl}${defaultPage.url}`)}</loc>
      <lastmod>${defaultPage.updatedAt}</lastmod>
      <priority>${defaultPage.priority}</priority>
      <changefreq>${defaultPage.changefreq}</changefreq>
      ${alternatives.map(alt => `<xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}" />`).join('\n')}
    </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urlsXml}
</urlset>`;
}

function generateSitemapIndex(files: string[], baseUrl: string): string {
  const sitemaps = files.map(file => `
  <sitemap>
    <loc>${baseUrl}${file}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps}
</sitemapindex>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}