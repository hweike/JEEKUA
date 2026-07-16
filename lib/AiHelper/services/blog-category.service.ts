// lib/AiHelper/services/blog-category.service.ts
import { ITranslationService } from '../core/types';
import { getCategories, updateCategoryTranslations } from '@/lib/blog/services/category.service';

interface ExportCategory {
  id: string;
  title: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

export const blogCategoryAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; categories: ExportCategory[] }> {
    const categories = await getCategories(locale);
    let filtered = categories;
    if (options?.ids && options.ids.length > 0) {
      const idSet = new Set(options.ids);
      filtered = categories.filter(c => idSet.has(c.id));
    }
    return {
      sourceLanguage: locale,
      categories: filtered.map(cat => ({
        id: cat.id,
        title: cat.title || '',
        seo_title: cat.seo_title || '',
        seo_description: cat.seo_description || '',
        seo_keywords: cat.seo_keywords || '',
      })),
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

    const count = sourceData.categories?.length || 0;

    return `你是一位专业的博客分类翻译专家。请将以下 ${count} 个${sourceDisplay}博客分类翻译为 ${targetList} 版本。

【源语言】: ${sourceDisplay} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持分类结构不变（无层级关系，仅独立分类）。
2. 只翻译以下字段：
   - title（分类名称）
   - seo_title（SEO元标题）
   - seo_description（SEO元描述）
   - seo_keywords（SEO核心关键词）
3. 不要翻译 id、任何技术标识符。
4. 翻译要准确、自然，符合目标语言的行文习惯，专业术语保持一致。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "categories": [
        {
          "id": "分类ID",
          "title": "翻译后的分类名称",
          "seo_title": "翻译后的SEO标题",
          "seo_description": "翻译后的SEO描述",
          "seo_keywords": "翻译后的SEO关键词"
        }
      ]
    }
  ]
}

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; categories: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, categories } = trans;
      if (!categories || categories.length === 0) continue;

      const categoryUpdates = categories.map((c: any) => ({
        id: c.id,
        name: c.title,                     // ← 注意：目标字段是 name（服务层使用 name）
        seo_title: c.seo_title,
        seo_description: c.seo_description,
        seo_keywords: c.seo_keywords,
      }));

      try {
        const result = await updateCategoryTranslations(language, categoryUpdates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += categories.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入博客分类到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};