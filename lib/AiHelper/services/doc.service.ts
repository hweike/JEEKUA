// lib/AiHelper/services/doc.service.ts
import { ITranslationService } from '../core/types';
import { getDocument, updateDocTranslations } from '@/lib/docs/document';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ====== 导出数据结构 ======
interface ExportDoc {
  id: string;
  title: string;
  content: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

export const docAdapter: ITranslationService = {
  /**
   * 导出源语言文档数据（仅翻译字段）
   * @param locale 源语言
   * @param options 可选参数，包含要导出的文档 ID 列表
   */
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; docs: ExportDoc[] }> {
    // 如果没有提供 ids，则无法导出，返回空
    if (!options?.ids || options.ids.length === 0) {
      return { sourceLanguage: locale, docs: [] };
    }

    // 只处理第一个文档（每次只翻译一篇）
    const docId = options.ids[0];
    if (!docId) {
      throw new Error('文档 ID 无效');
    }

    // 需要先获取该文档的 lib_id
    const { data: docInfo, error: infoError } = await supabase
      .from('documents')
      .select('lib_id')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', docId)
      .eq('locale', locale)
      .maybeSingle();

    if (infoError || !docInfo) {
      throw new Error(`无法获取文档 ${docId} 的信息: ${infoError?.message || '不存在'}`);
    }

    const doc = await getDocument(locale, docInfo.lib_id, docId);
    if (!doc) {
      throw new Error(`文档 ${docId} 不存在`);
    }

    return {
      sourceLanguage: locale,
      docs: [{
        id: doc.id,
        title: doc.title,
        content: doc.content || '',
        seo_title: doc.seo_title || '',
        seo_description: doc.seo_description || '',
        seo_keywords: doc.seo_keywords || '',
      }],
    };
  },

  /**
   * 生成 AI 提示词（文档专用）
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

    const docCount = sourceData.docs?.length || 0;

    return `你是一位专业的文档翻译专家。请将以下 ${docCount} 篇${sourceDisplay}文档翻译为 ${targetList} 版本。

【源语言】: ${sourceDisplay} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持文档结构不变。
2. 只翻译以下字段：
   - title（标题）
   - content（正文内容）
   - seo_title（SEO元标题）
   - seo_description（SEO元描述）
   - seo_keywords（SEO核心关键词）
3. 不要翻译 id、任何技术标识符。
4. 翻译要准确、自然，符合目标语言的行文习惯，专业术语保持一致。
5. 对于正文内容（content），保留原有格式（如 Markdown 或 HTML，根据源内容格式），仅翻译文本，不改变格式标记。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "docs": [
        {
          "id": "文档ID",
          "title": "翻译后的标题",
          "content": "翻译后的正文内容",
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
   * 导入多语言文档翻译数据
   */
  async importTranslations(
    translations: Array<{ language: string; docs: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, docs } = trans;
      if (!docs || docs.length === 0) continue;

      // 构建翻译数组
      const docUpdates = docs.map((d: any) => ({
        docId: d.id,
        title: d.title,
        content: d.content,
        seo_title: d.seo_title,
        seo_description: d.seo_description,
        seo_keywords: d.seo_keywords,
      }));

      try {
        const result = await updateDocTranslations(language, docUpdates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += docs.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入文档到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};