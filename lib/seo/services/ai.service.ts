// lib/seo/services/ai.service.ts

// =====================================================
// AI 服务
// 职责：调用 DeepSeek API 生成 SEO 元数据
// =====================================================

import OpenAI from 'openai';
import type { GenerateSeoInput, GeneratedSeo, AIConfig, AIGenerateOptions, AIParseResult } from '../types';

export class AIService {
  private client: OpenAI;
  private config: Required<AIConfig>;

  constructor(config?: Partial<AIConfig>) {
    const apiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY;
    const baseURL = config?.baseURL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });

    this.config = {
      apiKey,
      baseURL,
      model: config?.model || 'deepseek-chat',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 500,
    };
  }

  /**
   * 替换 Prompt 模板中的变量
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      const stringValue = value !== undefined && value !== null ? String(value) : '';
      result = result.replace(new RegExp(placeholder, 'g'), stringValue);
    }
    return result;
  }

  /**
   * 获取默认的 Prompt 模板（当策略配置为空时使用）
   */
  private getDefaultPrompt(
    input: GenerateSeoInput,
    targetLanguage: string,
    fieldType: 'seo_title' | 'seo_description' | 'seo_keywords'
  ): string {
    const fieldConfig = input.strategy.fields[fieldType];
    const specText = (input.analyzed_keywords || []).join(', ');

    if (fieldType === 'seo_keywords') {
      return `你是一位专业的 SEO 关键词研究员。请为以下产品生成 ${fieldConfig.minCount || 2}-${fieldConfig.maxCount || 5} 个精准的 SEO 关键词。

【产品名称】${input.page_title}
【品牌】${input.globalConfig.brand_name}
【规格参数】${specText || '无'}

【要求】
1. 关键词必须精准反映产品核心特征
2. 包含品牌名、产品名、核心规格
3. 关键词之间用英文逗号分隔
4. 使用 ${targetLanguage} 语言
5. 只返回关键词列表，不要包含任何额外说明`;
    }

    if (fieldType === 'seo_title') {
      return `你是一位专业的 SEO 文案专家。请为以下产品生成一个符合 SEO 优化规则的标题。

【产品名称】${input.page_title}
【品牌】${input.globalConfig.brand_name}
【规格参数】${specText || '无'}
【目标语言】${targetLanguage}
【标题长度】${fieldConfig.minLength || 30}-${fieldConfig.maxLength || 60} 字符

【要求】
1. 必须包含至少一个核心关键词
2. 核心关键词尽量前置
3. 格式：核心关键词 + 品牌名 + 核心卖点
4. 只返回标题文本，不要包含任何额外说明`;
    }

    // seo_description
    return `你是一位专业的 SEO 文案专家。请为以下产品生成一个符合 SEO 优化规则的描述。

【产品名称】${input.page_title}
【品牌】${input.globalConfig.brand_name}
【规格参数】${specText || '无'}
【目标语言】${targetLanguage}
【描述长度】${fieldConfig.minLength || 80}-${fieldConfig.maxLength || 160} 字符

【要求】
1. 必须包含至少一个核心关键词
2. 突出产品核心价值和差异化卖点
3. 结尾加入行动号召（CTA）
4. 使用通顺、完整的句子
5. 只返回描述文本，不要包含任何额外说明`;
  }

  /**
   * 构建单个字段的 Prompt
   * @returns 如果字段未启用，返回 null
   */
  private buildPrompt(
    input: GenerateSeoInput,
    targetLanguage: string,
    fieldType: 'seo_title' | 'seo_description' | 'seo_keywords'
  ): string | null {
    const fieldConfig = input.strategy.fields[fieldType];
    // 如果字段未启用，直接返回 null
    if (!fieldConfig || !fieldConfig.enabled) {
      return null;
    }

    // 如果策略配置中有 Prompt 模板，使用它；否则使用默认模板
    let template = fieldConfig.promptTemplate;
    let useDefaultPrompt = false;

    // 如果模板为空或只有空白字符，使用默认模板
    if (!template || template.trim().length === 0) {
      template = this.getDefaultPrompt(input, targetLanguage, fieldType);
      useDefaultPrompt = true;
    }

    const variables: Record<string, any> = {
      page_title: input.page_title,
      page_type: input.strategy.label,
      brand_name: input.globalConfig.brand_name,
      site_name: input.globalConfig.site_name,
      target_audience: input.globalConfig.target_audience || '',
      core_values: (input.globalConfig.core_values || []).join(', '),
      analyzed_keywords: (input.analyzed_keywords || []).join(', '),
      analyzed_summary: input.analyzed_summary || '',
      target_language: targetLanguage,
      minLength: fieldConfig.minLength || 0,
      maxLength: fieldConfig.maxLength || 0,
      minCount: fieldConfig.minCount || 0,
      maxCount: fieldConfig.maxCount || 0,
    };

    return this.replaceVariables(template, variables);
  }

  /**
   * 调用 DeepSeek API 生成 SEO 数据
   */
  async generate(
    input: GenerateSeoInput,
    options: AIGenerateOptions
  ): Promise<GeneratedSeo> {
    const retries = options.retries || 3;
    const timeout = options.timeout || 30000;

    // 构建各字段 Prompt（跳过未启用的字段）
    const titlePrompt = this.buildPrompt(input, options.targetLanguage, 'seo_title');
    const descPrompt = this.buildPrompt(input, options.targetLanguage, 'seo_description');
    const keywordsPrompt = this.buildPrompt(input, options.targetLanguage, 'seo_keywords');

    // 收集已启用的字段
    const enabledFields: { type: 'seo_title' | 'seo_description' | 'seo_keywords'; prompt: string }[] = [];
    if (titlePrompt) enabledFields.push({ type: 'seo_title', prompt: titlePrompt });
    if (descPrompt) enabledFields.push({ type: 'seo_description', prompt: descPrompt });
    if (keywordsPrompt) enabledFields.push({ type: 'seo_keywords', prompt: keywordsPrompt });

    // 如果没有启用的字段，直接返回空结果
    if (enabledFields.length === 0) {
      console.warn('所有 SEO 字段均未启用，跳过 AI 生成');
      return { seo_title: '', seo_description: '', seo_keywords: [] };
    }

    // 获取长度限制（用于系统提示）
    const titleConfig = input.strategy.fields.seo_title;
    const descConfig = input.strategy.fields.seo_description;
    const keywordConfig = input.strategy.fields.seo_keywords;

    // 构建系统 Prompt（动态包含已启用的字段要求）
    let systemPrompt = '你是一位专业的 SEO 文案专家，精通多语言 SEO 优化。\n';
    systemPrompt += '请严格按照以下 JSON 格式返回结果，不要包含任何额外说明：\n{\n';
    if (titlePrompt) {
      systemPrompt += `  "seo_title": "生成的SEO标题",\n`;
    }
    if (descPrompt) {
      systemPrompt += `  "seo_description": "生成的SEO描述",\n`;
    }
    if (keywordsPrompt) {
      systemPrompt += `  "seo_keywords": ["关键词1", "关键词2", "关键词3"],\n`;
    }
    systemPrompt += '}\n\n';
    systemPrompt += '要求：\n';
    if (titlePrompt) {
      systemPrompt += `- SEO 标题长度控制在 ${titleConfig.minLength || 30}-${titleConfig.maxLength || 60} 字符\n`;
    }
    if (descPrompt) {
      systemPrompt += `- SEO 描述长度控制在 ${descConfig.minLength || 80}-${descConfig.maxLength || 160} 字符\n`;
    }
    if (keywordsPrompt) {
      systemPrompt += `- 关键词数量控制在 ${keywordConfig.minCount || 3}-${keywordConfig.maxCount || 5} 个\n`;
    }
    systemPrompt += `- 所有内容必须使用 "${options.targetLanguage}" 语言\n`;
    systemPrompt += '- 禁止关键词堆砌，确保自然流畅\n';
    systemPrompt += `- 只返回 JSON，不要包含额外说明`;

    // 构建用户 Prompt（只包含已启用的字段）
    let userPrompt = '请分别生成以下 SEO 字段：\n\n';
    if (titlePrompt) {
      userPrompt += `【SEO 标题】\n${titlePrompt}\n\n`;
    }
    if (descPrompt) {
      userPrompt += `【SEO 描述】\n${descPrompt}\n\n`;
    }
    if (keywordsPrompt) {
      userPrompt += `【SEO 关键词】\n${keywordsPrompt}\n\n`;
    }
    userPrompt += `请确保：\n`;
    if (titlePrompt) {
      userPrompt += `1. 标题长度在指定范围内\n`;
    }
    if (descPrompt) {
      userPrompt += `2. 描述长度在指定范围内\n`;
    }
    if (keywordsPrompt) {
      userPrompt += `3. 关键词数量在指定范围内\n`;
    }
    userPrompt += `4. 所有内容使用 "${options.targetLanguage}" 语言\n`;
    userPrompt += `5. 只返回 JSON，不要包含额外说明`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.client.chat.completions.create(
          {
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            response_format: { type: 'json_object' },
          },
          { timeout }
        );

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('AI 返回内容为空');
        }

        // 解析 JSON
        const parsed = JSON.parse(content);
        const result: GeneratedSeo = {
          seo_title: parsed.seo_title || '',
          seo_description: parsed.seo_description || '',
          seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : [],
        };

        // 只验证启用的字段
        if (titlePrompt && titleConfig.enabled && titleConfig.minLength && result.seo_title.length < titleConfig.minLength) {
          console.warn(`SEO标题长度 ${result.seo_title.length} 小于最小值 ${titleConfig.minLength}`);
        }
        if (titlePrompt && titleConfig.enabled && titleConfig.maxLength && result.seo_title.length > titleConfig.maxLength) {
          console.warn(`SEO标题长度 ${result.seo_title.length} 大于最大值 ${titleConfig.maxLength}`);
        }

        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`AI 生成尝试 ${attempt}/${retries} 失败:`, error.message);
        if (attempt < retries) {
          // 指数退避
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw new Error(`AI 生成失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 安全生成（不抛出异常）
   */
  async generateSafe(
    input: GenerateSeoInput,
    options: AIGenerateOptions
  ): Promise<AIParseResult> {
    try {
      const data = await this.generate(input, options);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量生成多语言 SEO
   */
  async generateMultiLanguage(
    input: GenerateSeoInput,
    targetLanguages: string[]
  ): Promise<Record<string, AIParseResult>> {
    const results: Record<string, AIParseResult> = {};
    for (const lang of targetLanguages) {
      console.log(`正在为 ${lang} 生成 SEO...`);
      const result = await this.generateSafe(input, {
        targetLanguage: lang,
        retries: 2,
        timeout: 30000,
      });
      results[lang] = result;
    }
    return results;
  }
}

// 导出单例实例
export const aiService = new AIService();