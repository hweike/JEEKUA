// lib/AiHelper/services/product.service.ts
import { ITranslationService } from '../core/types';
import { getProductsByIds, updateProductTranslations } from '@/lib/products/services/product.service';
import sql from '@/lib/db/admin';

interface ExportVariant {
  id: string;
  product_name: string;
  short_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  attributes: Record<string, string>;
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
  attributes: Record<string, string>;
  variants: ExportVariant[];
}

interface ImportVariant {
  id: string;
  product_name: string;
  short_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  attributes: Record<string, string>;
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
  attributes: Record<string, string>;
  variants: ImportVariant[];
}

interface TranslationInput {
  language: string;
  products: ImportProduct[];
}

export const productAdapter: ITranslationService = {
  // ✅ 支持 options.ids 过滤
  async exportData(
    locale: string,
    options?: { ids?: string[] }
  ): Promise<{ sourceLanguage: string; products: ExportProduct[] }> {
    console.log(`[AI Helper] exportData 开始，locale: ${locale}，过滤ID数量: ${options?.ids?.length || 0}`);

    // ✅ 已迁移：查询父产品 ID 列表
    const conditions: any[] = [
      sql`site_id = ${'000001'}`,
      sql`locale = ${locale}`,
      sql`parent_product_id IS NULL`,
    ];
    if (options?.ids && options.ids.length > 0) {
      conditions.push(sql`"productId" IN ${sql(options.ids)}`);
    }
    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    let allProducts: { productId: string }[];
    try {
      allProducts = await sql<{ productId: string }[]>`
        SELECT "productId" FROM public.products
        WHERE ${whereClause}
      `;
    } catch (error: any) {
      throw new Error(`获取产品列表失败: ${error.message}`);
    }

    const productIds = allProducts.map(p => p.productId);
    console.log(`[AI Helper] 获取到 ${productIds.length} 个父产品 ID`);

    if (productIds.length === 0) {
      console.log('[AI Helper] 无产品，返回空数据');
      return { sourceLanguage: locale, products: [] };
    }

    const fullProducts = await getProductsByIds(locale, productIds);
    console.log(`[AI Helper] 成功获取 ${fullProducts.length} 个完整产品数据`);

    const extractVariant = (v: any): ExportVariant => ({
      id: v.id,
      product_name: v.product_name || '',
      short_description: v.short_description || '',
      seo_title: v.seo_title || '',
      seo_description: v.seo_description || '',
      seo_keywords: v.seo_keywords || '',
      attributes: v.attributes || {},
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
      attributes: p.attributes || {},
      variants: (p.variants || []).map(extractVariant),
    });

    const result = {
      sourceLanguage: locale,
      products: fullProducts.map(extractProduct),
    };
    console.log(`[AI Helper] exportData 完成，导出 ${result.products.length} 个产品`);
    return result;
  },

  generatePrompt(
    sourceLocale: string,
    targetLocales: string[],
    sourceData: any,
    languageNames: Record<string, string>
  ): string {
    // ... 完全不变 ...
    console.log(`[AI Helper] generatePrompt 开始，源语言: ${sourceLocale}, 目标语言: ${targetLocales.join(', ')}`);
    console.log(`[AI Helper] 产品数量: ${sourceData.products?.length || 0}`);

    const targetList = targetLocales
      .map(code => `${languageNames[code] || code} (${code})`)
      .join('、');
    const sourceDisplay = languageNames[sourceLocale] || sourceLocale;
    const productCount = sourceData.products?.length || 0;

    const prompt = `你是一位专业的产品翻译专家。请将以下 ${productCount} 个${sourceDisplay}产品（含变体）翻译为 ${targetList} 版本。

    【源语言】: ${sourceDisplay} (${sourceLocale})
    【目标语言】: ${targetList}

    【翻译要求】:
    1. 保持产品结构不变，包括父产品与变体的关系。
    2. 只翻译以下字段：
      - 父产品：product_name（产品名称）、short_description（简短描述）、description（详细描述）、spec_text（商品规格说明）、seo_title、seo_description、seo_keywords、attributes（产品属性键值对）
      - 变体：product_name（变体名称）、short_description、seo_title、seo_description、seo_keywords、attributes（变体属性键值对）
    3. 对于 description 和 spec_text 字段：
      - 这些字段可能包含 HTML 标签（如 <p>, <strong>, <ul>, <li> 等）。
      - 请完整保留所有 HTML 标签、属性、类名和结构。
      - 只翻译标签之间的用户可见文本（即标签内的自然语言内容）。
      - 不要翻译任何数字、单位（如 V, A, W, Hz）、型号代码（如 LM150-23BxxR2S）、标准编号或品牌名称。
    4. 对于 attributes 字段：
      - attributes 是一个键值对对象，其中键（如“型号”“功率”）和值（如“VCB48_SBO-30WR3-N”“30”）都需要翻译。
      - 对于值，同样遵循第3条规则：只翻译自然语言部分，保留数字、单位、型号代码等。
      - 翻译后的 attributes 对象应保持相同的键值对结构。
    5. 对于所有纯文本字段（product_name, short_description, seo_*），直接翻译自然语言内容。
    6. 不要翻译 id、任何技术标识符，也不要改变产品之间的关联关系。
    7. 翻译要准确、自然，符合目标语言的产品营销表达习惯；专业术语（如“开关电源”、“隔离电压”等）应使用行业标准译法。

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
              "attributes": { "翻译后的键": "翻译后的值" },
              "variants": [
                {
                  "id": "变体ID",
                  "product_name": "翻译后的变体名称",
                  "short_description": "翻译后的简短描述",
                  "seo_title": "翻译后的SEO标题",
                  "seo_description": "翻译后的SEO描述",
                  "seo_keywords": "翻译后的SEO关键词",
                  "attributes": { "翻译后的键": "翻译后的值" }
                }
              ]
            }
          ]
        }
      ]
    }

    请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;

    console.log(`[AI Helper] 生成的提示词长度: ${prompt.length} 字符`);
    return prompt;
  },

  async importTranslations(
    translations: TranslationInput[],
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    // ... 完全不变 ...
    console.log(`[AI Helper] importTranslations 开始，共 ${translations.length} 个语言翻译数据`);
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const translation of translations) {
      const { language, products: importedProducts } = translation;
      console.log(`[AI Helper] 开始导入语言 ${language}，产品数: ${importedProducts?.length || 0}`);
      if (!importedProducts || importedProducts.length === 0) continue;

      try {
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
              attributes: p.attributes,
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
                attributes: v.attributes,
              },
            }));
          }
          productUpdates.push(item);
        }

        console.log(`[AI Helper] 准备更新 ${language}，共 ${productUpdates.length} 个产品`);
        await updateProductTranslations(language, productUpdates, sourceLocale);
        imported += importedProducts.length;
        console.log(`[AI Helper] 语言 ${language} 导入成功，产品数: ${importedProducts.length}`);
      } catch (err: any) {
        failed += importedProducts.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`[AI Helper] 导入产品到 ${language} 失败:`, err);
      }
    }

    console.log(`[AI Helper] importTranslations 完成，成功 ${imported}，失败 ${failed}`);
    return { imported, failed, errors };
  },
};