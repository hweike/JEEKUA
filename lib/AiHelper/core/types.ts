// lib/AiHelper/core/types.ts

export interface ITranslationService {
  /**
   * 导出源语言数据
   * @param locale 源语言代码
   * @param options 可选参数，例如用于指定导出的 ID 列表
   * @returns 包含源语言标识和导出数据的对象
   */
  exportData(locale: string, options?: { ids?: string[] }): Promise<{
    sourceLanguage: string;
    [key: string]: any;
  }>;

  /**
   * 导入多语言翻译数据
   * @param translations 包含各语言翻译数据的数组
   * @param sourceLocale 源语言代码
   * @returns 导入统计信息（成功数、失败数、错误列表）
   */
  importTranslations(
    translations: Array<{ language: string; [key: string]: any }>,
    sourceLocale: string
  ): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }>;

  /**
   * 生成 AI 提示词
   * @param sourceLocale 源语言代码
   * @param targetLocales 目标语言代码数组
   * @param sourceData 源数据（用于嵌入提示词）
   * @param languageNames 语言名称映射（用于显示）
   * @returns 生成的提示词字符串
   */
  generatePrompt(
    sourceLocale: string,
    targetLocales: string[],
    sourceData: any,
    languageNames: Record<string, string>
  ): string;
}

export interface RegisteredType {
  type: string;               // 业务类型唯一标识，如 'product-category', 'doc'
  label: string;              // 显示名称
  service: ITranslationService; // 对应的适配器实现
  supportedLanguages: string[]; // 由前端从 /api/languages/enabled 动态获取
  exportLimit: number | null; // 单次导出数量限制，null 表示无限制
}