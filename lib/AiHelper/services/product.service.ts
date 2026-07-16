// lib/AiHelper/services/product.service.ts
import { ITranslationService } from '../core/types';
import { getProductsByIds, updateProductTranslations } from '@/lib/products/services/product.service';

// ====== 导出数据结构（仅翻译字段） ======
interface ExportVariant {
  id: string;
  product_name: string;
  short_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

interface ExportProduct {
  id: string;
  product_name: string;
  short_description: string;
  description: string;
  spec_text: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  variants: ExportVariant[];
}

// ====== 导入数据结构 ======
interface ImportVariant {
  id: string;
  product_name: string;
  short_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

interface ImportProduct {
  id: string;
  product_name: string;
  short_description: string;
  description: string;
  spec_text: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  variants: ImportVariant[];
}

interface TranslationInput {
  language: string;
  products: ImportProduct[];
}

export const productAdapter: ITranslationService = {
  /**
   * 导出源语言产品数据（仅翻译字段）
   */
  async exportData(locale: string): Promise<{ sourceLanguage: string; products: ExportProduct[] }> {
    // 从索引获取所有父产品 ID（只导出父产品，变体随父产品一起导出）
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('productId')
      .eq('site_id', '000001')
      .eq('locale', locale)
      .is('parent_product_id', null);
    if (error) throw new Error(`获取产品列表失败: ${error.message}`);
    const productIds = allProducts.map(p => p.productId);
    if (productIds.length === 0) {
      return { sourceLanguage: locale, products: [] };
    }

    // 批量获取完整产品数据（含变体）
    const fullProducts = await getProductsByIds(locale, productIds);

    const extractVariant = (v: any): ExportVariant => ({
      id: v.id,
      product_name: v.product_name || '',
      short_description: v.short_description || '',
      seo_title: v.seo_title || '',
      seo_description: v.seo_description || '',
      seo_keywords: v.seo_keywords || '',
    });

    const extractProduct = (p: any): ExportProduct => ({
      id: p.id,
      product_name: p.product_name || '',
      short_description: p.short_description || '',
      description: p.description || '',
      spec_text: p.spec_text || '',
      seo_title: p.seo_title || '',
      seo_description: p.seo_description || '',
      seo_keywords: p.seo_keywords || '',
      variants: (p.variants || []).map(extractVariant),
    });

    return {
      sourceLanguage: locale,
      products: fullProducts.map(extractProduct),
    };
  },

  /**
   * 生成 AI 提示词（产品专用）
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

  const productCount = sourceData.products?.length || 0;

  return `你是一位专业的产品翻译专家。请将以下 ${productCount} 个${sourceDisplay}产品（含变体）翻译为 ${targetList} 版本。

  【源语言】: ${sourceDisplay} (${sourceLocale})
  【目标语言】: ${targetList}

  【翻译要求】:
  1. 保持产品结构不变，包括父产品与变体的关系。
  2. 只翻译以下字段：
    - 父产品：product_name（产品名称）、short_description（简短描述）、description（详细描述）、spec_text（商品规格说明）、seo_title、seo_description、seo_keywords
    - 变体：product_name（变体名称）、short_description、seo_title、seo_description、seo_keywords
  3. 对于 description 和 spec_text 字段：
    - 这些字段可能包含 HTML 标签（如 <p>, <strong>, <ul>, <li> 等）。
    - 请完整保留所有 HTML 标签、属性、类名和结构。
    - 只翻译标签之间的用户可见文本（即标签内的自然语言内容）。
    - 不要翻译任何数字、单位（如 V, A, W, Hz）、型号代码（如 LM150-23BxxR2S）、标准编号或品牌名称。
  4. 对于所有纯文本字段（product_name, short_description, seo_*），直接翻译自然语言内容。
  5. 不要翻译 id、任何技术标识符，也不要改变产品之间的关联关系。
  6. 翻译要准确、自然，符合目标语言的产品营销表达习惯；专业术语（如“开关电源”、“隔离电压”等）应使用行业标准译法。

  【输入数据】（JSON格式）:
  {{SOURCE_DATA_JSON}}

  【输出格式】:
  请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

  {
    "sourceLanguage": "${sourceLocale}",
    "translations": [
      {
        "language": "目标语言代码",
        "products": [
          {
            "id": "产品ID",
            "product_name": "翻译后的产品名称",
            "short_description": "翻译后的简短描述",
            "description": "翻译后的详细描述（保留HTML结构，仅替换可见文本）",
            "spec_text": "翻译后的规格说明（保留HTML结构，仅替换可见文本）",
            "seo_title": "翻译后的SEO标题",
            "seo_description": "翻译后的SEO描述",
            "seo_keywords": "翻译后的SEO关键词",
            "variants": [
              {
                "id": "变体ID",
                "product_name": "翻译后的变体名称",
                "short_description": "翻译后的简短描述",
                "seo_title": "翻译后的SEO标题",
                "seo_description": "翻译后的SEO描述",
                "seo_keywords": "翻译后的SEO关键词"
              }
            ]
          }
        ]
      }
    ]
  }

  请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  /**
   * 导入多语言产品翻译数据
   */
  async importTranslations(
    translations: TranslationInput[],
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const translation of translations) {
      const { language, products: importedProducts } = translation;
      if (!importedProducts || importedProducts.length === 0) continue;

      try {
        // 构造 updateProductTranslations 所需的数据结构
        const productUpdates: any[] = [];
        for (const p of importedProducts) {
          const item: any = {
            productId: p.id,
            fields: {
              product_name: p.product_name,
              short_description: p.short_description,
              description: p.description,
              spec_text: p.spec_text,
              seo_title: p.seo_title,
              seo_description: p.seo_description,
              seo_keywords: p.seo_keywords,
            },
          };
          if (p.variants && p.variants.length > 0) {
            item.variants = p.variants.map((v: any) => ({
              id: v.id,
              fields: {
                product_name: v.product_name,
                short_description: v.short_description,
                seo_title: v.seo_title,
                seo_description: v.seo_description,
                seo_keywords: v.seo_keywords,
              },
            }));
          }
          productUpdates.push(item);
        }

        // 批量更新
        await updateProductTranslations(language, productUpdates, sourceLocale);
        imported += importedProducts.length;
      } catch (err: any) {
        failed += importedProducts.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入产品到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};