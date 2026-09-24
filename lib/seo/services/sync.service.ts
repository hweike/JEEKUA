// =====================================================
// SEO 同步服务（按最新需求重构）
// =====================================================

import sql from '@/lib/db/admin';
import { getPrivateStorage } from '@/lib/storage/factory';
import matter from 'gray-matter';

const DEFAULT_SITE_ID = '000001';
const storage = getPrivateStorage();

export class SyncService {
  async syncAfterApprove(
    siteId: string,
    pageId: string,
    locale: string
  ): Promise<void> {
    try {
      // ✅ pages 表迁移（注意 "updatedAt" / "createdAt" 是 camelCase）
      let page: any;
      try {
        const rows = await sql<any[]>`
          SELECT id, type, seo_title, seo_description, seo_keywords
          FROM public.pages
          WHERE site_id = ${siteId}
            AND id = ${pageId}
            AND locale = ${locale}
          LIMIT 1
        `;
        page = rows[0];
      } catch (err: any) {
        console.warn(`同步跳过: 页面 ${pageId} 获取失败`, err?.message);
        return;
      }

      if (!page) {
        console.warn(`同步跳过: 页面 ${pageId} 不存在`);
        return;
      }

      const rawId = page.id.replace(/^[a-zA-Z]+:/, '');

      switch (page.type) {
        case 'product':
          await this.syncProduct(rawId, locale, page);
          break;

        case 'productLine':
          await this.syncProductLineJson(rawId, locale, page);
          break;
        case 'productCollection':
          await this.syncProductCollectionJson(rawId, locale, page);
          break;

        case 'blogPost':
          await this.syncBlogPostTable(siteId, rawId, locale, page);
          break;

        case 'blogCategory':
          await this.syncBlogCategoryJson(rawId, locale, page);
          break;

        case 'docLibrary':
          await this.syncDocLibraryJson(rawId, page);
          break;

        case 'doc':
          await this.syncDocTable(siteId, rawId, locale, page);
          break;

        case 'videoCategory':
          await this.syncVideoCategoryJson(rawId, locale, page);
          break;

        case 'video':
          await this.syncVideoTableAndMd(siteId, rawId, locale, page);
          break;

        case 'home':
        case 'page':
        case 'inquiry':
        case 'policy':
          await this.syncSitePageTableAndMd(siteId, rawId, locale, page);
          break;

        default:
          console.warn(`未知页面类型: ${page.type}，跳过同步`);
      }
    } catch (error) {
      console.error(`同步服务执行失败 (${pageId}, ${locale}):`, error);
    }
  }

  // ============================================================
  // 1. product
  // ============================================================
  private async syncProduct(productId: string, locale: string, page: any): Promise<void> {
    const isVariant = productId.includes('/');
    if (isVariant) {
      await this.syncVariantProductMd(productId, locale, page);
    } else {
      await this.syncParentProductMd(productId, locale, page);
    }
  }

  private async syncParentProductMd(productId: string, locale: string, page: any): Promise<void> {
    const mdKey = `products/${locale}/products/${productId}.md`;
    await this.updateMdFile(mdKey, page, null);
    console.log(`✅ 更新父产品根 seo: ${mdKey}`);
  }

  private async syncVariantProductMd(productId: string, locale: string, page: any): Promise<void> {
    const parts = productId.split('/');
    const parentId = parts[0];
    const variantId = parts[parts.length - 1];
    const mdKey = `products/${locale}/products/${parentId}.md`;

    const variantExists = await this.variantExistsInMd(mdKey, variantId);
    if (!variantExists) {
      console.warn(`变体 ${variantId} 在 MD 文件中不存在，跳过同步`);
      return;
    }

    await this.updateMdFile(mdKey, page, variantId);
    console.log(`✅ 更新变体 ${variantId} SEO → variants 数组`);
  }

