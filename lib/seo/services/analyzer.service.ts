// lib/seo/services/analyzer.service.ts

import * as cheerio from 'cheerio';
import type { AnalyzedContent } from '../types';

export interface AnalyzerOptions {
  maxSummaryLength?: number;
  maxKeywords?: number;
}

export class AnalyzerService {
  private options: Required<AnalyzerOptions>;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      maxSummaryLength: options.maxSummaryLength ?? 200,
      maxKeywords: options.maxKeywords ?? 10,
    };
  }

  /**
   * 分析 HTML/文本内容，提取关键词和摘要
   * 纯文本分析，不包含任何硬编码
   */
  analyze(htmlContent: string): AnalyzedContent {
    if (!htmlContent || htmlContent.trim().length === 0) {
      return { keywords: [], summary: '', wordCount: 0 };
    }

    // 加载 HTML
    const $ = cheerio.load(htmlContent);

    // 移除无用标签
    $('script, style, noscript, meta, link, head').remove();

    // 提取纯文本
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // 提取单词（保留中英文、数字）
    const words = this.extractWords(text);

    // 词频统计
    const freq: Record<string, number> = {};
    words.forEach((w) => {
      const word = w.toLowerCase().trim();
      if (word.length > 1) {
        freq[word] = (freq[word] || 0) + 1;
      }
    });

    // 按频率排序取前 N 个
    const keywords = Object.keys(freq)
      .sort((a, b) => freq[b] - freq[a])
      .slice(0, this.options.maxKeywords);

    // 生成摘要
    const summary = this.extractSummary(text, this.options.maxSummaryLength);

    return {
      keywords,
      summary,
      wordCount: words.length,
    };
  }

  /**
   * 提取单词（保留中英文、数字，移除特殊符号）
   */
  private extractWords(text: string): string[] {
    // 按空格分割
    const tokens = text.split(/\s+/);
    return tokens
      .filter(w => w.length > 1)
      .map(w => w.replace(/^[^a-zA-Z\u4e00-\u9fff\d]+/, '')) // 去掉前导特殊字符
      .map(w => w.replace(/[^a-zA-Z\u4e00-\u9fff\d]+$/, '')) // 去掉尾部特殊字符
      .filter(w => w.length > 0);
  }

  /**
   * 从文本中提取摘要
   */
  private extractSummary(text: string, maxLength: number): string {
    if (!text || text.length === 0) return '';

    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (cleanText.length <= maxLength) {
      return cleanText;
    }

    const truncated = cleanText.substring(0, maxLength);
    // 尝试在句子结束处截断
    const sentenceEnd = truncated.search(/[.!?。！？](?=\s|$)/);
    if (sentenceEnd > 0 && sentenceEnd < maxLength - 10) {
      return truncated.substring(0, sentenceEnd + 1);
    }

    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * 从产品属性中提取关键词（结构化数据）
   * 不依赖文本分析，直接从 attributes 提取
   */
  extractProductKeywords(attributes: Record<string, any> | null | undefined): string[] {
    if (!attributes || typeof attributes !== 'object') {
      return [];
    }

    const keywords: string[] = [];

    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined || value === '') continue;

      const strValue = String(value);
      // 提取数值+单位（如 12V, 1000W, 24V DC）
      const matches = strValue.match(/[\d.]+[a-zA-Z]*/g);
      if (matches) {
        matches.forEach(m => {
          if (m.length > 1 && !keywords.includes(m)) {
            keywords.push(m);
          }
        });
      }

      // 如果值包含有意义文本且不是纯数字
      if (strValue.length > 1 && strValue.length < 30 && !/^[\d.]+$/.test(strValue)) {
        // 按空格或逗号分割
        const parts = strValue.split(/[,\s]+/).filter(p => p.length > 1);
        parts.forEach(p => {
          const trimmed = p.trim();
          if (trimmed.length > 1 && !/^[\d.]+$/.test(trimmed) && !keywords.includes(trimmed)) {
            keywords.push(trimmed);
          }
        });
      }
    }

    return keywords;
  }
}

export const analyzerService = new AnalyzerService();