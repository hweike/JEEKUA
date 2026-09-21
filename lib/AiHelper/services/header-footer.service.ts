// lib/AiHelper/services/header-footer.service.ts
import { ITranslationService } from '../core/types';
import { getConfig, updateHeaderFooterTranslations } from '@/lib/SiteHeadersFooters/storage';

interface ExportItem {
  id: string; // 'header' 或 'footer'
  config: any;
}

export const headerFooterAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; items: ExportItem[] }> {
    if (!options?.ids || options.ids.length === 0) {
      return { sourceLanguage: locale, items: [] };
    }
    const type = options.ids[0] as 'header' | 'footer';
    const config = await getConfig(type, locale);
    // 如果 config 为 null，返回空对象（适配器将使用默认空结构，但这里我们允许 null，由提示词处理）
    return {
      sourceLanguage: locale,
      items: [{
        id: type,
        config: config || null,
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
    const count = sourceData.items?.length || 0;

    return `你是一位专业的网站页头/页脚翻译专家。请将以下 ${count} 个${src}页头/页脚配置翻译为 ${targetList} 版本。

【源语言】: ${src} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持完整的 JSON 结构不变，包括所有属性、URL、样式、颜色等非文本数据。
2. 只翻译以下字段中的可见文本：
   - 公告栏、横幅等文本：如 announcementText, text, message
   - 导航链接：label, title, alt
   - 版权信息：copyright
   - 订阅/注册：placeholder, buttonText, description
   - 社交媒体：label, title
   - 其他明显的用户可见文本（如 logoText, heading, subheading 等）
3. 不要翻译 URL、颜色值、尺寸、布局配置、ID、样式类名等。
4. 翻译要自然、简洁，符合目标语言的表达习惯。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "items": [
        {
          "id": "header 或 footer",
          "config": { /* 完整配置，仅文本被翻译 */ }
        }
      ]
    }
  ]
}

注意：如果某个配置为 null，则返回 null。
请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; items: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, items } = trans;
      if (!items || items.length === 0) continue;

      const updates = items.map((item: any) => ({
        type: item.id as 'header' | 'footer',
        config: item.config,
      }));

      try {
        const result = await updateHeaderFooterTranslations(language, updates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += items.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入页头/页脚到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};