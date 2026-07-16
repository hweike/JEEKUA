// lib/AiHelper/services/page.service.ts
import { ITranslationService } from '../core/types';
import { readPage, updatePageTranslations } from '@/lib/pages/pageService';

interface ExportPage {
  id: string;
  title: string;
  content: any;        // 完整的 templateData
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
}

export const pageAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; pages: ExportPage[] }> {
    if (!options?.ids || options.ids.length === 0) {
      return { sourceLanguage: locale, pages: [] };
    }
    const id = options.ids[0];
    const page = await readPage(locale, id);
    if (!page) throw new Error(`页面 ${id} 不存在`);
    return {
      sourceLanguage: locale,
      pages: [{
        id: page.id,
        title: page.title,
        content: page.templateData || {},
        seo_keywords: page.seo_keywords || '',
        seo_title: page.seo_title || '',
        seo_description: page.seo_description || '',
      }],
    };
  },

  generatePrompt(
    sourceLocale: string,
    targetLocales: string[],
    sourceData: any,
    languageNames: Record<string, string>
  ): string {
    const targetList = targetLocales.map(c => `${languageNames[c]||c} (${c})`).join('、');
    const src = languageNames[sourceLocale] || sourceLocale;
    const count = sourceData.pages?.length || 0;

    return `你是一位专业的网页翻译专家。请将以下 ${count} 个${src}页面翻译为 ${targetList} 版本。

【源语言】: ${src} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持页面结构不变，保留所有组件配置、样式属性、链接、图片URL等非文本数据。
2. 只翻译以下字段：
   - title（页面标题）
   - seo_keywords（SEO关键词）
   - seo_title（SEO标题）
   - seo_description（SEO描述）
   - content（页面内容，这是一个JSON对象，包含多个组件的配置）
3. 对于 content 对象：遍历所有文本值（如 title, text, description, buttonText, label 等字段），仅翻译这些可见文本，保持数字、布尔值、URL、颜色值等不变。
4. 不要翻译 id、slug、模板哈希等技术标识符。
5. 翻译要准确自然，符合目标语言的表达习惯。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "pages": [
        {
          "id": "页面ID",
          "title": "翻译后的标题",
          "content": { ... }  // 翻译后的完整 content 对象（结构和原对象一致，仅文本被翻译）
          "seo_keywords": "翻译后的SEO关键词",
          "seo_title": "翻译后的SEO标题",
          "seo_description": "翻译后的SEO描述"
        }
      ]
    }
  ]
}

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; pages: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0, failed = 0, errors: string[] = [];
    for (const trans of translations) {
      const { language, pages } = trans;
      if (!pages?.length) continue;
      const updates = pages.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        seo_keywords: p.seo_keywords,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
      }));
      try {
        const result = await updatePageTranslations(language, updates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length) errors.push(...result.errors);
      } catch (err: any) {
        failed += pages.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
      }
    }
    return { imported, failed, errors };
  },
};