  private async variantExistsInMd(mdKey: string, variantId: string): Promise<boolean> {
    try {
      const rawContent = await storage.read(mdKey, 'utf8');
      const parsed = matter(rawContent);
      const data = parsed.data || {};
      if (data.variants && Array.isArray(data.variants)) {
        return data.variants.some((v: any) => v.id === variantId);
      }
      return false;
    } catch (err) {
      console.warn(`检查变体存在失败: ${mdKey}`, err);
      return false;
    }
  }

  // ============================================================
  // 2a. productLine
  // ============================================================
  private async syncProductLineJson(rawId: string, locale: string, page: any): Promise<void> {
    const jsonPath = `products/${locale}/categories.json`;
    try {
      const data = await this.readJson(jsonPath);
      if (!data.productLines) {
        console.warn(`JSON 缺少 productLines 数组: ${jsonPath}`);
        return;
      }
      const item = data.productLines.find((p: any) => p.id === rawId);
      if (!item) {
        console.warn(`未找到 productLine id=${rawId} in ${jsonPath}`);
        return;
      }
      item.seoTitle = page.seo_title || '';
      item.seoDescription = page.seo_description || '';
      item.seoKeywords = page.seo_keywords || '';

      await this.writeJson(jsonPath, data);
      console.log(`✅ 更新产品线 JSON: ${jsonPath} (${rawId})`);
    } catch (err) {
      console.error(`同步 productLine ${rawId} 失败:`, err);
    }
  }

  // ============================================================
  // 2b. productCollection
  // ============================================================
  private async syncProductCollectionJson(rawId: string, locale: string, page: any): Promise<void> {
    const jsonPath = `products/${locale}/categories.json`;
    try {
      const data = await this.readJson(jsonPath);
      if (!data.categories) {
        console.warn(`JSON 缺少 categories 数组: ${jsonPath}`);
        return;
      }

      const parts = rawId.split('/');
      if (parts.length === 1) {
        const cat = data.categories.find((c: any) => c.id === parts[0]);
        if (!cat) {
          console.warn(`未找到一级分类 id=${parts[0]} in ${jsonPath}`);
          return;
        }
        cat.seoTitle = page.seo_title || '';
        cat.seoDescription = page.seo_description || '';
        cat.seoKeywords = page.seo_keywords || '';
      } else if (parts.length === 2) {
        const cat = data.categories.find((c: any) => c.id === parts[0]);
        if (!cat) {
          console.warn(`未找到父级分类 id=${parts[0]} in ${jsonPath}`);
          return;
        }
        if (!cat.series) {
          console.warn(`分类 ${parts[0]} 没有 series 数组`);
          return;
        }
        const sub = cat.series.find((s: any) => s.id === parts[1]);
        if (!sub) {
          console.warn(`未找到二级分类 id=${parts[1]} in ${jsonPath}`);
          return;
        }
        sub.seoTitle = page.seo_title || '';
        sub.seoDescription = page.seo_description || '';
        sub.seoKeywords = page.seo_keywords || '';
      } else {
        console.warn(`无效的 productCollection id 格式: ${rawId}`);
        return;
      }

      await this.writeJson(jsonPath, data);
      console.log(`✅ 更新产品分类 JSON: ${jsonPath} (${rawId})`);
    } catch (err) {
      console.error(`同步 productCollection ${rawId} 失败:`, err);
    }
  }

