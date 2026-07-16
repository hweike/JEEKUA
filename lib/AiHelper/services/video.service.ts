// lib/AiHelper/services/video.service.ts
import { ITranslationService } from '../core/types';
import { getFullVideo, updateVideoTranslations } from '@/lib/videosys/video-service';

interface ExportVideo {
  id: string;
  title: string;
  content: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  tags: string[];
}

export const videoAdapter: ITranslationService = {
  async exportData(locale: string, options?: { ids?: string[] }): Promise<{ sourceLanguage: string; videos: ExportVideo[] }> {
    if (!options?.ids || options.ids.length === 0) {
      return { sourceLanguage: locale, videos: [] };
    }
    const id = options.ids[0]; // 只处理第一个
    const video = await getFullVideo(id, locale);
    if (!video) {
      throw new Error(`视频 ${id} 不存在`);
    }
    let tagsArray: string[] = [];
    try {
      tagsArray = video.tags ? JSON.parse(video.tags) : [];
    } catch {
      tagsArray = video.tags ? [video.tags] : [];
    }
    return {
      sourceLanguage: locale,
      videos: [{
        id: video.id,
        title: video.title,
        content: video.content || '',
        seo_keywords: video.seo_keywords || '',
        seo_title: video.seo_title || '',
        seo_description: video.seo_description || '',
        tags: tagsArray,
      }],
    };
  },

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
    const count = sourceData.videos?.length || 0;

    return `你是一位专业的视频翻译专家。请将以下 ${count} 个${sourceDisplay}视频翻译为 ${targetList} 版本。

【源语言】: ${sourceDisplay} (${sourceLocale})
【目标语言】: ${targetList}

【翻译要求】:
1. 保持视频信息结构不变。
2. 只翻译以下字段：
   - title（标题）
   - content（视频介绍）
   - seo_keywords（SEO核心关键词）
   - seo_title（SEO元标题）
   - seo_description（SEO元描述）
   - tags（标记，以数组形式）
3. 不要翻译 id、任何技术标识符。
4. 翻译要准确、自然，符合目标语言的行文习惯，专业术语保持一致。

【输入数据】（JSON格式）:
{{SOURCE_DATA_JSON}}

【输出格式】:
请严格按照以下 JSON 结构返回，包含所有语言版本，并标识源语言。

{
  "sourceLanguage": "${sourceLocale}",
  "translations": [
    {
      "language": "目标语言代码",
      "videos": [
        {
          "id": "视频ID",
          "title": "翻译后的标题",
          "content": "翻译后的视频介绍",
          "seo_keywords": "翻译后的SEO关键词",
          "seo_title": "翻译后的SEO标题",
          "seo_description": "翻译后的SEO描述",
          "tags": ["标记1", "标记2"]
        }
      ]
    }
  ]
}

请直接输出纯 JSON，不要包含任何额外解释或代码块标记。`;
  },

  async importTranslations(
    translations: Array<{ language: string; videos: any[] }>,
    sourceLocale: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const trans of translations) {
      const { language, videos } = trans;
      if (!videos || videos.length === 0) continue;

      const videoUpdates = videos.map((v: any) => ({
        id: v.id,
        title: v.title,
        content: v.content,
        seo_keywords: v.seo_keywords,
        seo_title: v.seo_title,
        seo_description: v.seo_description,
        tags: v.tags,
      }));

      try {
        const result = await updateVideoTranslations(language, videoUpdates, sourceLocale);
        imported += result.success;
        failed += result.failed;
        if (result.errors.length > 0) errors.push(...result.errors);
      } catch (err: any) {
        failed += videos.length;
        errors.push(`语言 ${language} 导入失败: ${err.message}`);
        console.error(`导入视频到 ${language} 失败:`, err);
      }
    }

    return { imported, failed, errors };
  },
};