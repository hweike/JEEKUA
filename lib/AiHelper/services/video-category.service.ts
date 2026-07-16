// lib/AiHelper/services/video-category.service.ts
import { ITranslationService } from '../core/types';
import { getCategoriesList, updateCategoryTranslations } from '@/lib/videosys/services/category.service';

// ====== 导出数据结构 ======
interface ExportCategory {
  id: string;
  name: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

export const videoCategoryAdapter: ITranslationService = {
  /**
   * 导出源语言所有视频分类（仅翻译字段）
   */
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: locale; categories: ExportCategory[] }> {
    const categories = await getCategoriesList(locale);
    // 如果指定了 ids，则只导出指定分类
    let filtered = categories;
    if (options?.ids && options.ids.length > 0) {
      const idSet = new Set(options.ids);
      filtered = categories.filter(c => idSet.has(c.key));
    }
    return {
      sourceLanguage: locale,
      categories: filtered.map(cat => ({
        id: cat.key,
        name: cat.name,
        seo_title: cat.seo_title || '',
        seo_description: cat.seo_description || '',
        seo_keywords: cat.seo_keywords || '',
      })),
    };
  },

  /**
   * 生成 AI 提示词（视频分类专用）
   */
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

    return `你是一位专业的视频分类翻译专家。请将以下 ${count} 个${sourceDisplay}视频分类翻译为 ${targetList} 版本。

【源语言】: ${sourceDisplay} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持分类结构不变（无层级关系，仅独立分类）。
2. 只翻译以下字段：
   - name（分类名称）
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
          "name": "翻译后的分类名称",
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

  /**
   * 导入多语言视频分类翻译数据
   */
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
        key: c.id,
        name: c.name,
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
        console.error(`导入视频分类到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};