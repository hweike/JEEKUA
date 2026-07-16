// lib/AiHelper/services/product-category.service.ts

import { ITranslationService } from '../core/types';
import { getCategories, saveCategories } from '@/lib/products/services/category.service';

// ====== 本地类型定义（与业务应用数据结构匹配） ======
interface Series {
  id: string;
  name: string;
  slug: string;
  order: number;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  productLineId: string;
  templateId: string;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  attributeTemplateId: string;
  series: Series[];
}

// ====== 导出数据结构 ======
interface ExportSeries {
  id: string;
  name: string;
  description: string;
  seoKeywords: string;
  seoTitle: string;
  seoDescription: string;
}

interface ExportCategory {
  id: string;
  name: string;
  description: string;
  seoKeywords: string;
  seoTitle: string;
  seoDescription: string;
  series: ExportSeries[];
}

// ====== 导入数据结构 ======
interface TranslationCategory {
  id: string;
  name: string;
  description: string;
  seoKeywords: string;
  seoTitle: string;
  seoDescription: string;
  series: ExportSeries[];
}

interface TranslationInput {
  language: string;
  categories: TranslationCategory[];
}

// ====== 适配器实现 ======
export const productCategoryAdapter: ITranslationService = {
  /**
   * 导出源语言分类数据（仅翻译字段）
   */
  async exportData(locale: string): Promise<{ sourceLanguage: string; categories: ExportCategory[] }> {
    const categories = await getCategories(locale) as Category[];

    const extractSeries = (series: Series[]): ExportSeries[] => {
      return series.map((s: Series) => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        seoKeywords: s.seoKeywords || '',
        seoTitle: s.seoTitle || '',
        seoDescription: s.seoDescription || '',
      }));
    };

    const extractCategory = (cat: Category): ExportCategory => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || '',
      seoKeywords: cat.seoKeywords || '',
      seoTitle: cat.seoTitle || '',
      seoDescription: cat.seoDescription || '',
      series: extractSeries(cat.series || []),
    });

    return {
      sourceLanguage: locale,
      categories: categories.map(extractCategory),
    };
  },

  /**
   * 生成 AI 提示词（产品分类专用）
   */
  generatePrompt(
    sourceLocale: string,
    targetLocales: string[],
    sourceData: any,
    languageNames: Record<string, string>
  ): string {
    const targetList = targetLocales
      .map((code: string) => `${languageNames[code] || code} (${code})`)
      .join('、');

    const sourceDisplay = languageNames[sourceLocale] || sourceLocale;

    return `你是一位专业的产品分类翻译专家。请将以下${sourceDisplay}产品分类数据翻译为 ${targetList} 版本。

【源语言】: ${sourceDisplay} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持分类层级结构不变（一级分类和二级分类的关系）。
2. 只翻译以下字段：name（名称）、description（描述）、seoKeywords（SEO关键词）、seoTitle（SEO元标题）、seoDescription（SEO元描述）。
3. 不要翻译 id、任何技术标识符，也不要改变分类之间的关联关系。
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
      "categories": [ ... ]   // 与源数据结构相同，但 name/description/seo* 为目标语言
    }
  ]
}

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  /**
   * 导入多语言翻译数据
   */
  async importTranslations(
    translations: TranslationInput[],
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    // 1. 获取源语言完整分类
    const sourceCategories = await getCategories(sourceLocale) as Category[];
    const sourceMap = new Map(sourceCategories.map((c: Category) => [c.id, c]));

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // 2. 遍历每个目标语言
    for (const translation of translations) {
      const { language, categories: translatedCats } = translation;

      try {
        // 获取目标语言现有分类（若不存在则为空数组）
        let targetCategories: Category[] = [];
        try {
          targetCategories = await getCategories(language) as Category[];
        } catch {
          targetCategories = [];
        }
        const targetMap = new Map(targetCategories.map((c: Category) => [c.id, c]));

        // 3. 合并翻译数据与源数据
        for (const transCat of translatedCats) {
          const sourceCat = sourceMap.get(transCat.id);
          if (!sourceCat) {
            errors.push(`分类 ${transCat.id} 在源语言中不存在，已跳过`);
            failed++;
            continue;
          }

          // 复制源分类的所有字段，然后覆盖翻译字段
          const mergedCat: Category = {
            ...sourceCat,
            name: transCat.name || sourceCat.name,
            description: transCat.description || sourceCat.description,
            seoKeywords: transCat.seoKeywords || sourceCat.seoKeywords,
            seoTitle: transCat.seoTitle || sourceCat.seoTitle,
            seoDescription: transCat.seoDescription || sourceCat.seoDescription,
          };

          // 处理 series
          if (transCat.series && transCat.series.length > 0) {
            const sourceSeriesMap = new Map(sourceCat.series.map((s: Series) => [s.id, s]));

            mergedCat.series = transCat.series.map((transSeries: ExportSeries) => {
              const sourceSeries = sourceSeriesMap.get(transSeries.id);
              if (sourceSeries) {
                // 复制源系列的非翻译字段，覆盖翻译字段
                return {
                  ...sourceSeries,
                  name: transSeries.name || sourceSeries.name,
                  description: transSeries.description || sourceSeries.description,
                  seoKeywords: transSeries.seoKeywords || sourceSeries.seoKeywords,
                  seoTitle: transSeries.seoTitle || sourceSeries.seoTitle,
                  seoDescription: transSeries.seoDescription || sourceSeries.seoDescription,
                };
              } else {
                // 源中无此系列 id，视为新增（使用翻译数据）
                return {
                  id: transSeries.id,
                  name: transSeries.name || '',
                  slug: '',
                  order: 0,
                  image: '',
                  description: transSeries.description || '',
                  seoTitle: transSeries.seoTitle || '',
                  seoDescription: transSeries.seoDescription || '',
                  seoKeywords: transSeries.seoKeywords || '',
                };
              }
            });
          } else {
            // 如果没有 series 翻译，保留源 series
            mergedCat.series = sourceCat.series.map((s: Series) => ({ ...s }));
          }

          targetMap.set(mergedCat.id, mergedCat);
          imported++;
        }

        // 4. 保存目标语言分类
        const result = Array.from(targetMap.values());
        result.sort((a: Category, b: Category) => a.order - b.order);
        result.forEach((cat: Category) => cat.series.sort((a: Series, b: Series) => a.order - b.order));

        await saveCategories(language, result);
      } catch (err: any) {
        const errorMsg = err.message || '未知错误';
        failed += translatedCats.length;
        errors.push(`语言 ${language} 导入失败: ${errorMsg}`);
        console.error(`导入分类到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};