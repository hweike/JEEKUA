// =====================================================
// SEO 同步服务
// 职责：将确认发布的 SEO 数据同步到业务表和源文件（JSON / MD）
// 调用时机：approveSeo 成功后调用
// =====================================================

import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage } from '@/lib/storage/factory';
import matter from 'gray-matter';

const DEFAULT_SITE_ID = '000001';
const storage = getPrivateStorage();

export class SyncService {
  /**
   * 同步确认发布的 SEO 数据（顶层入口，捕获所有错误）
   */
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
          await this.syncProduct(siteId, rawId, locale, page);
          break;
        case 'blogPost':
          await this.syncBlogPost(siteId, rawId, locale, page);
          break;
        case 'doc':
          await this.syncDoc(siteId, rawId, locale, page);
          break;
        case 'page':
          await this.syncPage(siteId, rawId, locale, page);
          break;
        case 'video':
          await this.syncVideo(siteId, rawId, locale, page);
          break;

        // ---- JSON 文件类型 ----
        case 'productLine':
          await this.syncProductLine(siteId, rawId, locale, page);
          break;
        case 'productCollection':
          await this.syncProductCollection(siteId, rawId, locale, page);
          break;
        case 'blogCategory':
          await this.syncBlogCategory(siteId, rawId, locale, page);
          break;
        case 'docLibrary':
          await this.syncDocLibrary(siteId, rawId, locale, page);
          break;
        case 'videoCategory':
          await this.syncVideoCategory(siteId, rawId, locale, page);
          break;

        case 'inquiry':
        case 'policy':
          console.log(`暂不同步: ${page.type} (${pageId})`);
          break;

