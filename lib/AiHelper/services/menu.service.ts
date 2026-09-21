// lib/AiHelper/services/menu.service.ts
import { ITranslationService } from '../core/types';
import { readMenuFile, updateMenuTranslations } from '@/lib/menus/storage';
import { menuService } from '@/lib/menus/menu-service';

// ====== 导出数据类型 ======
interface ExportMenu {
  id: string;          // menuId (如 'navigation', 'footer-menu', 'custom_menus')
  config: any;         // 完整的 menu config（含 items）
}

export const menuAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; menus: ExportMenu[] }> {
    if (!options?.ids || options.ids.length === 0) {
      return { sourceLanguage: locale, menus: [] };
    }
    const menuId = options.ids[0];
    let config = await readMenuFile(locale, menuId);
    if (config === null) {
      config = menuService.getDefaultMenu(menuId);
    }
    return {
      sourceLanguage: locale,
      menus: [{
        id: menuId,
        config,
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
    const count = sourceData.menus?.length || 0;

    return `你是一位专业的菜单翻译专家。请将以下 ${count} 个${src}菜单翻译为 ${targetList} 版本。

【源语言】: ${src} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持菜单的完整 JSON 结构不变，包括所有层级、属性、链接、图标等。
2. 只翻译所有菜单项中的 label 字段（即显示的文本）。
3. 不要翻译 id、link、icon、target、rel、order 等技术属性。
4. 对于自定义菜单（custom_menus），数据是一个数组，每个元素可能包含 name 和 items，请翻译其中的 label。
5. 翻译要准确、简洁，符合目标语言的菜单表达习惯。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "menus": [
        {
          "id": "菜单ID（如 navigation / footer-menu / custom_menus）",
          "config": {
            // 完整菜单配置，仅 label 被翻译，其他字段原样保留
          }
        }
      ]
    }
  ]
}

注意：对于自定义菜单（custom_menus），config 是一个数组，每个元素代表一个自定义菜单，请分别翻译其中的 label和description。

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; menus: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, menus } = trans;
      if (!menus || menus.length === 0) continue;

      const updates = menus.map((m: any) => ({
        menuId: m.id,
        config: m.config,
      }));

      try {
        const result = await updateMenuTranslations(language, updates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += menus.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入菜单到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};