// lib/sitemap/generate.ts
import { supabase } from '@/lib/supabase/client';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getPublicStorage } from '@/lib/storage/factory';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHUNK_SIZE = 45000;

// XSLT 样式表内容（用于美化 XML 显示）
const XSLT_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml">
    <xsl:output method="html" indent="yes" encoding="UTF-8"/>
    <xsl:template match="/">
        <html>
        <head>
            <meta charset="UTF-8"/>
            <title>站点地图</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                .url-list { list-style: none; padding: 0; }
                .url-item { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .loc { font-size: 16px; font-weight: bold; color: #2980b9; word-break: break-all; }
                .meta { margin-top: 8px; font-size: 14px; color: #555; }
                .meta span { margin-right: 15px; }
                .hreflang { margin-top: 5px; font-size: 13px; color: #27ae60; }
                .hreflang span { background: #eafaf1; padding: 2px 8px; border-radius: 4px; margin-right: 5px; display: inline-block; margin-top: 3px; }
                .x-default { background: #d5f5e3; font-weight: bold; }
                .lastmod { color: #7f8c8d; }
                .priority { color: #8e44ad; }
                .changefreq { color: #d35400; }
            </style>
        </head>
        <body>
            <h1>站点地图</h1>
            <ul class="url-list">
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <li class="url-item">
                        <div class="loc"><xsl:value-of select="sitemap:loc"/></div>
                        <div class="meta">
                            <span class="lastmod">最后更新: <xsl:value-of select="sitemap:lastmod"/></span>
                            <span class="priority">优先级: <xsl:value-of select="sitemap:priority"/></span>
                            <span class="changefreq">更新频率: <xsl:value-of select="sitemap:changefreq"/></span>
                        </div>
                        <div class="hreflang">
                            替代语言:
                            <xsl:for-each select="xhtml:link">
                                <span>
                                    <xsl:choose>
                                        <xsl:when test="@hreflang='x-default'">
                                            <span class="x-default">
                                                <xsl:value-of select="@hreflang"/> → <xsl:value-of select="@href"/>
                                            </span>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:value-of select="@hreflang"/> → <xsl:value-of select="@href"/>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </span>
                            </xsl:for-each>
                        </div>
                    </li>
                </xsl:for-each>
            </ul>
        </body>
        </html>
    </xsl:template>
</xsl:stylesheet>`;

interface PageGroup {
  id: string;
  type: string;
  locales: Map<string, { url: string; updatedAt: string; priority: number; changefreq: string }>;
}

async function getBaseUrl(): Promise<string> {
  const settings = await getSiteSettings();
  const baseUrl = settings.websiteUrl?.trim();
  if (!baseUrl) {
    throw new Error('网站未配置网址，请前往“网站设置 > 基本设置”页面填写“网站名称”和“网站网址”后重试。');
  }
  return baseUrl.replace(/\/+$/, '');
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

/**
 * 构建完整的 URL：base + /{locale}/ + slug
 * 自动处理 slug 前后的斜杠，避免双斜杠
 */
function buildFullUrl(base: string, locale: string, slug: string): string {
  const cleanSlug = slug.replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) {
    return `${base}/${locale}`;
  }
  return `${base}/${locale}/${cleanSlug}`;
}

/**
 * 生成单个子站点地图的 XML 内容
 * x-default 固定指向英文（en），若不存在则回退到默认语言
 */
function generateSitemapChunk(groups: PageGroup[], baseUrl: string, chunkIndex?: number): string {
  console.log(`[generateSitemapChunk] Starting for ${groups.length} groups, chunkIndex=${chunkIndex}`);

  // 硬编码 x-default 目标语言
  const X_DEFAULT_LOCALE = 'en';

  let urlCount = 0;
  const urlsXml = groups
    .map((group) => {
      // 1. 检查组是否有效
      if (!group.locales || group.locales.size === 0) {
        console.warn(`[generateSitemapChunk] Group ${group.id} has no locales, skipping.`);
        return null;
      }

      // 2. 确定默认语言（优先 zh，否则取第一个）
      let defaultLocale = 'zh';
      if (!group.locales.has(defaultLocale)) {
        defaultLocale = Array.from(group.locales.keys())[0];
      }
      const defaultPage = group.locales.get(defaultLocale);
      if (!defaultPage) {
        console.warn(`[generateSitemapChunk] Group ${group.id} default locale ${defaultLocale} not found, skipping.`);
        return null;
      }

      // 3. 提取默认页面的数据
      const defaultSlug = defaultPage.url || '';
      const updatedAt = defaultPage.updatedAt || new Date().toISOString();
      const priority = defaultPage.priority ?? 0.5;
      const changefreq = defaultPage.changefreq || 'weekly';

      // 4. 构建所有语言版本的 alternative 链接（不含 x-default）
      const alternatives = Array.from(group.locales.entries()).map(([locale, data]) => {
        const slug = data.url || '';
        const fullUrl = buildFullUrl(baseUrl, locale, slug);
        return {
          hreflang: locale,
          href: fullUrl,
        };
      });

      // 5. 单独构建 x-default（优先使用 'en'，若不存在则回退到默认语言）
      let xDefaultLocale: string;
      let xDefaultSlug: string;
      if (group.locales.has(X_DEFAULT_LOCALE)) {
        xDefaultLocale = X_DEFAULT_LOCALE;
        xDefaultSlug = group.locales.get(X_DEFAULT_LOCALE)!.url || '';
      } else {
        // 回退到默认语言
        xDefaultLocale = defaultLocale;
        xDefaultSlug = defaultSlug;
        console.warn(
          `[generateSitemapChunk] x-default language "${X_DEFAULT_LOCALE}" not found for group ${group.id}, falling back to "${defaultLocale}"`
        );
      }
      const xDefaultFullUrl = buildFullUrl(baseUrl, xDefaultLocale, xDefaultSlug);
      alternatives.push({ hreflang: 'x-default', href: xDefaultFullUrl });

      // 6. loc 使用默认语言的完整 URL（与 x-default 可能不同）
      const defaultFullUrl = buildFullUrl(baseUrl, defaultLocale, defaultSlug);
      const encodedLoc = escapeXml(encodeURI(defaultFullUrl));

      urlCount++;
      return `
    <url>
      <loc>${encodedLoc}</loc>
      <lastmod>${updatedAt}</lastmod>
      <priority>${priority}</priority>
      <changefreq>${changefreq}</changefreq>
      ${alternatives.map(alt => {
        const encodedHref = escapeXml(encodeURI(alt.href));
        return `<xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${encodedHref}" />`;
      }).join('\n')}
    </url>`;
    })
    .filter(Boolean)
    .join('');

  console.log(`[generateSitemapChunk] Built ${urlCount} valid URLs out of ${groups.length} groups.`);

  // 7. 构建 XML（包含 XSLT 引用）
  const xsltInstruction = '<?xml-stylesheet type="text/xsl" href="/sitemap/sitemap.xsl"?>';
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';

  if (!urlsXml) {
    console.warn(`[generateSitemapChunk] No valid URLs, returning empty urlset.`);
    return `${xmlHeader}
${xsltInstruction}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
</urlset>`;
  }

  const xml = `${xmlHeader}
${xsltInstruction}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urlsXml}
</urlset>`;

  console.log(`[generateSitemapChunk] Generated XML length: ${xml.length}, starts with: ${xml.substring(0, 100)}...`);
  return xml;
}

function generateSitemapIndex(publicUrls: string[], baseUrl: string): string {
  const now = new Date().toISOString();
  const sitemapsXml = publicUrls.map(url => `
  <sitemap>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapsXml}
</sitemapindex>`;
}

export async function generateSitemaps(): Promise<string[]> {
  const baseUrl = await getBaseUrl();
  const storage = getPublicStorage();

  console.log('[generateSitemaps] Starting sitemap generation...');
  console.log(`[generateSitemaps] Base URL: ${baseUrl}`);

  // 确保 XSLT 文件存在
  console.log('[generateSitemaps] Ensuring XSLT file exists...');
  const xsltKey = 'sitemap/sitemap.xsl';
  try {
    await storage.write(xsltKey, XSLT_CONTENT, { contentType: 'text/xsl' });
    console.log(`[generateSitemaps] ✅ XSLT file written to ${xsltKey}`);
  } catch (err) {
    console.error(`[generateSitemaps] ❌ Failed to write XSLT file:`, err);
    // 不中断流程，继续生成
  }

  // 1. 查询所有需要索引的页面（noindex = 0）
  console.log('[generateSitemaps] Fetching pages from database...');
  const { data: rows, error } = await supabase
    .from('pages')
    .select('id, locale, url, updatedAt, priority, changefreq')
    .eq('site_id', SITE_ID)
    .eq('noindex', 0)
    .order('id', { ascending: true })
    .order('locale', { ascending: true });

  if (error) {
    console.error('[generateSitemaps] Database error:', error);
    throw new Error('Database query failed');
  }

  console.log(`[generateSitemaps] Retrieved ${rows?.length || 0} records.`);

  if (!rows || rows.length === 0) {
    console.warn('[generateSitemaps] No pages found, generating empty sitemap index.');
    const indexKey = 'sitemap/sitemap-index.xml';
    const emptyIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`;
    await storage.write(indexKey, emptyIndex, { contentType: 'application/xml' });
    return [];
  }

  // 2. 按 id 分组，聚合所有语言版本
  console.log('[generateSitemaps] Grouping by id...');
  const groupMap = new Map<string, PageGroup>();
  for (const row of rows) {
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
  console.log(`[generateSitemaps] Grouped into ${groupMap.size} unique content IDs.`);

  // 3. 按类型分组
  const typeGroups = new Map<string, PageGroup[]>();
  for (const group of groupMap.values()) {
    if (!typeGroups.has(group.type)) typeGroups.set(group.type, []);
    typeGroups.get(group.type)!.push(group);
  }
  console.log(`[generateSitemaps] Types: ${Array.from(typeGroups.keys()).join(', ')}`);

  // 4. 分片生成子文件
  const allSitemapKeys: string[] = [];
  for (const [type, groups] of typeGroups.entries()) {
    const totalGroups = groups.length;
    const chunkCount = Math.ceil(totalGroups / CHUNK_SIZE);
    console.log(`[generateSitemaps] Type "${type}" has ${totalGroups} groups, splitting into ${chunkCount} chunks.`);

    for (let i = 0; i < chunkCount; i++) {
      const chunk = groups.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const key = `sitemap/sitemap-${type}-${i + 1}.xml`;
      console.log(`[generateSitemaps] Generating ${key} with ${chunk.length} groups...`);

      const xml = generateSitemapChunk(chunk, baseUrl, i + 1);

      // 检查生成的 xml 是否以正确的 XML 声明开头
      if (!xml.startsWith('<?xml')) {
        console.error(`[generateSitemaps] ❌ Generated XML for ${key} is INVALID! First 200 chars:`, xml.substring(0, 200));
        throw new Error(`Invalid XML generated for ${key}. Content starts with: ${xml.substring(0, 50)}`);
      } else {
        console.log(`[generateSitemaps] ✅ XML for ${key} looks valid (starts with '<?xml').`);
      }

      // 写入存储（使用 Buffer 确保二进制一致性）
      const buffer = Buffer.from(xml, 'utf-8');
      await storage.write(key, buffer, { contentType: 'application/xml' });
      console.log(`[generateSitemaps] ✅ Successfully wrote ${key}`);

      // 验证写入内容
      try {
        const writtenBuffer = await storage.read(key, 'binary') as Buffer;
        const writtenString = writtenBuffer.toString('utf-8');
        if (writtenString !== xml) {
          console.error(`[VERIFY] ❌ ${key} content mismatch!`);
          console.error(`  Expected length: ${xml.length}, Got: ${writtenString.length}`);
          console.error(`  Expected start: ${xml.substring(0, 200)}`);
          console.error(`  Actual start:   ${writtenString.substring(0, 200)}`);
          throw new Error(`Content verification failed for ${key}`);
        } else {
          console.log(`[VERIFY] ✅ ${key} verified (length: ${writtenString.length})`);
        }
      } catch (readErr) {
        console.error(`[VERIFY] ❌ Failed to read back ${key}:`, readErr);
        throw readErr;
      }

      allSitemapKeys.push(key);
    }
  }

  // 5. 生成索引文件
  console.log('[generateSitemaps] Generating index file...');
  const indexKey = 'sitemap/sitemap-index.xml';
  const publicUrls = allSitemapKeys.map(key => storage.getPublicUrl(key));
  const indexXml = generateSitemapIndex(publicUrls, baseUrl);

  if (!indexXml.startsWith('<?xml')) {
    console.error('[generateSitemaps] ❌ Generated index XML is INVALID!');
    throw new Error('Invalid index XML generated.');
  }

  const indexBuffer = Buffer.from(indexXml, 'utf-8');
  await storage.write(indexKey, indexBuffer, { contentType: 'application/xml' });
  console.log('[generateSitemaps] ✅ Generated sitemap-index.xml');

  // 验证索引文件
  try {
    const readBuffer = await storage.read(indexKey, 'binary') as Buffer;
    const readStr = readBuffer.toString('utf-8');
    if (readStr !== indexXml) {
      console.error('[VERIFY] ❌ sitemap-index.xml content mismatch!');
      throw new Error('Index file verification failed');
    } else {
      console.log('[VERIFY] ✅ sitemap-index.xml verified');
    }
  } catch (err) {
    console.error('[VERIFY] ❌ Index verification error:', err);
    throw err;
  }

  console.log(`[generateSitemaps] All done. Generated ${allSitemapKeys.length} sub-sitemaps.`);
  return publicUrls;
}