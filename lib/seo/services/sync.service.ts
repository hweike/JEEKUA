// =====================================================
// SEO 同步服务（按最新需求重构）
// =====================================================

import { supabase } from '@/lib/supabase/client';
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
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('id, type, seo_title, seo_description, seo_keywords')
        .eq('site_id', siteId)
        .eq('id', pageId)
        .eq('locale', locale)
        .maybeSingle();

      if (pageError || !page) {
        console.warn(`同步跳过: 页面 ${pageId} 获取失败`, pageError?.message);
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
  // 1. product：判断父产品还是变体
  // ============================================================
  private async syncProduct(
    productId: string,
    locale: string,
    page: any
  ): Promise<void> {
    const isVariant = productId.includes('/');

    if (isVariant) {
      await this.syncVariantProductMd(productId, locale, page);
    } else {
      await this.syncParentProductMd(productId, locale, page);
    }
  }

  /**
   * 父产品：更新 MD 文件中的根 seo 字段
   */
  private async syncParentProductMd(
    productId: string,
    locale: string,
    page: any
  ): Promise<void> {
    const mdKey = `products/${locale}/products/${productId}.md`;
    await this.updateMdFile(mdKey, page, null);
    console.log(`✅ 更新父产品根 seo: ${mdKey}`);
  }

  /**
   * 变体产品：更新 MD 文件中 variants 数组对应变体的 seo_* 字段
   */
  private async syncVariantProductMd(
    productId: string,
    locale: string,
    page: any
  ): Promise<void> {
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

  /**
   * 检查变体是否存在于 MD 文件中
   */
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
  // 2a. productLine：更新 categories.json
  // ============================================================
  private async syncProductLineJson(
    rawId: string,
    locale: string,
    page: any
  ): Promise<void> {
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
  // 2b. productCollection：更新 categories.json
  // ============================================================
  private async syncProductCollectionJson(
    rawId: string,
    locale: string,
    page: any
  ): Promise<void> {
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
  // 3. blogPost：只更新 blog_posts 表
  // ============================================================
  private async syncBlogPostTable(
    siteId: string,
    postId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          seo_keywords: page.seo_keywords,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', siteId)
        .eq('id', postId)
        .eq('locale', locale);

      if (updateError) {
        console.error(`更新 blog_posts 表失败 (${postId}):`, updateError);
      } else {
        console.log(`✅ 更新 blog_posts 表: ${postId}`);
      }
    } catch (error) {
      console.error(`同步博客文章 ${postId} 失败:`, error);
    }
  }

  // ============================================================
  // 4. blogCategory：只更新 categories.json
  // ============================================================
  private async syncBlogCategoryJson(
    rawId: string,
    locale: string,
    page: any
  ): Promise<void> {
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
  // 5. docLibrary：更新 docs/libs.json
  // ============================================================
  private async syncDocLibraryJson(
    rawId: string,
    page: any
  ): Promise<void> {
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
  // 6. doc：只更新 documents 表
  // ============================================================
  private async syncDocTable(
    siteId: string,
    docId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          seo_keywords: page.seo_keywords,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', siteId)
        .eq('id', docId)
        .eq('locale', locale);

      if (updateError) {
        console.error(`更新 documents 表失败 (${docId}):`, updateError);
      } else {
        console.log(`✅ 更新 documents 表: ${docId}`);
      }
    } catch (error) {
      console.error(`同步文档 ${docId} 失败:`, error);
    }
  }

  // ============================================================
  // 7. videoCategory：只更新 categories.json
  // ============================================================
  private async syncVideoCategoryJson(
    rawId: string,
    locale: string,
    page: any
  ): Promise<void> {
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
  // 8. video：更新 videos 表 + MD 文件
  // ============================================================
  private async syncVideoTableAndMd(
    siteId: string,
    videoId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          seo_keywords: page.seo_keywords,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', siteId)
        .eq('id', videoId)
        .eq('locale', locale);

      if (updateError) {
        console.error(`更新 videos 表失败 (${videoId}):`, updateError);
      } else {
        console.log(`✅ 更新 videos 表: ${videoId}`);
      }

      const mdKey = `videosys/${locale}/${videoId}.md`;
      await this.updateMdFile(mdKey, page, null);
    } catch (error) {
      console.error(`同步视频 ${videoId} 失败:`, error);
    }
  }

  // ============================================================
  // 9. home, page, inquiry, policy：更新 site_pages 表 + MD 文件
  // ============================================================
  private async syncSitePageTableAndMd(
    siteId: string,
    pageId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('site_pages')
        .update({
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          seo_keywords: page.seo_keywords,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', siteId)
        .eq('id', pageId)
        .eq('locale', locale);

      if (updateError) {
        console.error(`更新 site_pages 表失败 (${pageId}):`, updateError);
      } else {
        console.log(`✅ 更新 site_pages 表: ${pageId}`);
      }

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

  /**
   * 更新 MD 文件
   * - 父产品（variantId = null）：更新根 seo_title, seo_description, seo_keywords
   * - 变体（variantId 有值）：更新 variants 数组中对应变体的 seo_title, seo_description, seo_keywords
   */
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
        // ============================================================
        // ✅ 变体：直接修改 variants 数组中对应变体的 seo_* 字段
        // ============================================================
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
        // ============================================================
        // ✅ 父产品：更新根 seo 字段
        // ============================================================
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