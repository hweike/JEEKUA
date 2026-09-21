// lib/AiHelper/services/product-line.service.ts
import { ITranslationService } from '../core/types';
import { getProductLines, updateProductLineTranslations } from '@/lib/products/services/product-line.service';

interface ExportProductLine {
  id: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

export const productLineAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; productLines: ExportProductLine[] }> {
    const lines = await getProductLines(locale);
    let filtered = lines;
    if (options?.ids && options.ids.length > 0) {
      const idSet = new Set(options.ids);
      filtered = lines.filter(pl => idSet.has(pl.id));
    }
    return {
      sourceLanguage: locale,
      productLines: filtered.map(pl => ({
        id: pl.id,
        name: pl.name,
        seoTitle: pl.seoTitle || '',
        seoDescription: pl.seoDescription || '',
        seoKeywords: pl.seoKeywords || '',
      })),
    };
  },

  generatePrompt(
    sourceLocale: string,
    targetLocales: string[],
    sourceData: any,
    languageNames: Record<string, string>
  ): string {
    const targetList = targetLocales.map(c => `${languageNames[c] || c} (${c})`).join('、');
    const src = languageNames[sourceLocale] || sourceLocale;
    const count = sourceData.productLines?.length || 0;

    return `你是一位专业的产品线翻译专家。请将以下 ${count} 个${src}产品线翻译为 ${targetList} 版本。

【源语言】: ${src} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持产品线结构不变。
2. 只翻译以下字段：
   - name（产品线名称）
   - seoTitle（SEO元标题）
   - seoDescription（SEO元描述）
   - seoKeywords（SEO核心关键词）
3. 不要翻译 id、任何技术标识符。
4. 翻译要准确、自然，符合目标语言的产品营销表达习惯。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "productLines": [
        {
          "id": "产品线ID",
          "name": "翻译后的产品线名称",
          "seoTitle": "翻译后的SEO标题",
          "seoDescription": "翻译后的SEO描述",
          "seoKeywords": "翻译后的SEO关键词"
        }
      ]
    }
  ]
}

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; productLines: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0, failed = 0, errors: string[] = [];
    for (const trans of translations) {
      const { language, productLines } = trans;
      if (!productLines || productLines.length === 0) continue;
      const updates = productLines.map((p: any) => ({
        id: p.id,
        name: p.name,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        seoKeywords: p.seoKeywords,
      }));
      try {
        const result = await updateProductLineTranslations(language, updates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length) errors.push(...result.errors);
      } catch (err: any) {
        failed += productLines.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
      }
    }
    return { imported, failed, errors };
  },
};