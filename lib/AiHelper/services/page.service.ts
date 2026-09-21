// lib/AiHelper/services/page.service.ts
import { ITranslationService } from '../core/types';
import { readPage, updatePageTranslations } from '@/lib/pages/pageService';

interface ExportPage {
  id: string;
  title: string;
  content: string;      // 独立内容
  templateData: any;    // 组件配置
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
        content: page.content || '',
        templateData: page.templateData || {},
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
    const targetList = targetLocales.map(c => `${languageNames[c] || c} (${c})`).join('、');
    const src = languageNames[sourceLocale] || sourceLocale;
    const count = sourceData.pages?.length || 0;

    return `你是一位专业的网页翻译专家。请将以下 ${count} 个${src}页面翻译为 ${targetList} 版本。

【源语言】: ${src} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持页面结构不变，保留所有组件配置、样式属性、链接、图片URL等非文本数据。
2. **必须翻译的字段**（无论原始语言是什么，一律翻译为目标语言）：
   - 所有用户可见的文本字段，包括但不限于：
     * 标题类：title, subtitle, heading, subheading, globalTitle, label, caption
     * 描述类：text, description, paragraph, content, excerpt, summary
     * 按钮类：buttonText, button1Text, button2Text, linkLabel, buttonLabel
     * SEO类：seo_title, seo_description, seo_keywords
     * 其他：alt, placeholder, tooltip, message, announcement
   - **特别强调**：必须递归遍历所有嵌套数组（如 images, contents, items, columns, rows, slides, accordions 等），确保数组内每个元素的文本字段都被翻译。
3. **不翻译的字段**（保持原值）：
   - 所有以 "id" 结尾或等于 "id" 的字段
   - 所有 URL 类字段：link, url, href, src, imageUrl, image1Url, image2Url, videoUrl, videoThumbnail, buttonLink, button1Link, button2Link 等
   - 所有样式类字段：color, backgroundColor, textColor, titleColor, fontSize, fontWeight, padding, margin, borderRadius, border, opacity, align, position 等
   - 所有类型/标识类字段：type, bannerType, imageType, animation, heightPreset, imageWidth, imageHeight, imagePosition, imageShape, level, icon, bold, italic, underline 等
   - 所有数字、布尔值、颜色值（如 #ffffff, rgba(...)）、尺寸值
   - 任何技术标识符、类名、模板哈希
4. **判断标准**：
   - 如果一个字符串值看起来像是**自然语言文本**（包含字母、汉字、标点符号等），且不是 URL、颜色值、ID、类名、枚举值，则必须翻译。
   - 如果一个字符串值是**纯技术值**（如 "center", "left", "fullwidth", "medium", "none", "5s", "2xl" 等固定枚举），则不翻译。
   - 如果不确定某个字段是否需要翻译，请优先翻译，确保没有遗漏可见文本。
5. **强制自检**：输出前，请逐一检查所有字符串值，确保没有遗漏任何自然语言文本。如果发现任何未翻译的文本，请重新翻译。
6. 翻译要准确自然，符合目标语言的表达习惯；专业术语使用行业标准译法。

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
          "content": "翻译后的正文",
          "templateData": { ... }, // 翻译后的组件配置，仅文本被替换
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
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, pages } = trans;
      if (!pages || pages.length === 0) continue;

      const updates = pages.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        templateData: p.templateData,
        seo_keywords: p.seo_keywords,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
      }));

      try {
        const result = await updatePageTranslations(language, updates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += pages.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入页面到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};