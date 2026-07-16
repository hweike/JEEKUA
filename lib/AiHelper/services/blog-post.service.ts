// lib/AiHelper/services/blog-post.service.ts
import { ITranslationService } from '../core/types';
import { getPost, updatePostTranslations } from '@/lib/blog/services/post.service';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

interface ExportPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  tags: string[]; // 标记为数组
}

export const blogPostAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; posts: ExportPost[] }> {
    if (!options?.ids || options.ids.length === 0) {
      return { sourceLanguage: locale, posts: [] };
    }
    const id = options.ids[0]; // 只处理第一篇
    const post = await getPost(locale, id);
    if (!post) {
      throw new Error(`文章 ${id} 不存在`);
    }
    let tagsArray: string[] = [];
    try {
      tagsArray = post.tags ? JSON.parse(post.tags) : [];
    } catch {
      tagsArray = post.tags ? [post.tags] : [];
    }
    return {
      sourceLanguage: locale,
      posts: [{
        id: post.id,
        title: post.title,
        content: post.content || '',
        excerpt: post.excerpt || '',
        seo_keywords: post.seo_keywords || '',
        seo_title: post.seo_title || '',
        seo_description: post.seo_description || '',
        tags: tagsArray,
      }],
    };
  },

  generatePrompt(
    sourceLocale: string,
    targetLocales: string[],
    sourceData: any,
    languageNames: Record<string, string>
  ): string {
    const targetList = targetLocales
      .map(code => `${languageNames[code] || code} (${code})`)
      .join('、');
    const sourceDisplay = languageNames[sourceLocale] || sourceLocale;
    const count = sourceData.posts?.length || 0;

    return `你是一位专业的博客文章翻译专家。请将以下 ${count} 篇${sourceDisplay}博客文章翻译为 ${targetList} 版本。

【源语言】: ${sourceDisplay} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持文章结构不变。
2. 只翻译以下字段：
   - title（标题）
   - content（正文内容）
   - excerpt（摘要）
   - seo_keywords（SEO核心关键词）
   - seo_title（SEO元标题）
   - seo_description（SEO元描述）
   - tags（标记，以数组形式）
3. 不要翻译 id、任何技术标识符。
4. 翻译要准确、自然，符合目标语言的行文习惯，专业术语保持一致。
5. 对于正文内容（content），保留原有 Markdown 格式，仅翻译文本。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "posts": [
        {
          "id": "文章ID",
          "title": "翻译后的标题",
          "content": "翻译后的正文内容",
          "excerpt": "翻译后的摘要",
          "seo_keywords": "翻译后的SEO关键词",
          "seo_title": "翻译后的SEO标题",
          "seo_description": "翻译后的SEO描述",
          "tags": ["标记1", "标记2"]
        }
      ]
    }
  ]
}

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; posts: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, posts } = trans;
      if (!posts || posts.length === 0) continue;

      const postUpdates = posts.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        excerpt: p.excerpt,
        seo_keywords: p.seo_keywords,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        tags: p.tags, // 数组
      }));

      try {
        const result = await updatePostTranslations(language, postUpdates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += posts.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入博客文章到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};