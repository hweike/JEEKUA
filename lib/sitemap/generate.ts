// lib/sitemap/generate.ts
import { supabase } from '@/lib/supabase/client';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getPublicStorage } from '@/lib/storage/factory';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHUNK_SIZE = 45000;

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

/**
 * 生成所有 sitemap 文件并存储到公开桶
 * @returns 生成的 sitemap 文件路径列表（相对于公开桶根目录）
 */
export async function generateSitemaps(): Promise<string[]> {
  const baseUrl = await getBaseUrl();
  const storage = getPublicStorage(); // 使用公开桶

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

  const allSitemapKeys: string[] = []; // 存储桶中的 key
  for (const [type, groups] of typeGroups.entries()) {
    const totalGroups = groups.length;
    const chunkCount = Math.ceil(totalGroups / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const chunk = groups.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const key = `sitemap/sitemap-${type}-${i + 1}.xml`; // 公开桶中的路径
      const xml = generateSitemapChunk(chunk, baseUrl);
      await storage.write(key, xml, { contentType: 'application/xml' });
      allSitemapKeys.push(key);
      console.log(`Generated ${key}`);
    }
  }

  // 生成索引文件
  const indexKey = 'sitemap/sitemap-index.xml';
  const publicUrls = allSitemapKeys.map(key => storage.getPublicUrl(key));
  const indexXml = generateSitemapIndex(publicUrls, baseUrl);
  await storage.write(indexKey, indexXml, { contentType: 'application/xml' });
  console.log('Generated sitemap-index.xml');

  // 返回公开 URL 列表（用于后续 sitemap 引用）
  return publicUrls;
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
    <loc>${escapeXml(file)}</loc>
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