  // ============================================================
  // 3. blogPost ✅ 已迁移
  // ============================================================
  private async syncBlogPostTable(
    siteId: string,
    postId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      await sql`
        UPDATE public.blog_posts
        SET seo_title = ${page.seo_title},
            seo_description = ${page.seo_description},
            seo_keywords = ${page.seo_keywords},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${postId}
          AND locale = ${locale}
      `;
      console.log(`✅ 更新 blog_posts 表: ${postId}`);
    } catch (error) {
      console.error(`同步博客文章 ${postId} 失败:`, error);
    }
  }

  // ============================================================
  // 4. blogCategory
  // ============================================================
  private async syncBlogCategoryJson(rawId: string, locale: string, page: any): Promise<void> {
    const jsonPath = `blog/${locale}/categories.json`;
    try {
      const data = await this.readJson(jsonPath);
      if (!Array.isArray(data)) {
        console.warn(`JSON 不是数组格式: ${jsonPath}`);
        return;
      }
      const item = data.find((c: any) => c.id === rawId);
      if (!item) {
        console.warn(`未找到 blogCategory id=${rawId} in ${jsonPath}`);
        return;
      }
      item.seo_title = page.seo_title || '';
      item.seo_description = page.seo_description || '';
      item.seo_keywords = page.seo_keywords || '';

      await this.writeJson(jsonPath, data);
      console.log(`✅ 更新博客分类 JSON: ${jsonPath} (${rawId})`);
    } catch (err) {
      console.error(`同步 blogCategory ${rawId} 失败:`, err);
    }
  }

  // ============================================================
  // 5. docLibrary
  // ============================================================
  private async syncDocLibraryJson(rawId: string, page: any): Promise<void> {
    const jsonPath = `docs/libs.json`;
    try {
      const data = await this.readJson(jsonPath);
      if (!Array.isArray(data)) {
        console.warn(`JSON 不是数组格式: ${jsonPath}`);
        return;
      }
      const item = data.find((l: any) => l.id === rawId);
      if (!item) {
        console.warn(`未找到 docLibrary id=${rawId} in ${jsonPath}`);
        return;
      }
      item.seo_title = page.seo_title || '';
      item.seo_description = page.seo_description || '';
      item.seo_keywords = page.seo_keywords || '';

      await this.writeJson(jsonPath, data);
      console.log(`✅ 更新文档库 JSON: ${jsonPath} (${rawId})`);
    } catch (err) {
      console.error(`同步 docLibrary ${rawId} 失败:`, err);
    }
  }

  // ============================================================
  // 6. doc ✅ 已迁移
  // ============================================================
  private async syncDocTable(
    siteId: string,
    docId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      await sql`
        UPDATE public.documents
        SET seo_title = ${page.seo_title},
            seo_description = ${page.seo_description},
            seo_keywords = ${page.seo_keywords},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${docId}
          AND locale = ${locale}
      `;
      console.log(`✅ 更新 documents 表: ${docId}`);
    } catch (error) {
      console.error(`同步文档 ${docId} 失败:`, error);
    }
  }

  // ============================================================
  // 7. videoCategory
  // ============================================================
  private async syncVideoCategoryJson(rawId: string, locale: string, page: any): Promise<void> {
    const jsonPath = `videosys/${locale}/categories.json`;
    try {
      const data = await this.readJson(jsonPath);
      if (typeof data !== 'object' || Array.isArray(data)) {
        console.warn(`JSON 不是对象格式: ${jsonPath}`);
        return;
      }
      const item = data[rawId];
      if (!item) {
        console.warn(`未找到 videoCategory id=${rawId} in ${jsonPath}`);
        return;
      }
      item.seo_title = page.seo_title || '';
      item.seo_description = page.seo_description || '';
      item.seo_keywords = page.seo_keywords || '';

      await this.writeJson(jsonPath, data);
      console.log(`✅ 更新视频分类 JSON: ${jsonPath} (${rawId})`);
    } catch (err) {
      console.error(`同步 videoCategory ${rawId} 失败:`, err);
    }
  }

  // ============================================================
  // 8. video ✅ 已迁移
  // ============================================================
  private async syncVideoTableAndMd(
    siteId: string,
    videoId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      await sql`
        UPDATE public.videos
        SET seo_title = ${page.seo_title},
            seo_description = ${page.seo_description},
            seo_keywords = ${page.seo_keywords},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${videoId}
          AND locale = ${locale}
      `;
      console.log(`✅ 更新 videos 表: ${videoId}`);

      const mdKey = `videosys/${locale}/${videoId}.md`;
      await this.updateMdFile(mdKey, page, null);
    } catch (error) {
      console.error(`同步视频 ${videoId} 失败:`, error);
    }
  }

  // ============================================================
  // 9. home, page, inquiry, policy ✅ 已迁移（修正 site_pages → pages）
  // ============================================================
  private async syncSitePageTableAndMd(
    siteId: string,
    pageId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      await sql`
        UPDATE public.pages
        SET seo_title = ${page.seo_title},
            seo_description = ${page.seo_description},
            seo_keywords = ${page.seo_keywords},
            "updatedAt" = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${pageId}
          AND locale = ${locale}
      `;
      console.log(`✅ 更新 pages 表: ${pageId}`);

      const mdKey = `pages/${locale}/${pageId}.md`;
      await this.updateMdFile(mdKey, page, null);
    } catch (error) {
      console.error(`同步页面 ${pageId} 失败:`, error);
    }
  }

  // ============================================================
  // 辅助工具
  // ============================================================

  private async readJson(filePath: string): Promise<any> {
    try {
      const content = await storage.read(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err: any) {
      if (err?.code === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.message?.includes('File not found')) {
        console.warn(`JSON 文件不存在，将创建空对象: ${filePath}`);
        return {};
      }
      throw err;
    }
  }

  private async writeJson(filePath: string, data: any): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await storage.write(filePath, content, { contentType: 'application/json' });
  }

  private async updateMdFile(mdKey: string, page: any, variantId: string | null): Promise<void> {
    try {
      let rawContent = '';
      try {
        rawContent = await storage.read(mdKey, 'utf8');
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.message?.includes('File not found')) {
          console.warn(`MD 文件不存在: ${mdKey}，跳过文件同步`);
          return;
        }
        throw err;
      }

      const parsed = matter(rawContent);
      const data = parsed.data || {};
      const content = parsed.content || '';

      if (variantId) {
        if (data.variants && Array.isArray(data.variants)) {
          const variant = data.variants.find((v: any) => v.id === variantId);
          if (variant) {
            variant.seo_title = page.seo_title || '';
            variant.seo_description = page.seo_description || '';
            variant.seo_keywords = page.seo_keywords || '';
            console.log(`✅ 更新变体 ${variantId} 的 seo_* 字段`);
          } else {
            console.warn(`未找到变体 ${variantId}，跳过更新`);
          }
        } else {
          console.warn(`MD 文件中没有 variants 数组`);
        }
      } else {
        const seoTitle = page.seo_title || null;
        const seoDescription = page.seo_description || null;
        const seoKeywords = page.seo_keywords || null;

        if (!seoTitle && !seoDescription && !seoKeywords) {
          delete data.seo_title;
          delete data.seo_description;
          delete data.seo_keywords;
          console.log(`✅ 清空父产品根 seo 字段`);
        } else {
          data.seo_title = seoTitle;
          data.seo_description = seoDescription;
          data.seo_keywords = seoKeywords;
          console.log(`✅ 更新父产品根 seo 字段`);
        }
      }

      const newContent = matter.stringify(content, data);
      await storage.write(mdKey, newContent, { contentType: 'text/markdown' });
      console.log(`✅ MD 文件已更新: ${mdKey}`);
    } catch (err) {
      console.error(`更新 MD 文件失败 (${mdKey}):`, err);
    }
  }

  async syncBatch(
    siteId: string,
    pageIds: string[],
    locale: string
  ): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    const results = { success: [] as string[], failed: [] as { id: string; error: string }[] };

    for (const pageId of pageIds) {
      try {
        await this.syncAfterApprove(siteId, pageId, locale);
        results.success.push(pageId);
      } catch (err: any) {
        results.failed.push({ id: pageId, error: err.message });
      }
    }

    return results;
  }
}

export const syncService = new SyncService();