        default:
          console.warn(`未知页面类型: ${page.type}，跳过同步`);
      }
    } catch (error) {
      console.error(`同步服务执行失败 (${pageId}, ${locale}):`, error);
    }
  }

  // ============================================================
  // 原有同步方法（product, blogPost, doc, page, video）
  // 保持不变
  // ============================================================

  private async syncProduct(
    siteId: string,
    productId: string,
    locale: string,
    page: any
  ): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          seo_keywords: page.seo_keywords,
          updatedAt: new Date().toISOString(),
        })
        .eq('site_id', siteId)
        .eq('productId', productId)
        .eq('locale', locale);

      if (updateError) {
        console.error(`更新 products 表失败 (${productId}):`, updateError);
        return;
      }

      await this.updateProductMd(siteId, productId, locale, page);
    } catch (error) {
      console.error(`同步产品 ${productId} 失败:`, error);
    }
  }

  private async updateProductMd(
    siteId: string,
    productId: string,
    locale: string,
    page: any
  ): Promise<void> {
    const mdKey = `products/${locale}/products/${productId}.md`;
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

      data.seo_title = page.seo_title || null;
      data.seo_description = page.seo_description || null;
      data.seo_keywords = page.seo_keywords || null;

      const newContent = matter.stringify(content, data);
      await storage.write(mdKey, newContent, { contentType: 'text/markdown' });
      console.log(`✅ 更新产品 MD 文件: ${mdKey}`);
    } catch (err) {
      console.error(`更新产品 MD 文件失败 (${productId}):`, err);
    }
  }

  private async syncBlogPost(
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
        return;
      }

      await this.updateBlogPostMd(siteId, postId, locale, page);
    } catch (error) {
      console.error(`同步博客文章 ${postId} 失败:`, error);
    }
  }

  private async updateBlogPostMd(
    siteId: string,
    postId: string,
    locale: string,
    page: any
  ): Promise<void> {
    const mdKey = `blog/${locale}/posts/${postId}.md`;
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

      data.seo_title = page.seo_title || null;
      data.seo_description = page.seo_description || null;
      data.seo_keywords = page.seo_keywords || null;

      const newContent = matter.stringify(content, data);
      await storage.write(mdKey, newContent, { contentType: 'text/markdown' });
      console.log(`✅ 更新博客 MD 文件: ${mdKey}`);
    } catch (err) {
      console.error(`更新博客 MD 文件失败 (${postId}):`, err);
    }
  }

  private async syncDoc(
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
        return;
      }

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('lib_id, file')
        .eq('site_id', siteId)
        .eq('id', docId)
        .eq('locale', locale)
        .maybeSingle();

      if (docError || !doc) {
        console.warn(`文档 ${docId} 不存在或获取失败，跳过 MD 同步`);
        return;
      }

      const mdKey = `docs/${locale}/${doc.lib_id}/${doc.file}`;
      await this.updateMdFile(mdKey, page);
    } catch (error) {
      console.error(`同步文档 ${docId} 失败:`, error);
    }
  }

  private async syncPage(
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
        return;
      }

      const mdKey = `pages/${locale}/${pageId}.md`;
      await this.updateMdFile(mdKey, page);
    } catch (error) {
      console.error(`同步页面 ${pageId} 失败:`, error);
    }
  }

  private async syncVideo(
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
        return;
      }

      const mdKey = `videosys/${locale}/${videoId}.md`;
      await this.updateMdFile(mdKey, page);
    } catch (error) {
      console.error(`同步视频 ${videoId} 失败:`, error);
    }
  }

  private async updateMdFile(mdKey: string, page: any): Promise<void> {
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

      data.seo_title = page.seo_title || null;
      data.seo_description = page.seo_description || null;
      data.seo_keywords = page.seo_keywords || null;

      const newContent = matter.stringify(content, data);
      await storage.write(mdKey, newContent, { contentType: 'text/markdown' });
      console.log(`✅ 更新 MD 文件: ${mdKey}`);
    } catch (err) {
      console.error(`更新 MD 文件失败 (${mdKey}):`, err);
    }
  }

  // ============================================================
  // 新增：JSON 文件类型的同步方法（适配实际格式）
  // ============================================================

  /**
   * 产品线：products/{locale}/categories.json 中的 productLines[]
   * 字段：seoTitle, seoDescription, seoKeywords
   */
  private async syncProductLine(
    siteId: string,
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

  /**
   * 产品分类：products/{locale}/categories.json 中的 categories[] 和 series[]
   * 一级分类字段：seoTitle, seoDescription, seoKeywords
   * 二级分类字段：同上
   * page.id 格式：productCollection:{catId} 或 productCollection:{catId}/{subId}
   */
  private async syncProductCollection(
    siteId: string,
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
        // 一级分类
        const cat = data.categories.find((c: any) => c.id === parts[0]);
        if (!cat) {
          console.warn(`未找到一级分类 id=${parts[0]} in ${jsonPath}`);
          return;
        }
        cat.seoTitle = page.seo_title || '';
        cat.seoDescription = page.seo_description || '';
        cat.seoKeywords = page.seo_keywords || '';
      } else if (parts.length === 2) {
        // 二级分类（series）
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

  /**
   * 博客分类：blog/{locale}/categories.json 数组，字段为 seo_title, seo_description, seo_keywords
   * page.id 格式：blogCategory:{categoryId}
   */
  private async syncBlogCategory(
    siteId: string,
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

  /**
   * 文档库：docs/{locale}/libs.json 数组，字段为 seo_title, seo_description, seo_keywords
   * page.id 格式：docLibrary:{libId}
   */
  private async syncDocLibrary(
    siteId: string,
    rawId: string,
    locale: string,
    page: any
  ): Promise<void> {
    const jsonPath = `docs/${locale}/libs.json`;
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

  /**
   * 视频分类：videosys/{locale}/categories.json 对象，键为 id，值为分类信息
   * 字段：seo_title, seo_description, seo_keywords
   * page.id 格式：videoCategory:{categoryId}
   */
  private async syncVideoCategory(
    siteId: string,
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

  // ============================================================
  // 批量同步
  // ============================================================

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