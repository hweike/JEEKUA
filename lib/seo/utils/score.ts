// lib/seo/utils/score.ts

import type {
  SeoScoreConfig,
  SeoScoreResult,
  SeoScoreCheck
} from '../types';

// ============================================================
// 字符长度计算（区分拉丁语/非拉丁语）
// ============================================================

/**
 * 计算加权字符长度
 * - 拉丁字符（英文、数字、半角符号、拉丁扩展字符）：1 个字符
 * - 非拉丁字符（中文、日文、韩文、阿拉伯文、俄文、泰文等）：2 个字符
 * - Emoji：2 个字符
 * 
 * @param text 要计算的文本
 * @returns 加权字符长度
 */
export function getWeightedLength(text: string): number {
  let length = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    
    // ============================================================
    // 1. 拉丁字符 → 1 个字符
    // ============================================================
    // 基本 ASCII（英文、数字、半角符号）
    if (code >= 0x0020 && code <= 0x007F) {
      length += 1;
      continue;
    }
    
    // 拉丁扩展字符（é, ñ, ü 等欧洲语言字符）
    if (
      (code >= 0x00C0 && code <= 0x00FF) || // Latin-1 Supplement
      (code >= 0x0100 && code <= 0x017F) || // Latin Extended-A
      (code >= 0x0180 && code <= 0x024F) || // Latin Extended-B
      (code >= 0x1E00 && code <= 0x1EFF)    // Latin Extended Additional
    ) {
      length += 1;
      continue;
    }

    // ============================================================
    // 2. 非拉丁字符 → 2 个字符
    // ============================================================
    // 中文
    if (
      (code >= 0x4E00 && code <= 0x9FFF) || // 基本汉字
      (code >= 0x3400 && code <= 0x4DBF) || // 扩展汉字 A
      (code >= 0x20000 && code <= 0x2A6DF) || // 扩展汉字 B
      (code >= 0x2A700 && code <= 0x2B73F) || // 扩展汉字 C
      (code >= 0x2B740 && code <= 0x2B81F) || // 扩展汉字 D
      (code >= 0x2B820 && code <= 0x2CEAF) // 扩展汉字 E
    ) {
      length += 2;
      continue;
    }
    
    // 日文（平假名 + 片假名）
    if (
      (code >= 0x3040 && code <= 0x30FF) || // 平假名 + 片假名
      (code >= 0x31F0 && code <= 0x31FF)    // 片假名扩展
    ) {
      length += 2;
      continue;
    }
    
    // 韩文
    if (
      (code >= 0xAC00 && code <= 0xD7AF) || // 韩文音节
      (code >= 0x1100 && code <= 0x11FF) || // 韩文辅音
      (code >= 0x3130 && code <= 0x318F)    // 韩文兼容字母
    ) {
      length += 2;
      continue;
    }
    
    // 全角字符（全角英文、中文标点等）
    if (code >= 0xFF00 && code <= 0xFFEF) {
      length += 2;
      continue;
    }
    
    // 中文标点 / CJK 符号
    if (code >= 0x3000 && code <= 0x303F) {
      length += 2;
      continue;
    }
    
    // 西里尔字母（俄文、乌克兰文、保加利亚文等）
    if (
      (code >= 0x0400 && code <= 0x04FF) || // Cyrillic
      (code >= 0x0500 && code <= 0x052F)    // Cyrillic Supplement
    ) {
      length += 2;
      continue;
    }
    
    // 阿拉伯文
    if (
      (code >= 0x0600 && code <= 0x06FF) || // Arabic
      (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
      (code >= 0x08A0 && code <= 0x08FF) || // Arabic Extended-A
      (code >= 0xFB50 && code <= 0xFDFF) || // Arabic Presentation Forms-A
      (code >= 0xFE70 && code <= 0xFEFF)    // Arabic Presentation Forms-B
    ) {
      length += 2;
      continue;
    }
    
    // 希伯来文
    if (code >= 0x0590 && code <= 0x05FF) {
      length += 2;
      continue;
    }
    
    // 泰文
    if (code >= 0x0E00 && code <= 0x0E7F) {
      length += 2;
      continue;
    }
    
    // 老挝文
    if (code >= 0x0E80 && code <= 0x0EFF) {
      length += 2;
      continue;
    }
    
    // 缅甸文
    if (code >= 0x1000 && code <= 0x109F) {
      length += 2;
      continue;
    }
    
    // 高棉文
    if (code >= 0x1780 && code <= 0x17FF) {
      length += 2;
      continue;
    }
    
    // 藏文
    if (code >= 0x0F00 && code <= 0x0FFF) {
      length += 2;
      continue;
    }
    
    // 蒙古文
    if (code >= 0x1800 && code <= 0x18AF) {
      length += 2;
      continue;
    }
    
    // 天城文（印地语）
    if (code >= 0x0900 && code <= 0x097F) {
      length += 2;
      continue;
    }
    
    // 孟加拉文
    if (code >= 0x0980 && code <= 0x09FF) {
      length += 2;
      continue;
    }
    
    // 古吉拉特文
    if (code >= 0x0A80 && code <= 0x0AFF) {
      length += 2;
      continue;
    }
    
    // 泰米尔文
    if (code >= 0x0B80 && code <= 0x0BFF) {
      length += 2;
      continue;
    }
    
    // 泰卢固文
    if (code >= 0x0C00 && code <= 0x0C7F) {
      length += 2;
      continue;
    }
    
    // 卡纳达文
    if (code >= 0x0C80 && code <= 0x0CFF) {
      length += 2;
      continue;
    }
    
    // 马拉雅拉姆文
    if (code >= 0x0D00 && code <= 0x0D7F) {
      length += 2;
      continue;
    }
    
    // 僧伽罗文
    if (code >= 0x0D80 && code <= 0x0DFF) {
      length += 2;
      continue;
    }
    
    // 希腊文
    if (code >= 0x0370 && code <= 0x03FF) {
      length += 2;
      continue;
    }
    
    // 格鲁吉亚文
    if (code >= 0x10A0 && code <= 0x10FF) {
      length += 2;
      continue;
    }
    
    // 亚美尼亚文
    if (code >= 0x0530 && code <= 0x058F) {
      length += 2;
      continue;
    }
    
    // 越南文特有的字符（带音调符号）
    if (code >= 0x1EA0 && code <= 0x1EF9) {
      length += 2;
      continue;
    }

    // ============================================================
    // 3. Emoji 和特殊符号 → 2 个字符
    // ============================================================
    if (
      (code >= 0x1F300 && code <= 0x1F9FF) || // Emoji
      (code >= 0x1FA00 && code <= 0x1FAFF)    // Extended Emoji
    ) {
      length += 2;
      continue;
    }

    // ============================================================
    // 4. 其他未分类字符 → 默认 1 个字符
    // ============================================================
    length += 1;
  }
  return length;
}

// ============================================================
// 主评分函数
// ============================================================

export function calculateSeoScore(
  seoTitle: string | null | undefined,
  seoDescription: string | null | undefined,
  seoKeywords: string[] | null | undefined,
  _analyzedKeywords: string[] | undefined,
  config: SeoScoreConfig = {}
): SeoScoreResult {
  const title = seoTitle || '';
  const desc = seoDescription || '';
  const keywords = (seoKeywords || []).filter(k => k && k.trim().length > 0);

  // ============================================================
  // 统一的长度限制（Google SEO 最佳实践）
  // ============================================================
  const titleMin = config.titleMinLength ?? 30;
  const titleMax = config.titleMaxLength ?? 60;
  const descMin = config.descMinLength ?? 80;
  const descMax = config.descMaxLength ?? 160;
  const keywordMin = config.keywordMinCount ?? 1;
  const keywordMax = config.keywordMaxCount ?? 5;

  const suggestions: string[] = [];

  // ============================================================
  // 1. SEO 标题 (40分)
  // ============================================================
  const titleChecks: SeoScoreCheck[] = [];
  let titleScore = 0;
  const titleMaxScore = 40;

  // 1.1 标题不为空 (8分)
  const hasTitle = title.trim().length > 0;
  titleChecks.push({
    label: '标题不为空',
    passed: hasTitle,
    suggestion: hasTitle ? undefined : '请填写 SEO 标题',
  });
  if (hasTitle) titleScore += 8;
  else suggestions.push('请填写 SEO 标题');

  // 1.2 标题长度 30-60 字符（使用加权长度） (12分)
  const titleLen = getWeightedLength(title);
  const titleLenOk = hasTitle && titleLen >= titleMin && titleLen <= titleMax;
  titleChecks.push({
    label: `标题长度 ${titleLen} 在 ${titleMin}-${titleMax} 字符之间`,
    passed: titleLenOk,
    suggestion: titleLenOk ? undefined : (titleLen < titleMin ? `标题应至少 ${titleMin} 字符，当前 ${titleLen} 字符` : `标题应不超过 ${titleMax} 字符，当前 ${titleLen} 字符`),
  });
  if (titleLenOk) titleScore += 12;
  else if (hasTitle) {
    suggestions.push(titleLen < titleMin ? `标题应至少 ${titleMin} 字符，当前 ${titleLen} 字符` : `标题应不超过 ${titleMax} 字符，当前 ${titleLen} 字符`);
  }

  // 1.3 标题包含 SEO 关键词 (12分)
  const hasKeywordInTitle = keywords.length > 0 && keywords.some(k =>
    title.toLowerCase().includes(k.toLowerCase())
  );
  titleChecks.push({
    label: '标题包含 SEO 关键词',
    passed: hasKeywordInTitle,
    suggestion: hasKeywordInTitle ? undefined : (keywords.length > 0 ? `标题应包含关键词: ${keywords.join(', ')}` : '请先填写 SEO 关键词'),
  });
  if (hasKeywordInTitle) titleScore += 12;
  else if (keywords.length > 0) suggestions.push(`标题应包含关键词: ${keywords.join(', ')}`);
  else suggestions.push('请填写 SEO 关键词');

  // 1.4 SEO 关键词位于标题开头 (8分)
  const keywordFirst = keywords.length > 0 && keywords.some(k =>
    title.toLowerCase().startsWith(k.toLowerCase())
  );
  titleChecks.push({
    label: 'SEO 关键词位于标题开头',
    passed: keywordFirst,
    suggestion: keywordFirst ? undefined : '将 SEO 关键词放在标题开头',
  });
  if (keywordFirst) titleScore += 8;
  else if (hasKeywordInTitle) suggestions.push('将 SEO 关键词放在标题开头');

  // ============================================================
  // 2. SEO 描述 (40分)
  // ============================================================
  const descChecks: SeoScoreCheck[] = [];
  let descScore = 0;
  const descMaxScore = 40;

  // 2.1 描述不为空 (8分)
  const hasDesc = desc.trim().length > 0;
  descChecks.push({
    label: '描述不为空',
    passed: hasDesc,
    suggestion: hasDesc ? undefined : '请填写 SEO 描述',
  });
  if (hasDesc) descScore += 8;
  else suggestions.push('请填写 SEO 描述');

  // 2.2 描述长度 80-160 字符（使用加权长度） (16分)
  const descLen = getWeightedLength(desc);
  const descLenOk = hasDesc && descLen >= descMin && descLen <= descMax;
  descChecks.push({
    label: `描述长度 ${descLen} 在 ${descMin}-${descMax} 字符之间`,
    passed: descLenOk,
    suggestion: descLenOk ? undefined : (descLen < descMin ? `描述应至少 ${descMin} 字符，当前 ${descLen} 字符` : `描述应不超过 ${descMax} 字符，当前 ${descLen} 字符`),
  });
  if (descLenOk) descScore += 16;
  else if (hasDesc) {
    suggestions.push(descLen < descMin ? `描述应至少 ${descMin} 字符，当前 ${descLen} 字符` : `描述应不超过 ${descMax} 字符，当前 ${descLen} 字符`);
  }

  // 2.3 描述包含 SEO 关键词 (16分)
  const hasKeywordInDesc = keywords.length > 0 && keywords.some(k =>
    desc.toLowerCase().includes(k.toLowerCase())
  );
  descChecks.push({
    label: '描述包含 SEO 关键词',
    passed: hasKeywordInDesc,
    suggestion: hasKeywordInDesc ? undefined : (keywords.length > 0 ? `描述应包含关键词: ${keywords.join(', ')}` : '请先填写 SEO 关键词'),
  });
  if (hasKeywordInDesc) descScore += 16;
  else if (keywords.length > 0) suggestions.push(`描述应包含关键词: ${keywords.join(', ')}`);
  else suggestions.push('请填写 SEO 关键词');

  // ============================================================
  // 3. SEO 关键词 (20分)
  // ============================================================
  const keywordChecks: SeoScoreCheck[] = [];
  let keywordScore = 0;
  const keywordMaxScore = 20;

  // 3.1 关键词不为空 (10分)
  const hasKeywords = keywords.length > 0;
  keywordChecks.push({
    label: '关键词不为空',
    passed: hasKeywords,
    suggestion: hasKeywords ? undefined : '请填写 SEO 关键词',
  });
  if (hasKeywords) keywordScore += 10;
  else suggestions.push('请填写 SEO 关键词');

  // 3.2 关键词数量 1-5 个 (10分)
  const keywordCount = keywords.length;
  const countOk = keywordCount >= keywordMin && keywordCount <= keywordMax;
  keywordChecks.push({
    label: `关键词数量 ${keywordCount} 在 ${keywordMin}-${keywordMax} 个之间`,
    passed: countOk,
    suggestion: countOk ? undefined : (keywordCount < keywordMin ? `关键词至少 ${keywordMin} 个，当前 ${keywordCount} 个` : `关键词不超过 ${keywordMax} 个，当前 ${keywordCount} 个`),
  });
  if (countOk) keywordScore += 10;
  else if (hasKeywords) {
    suggestions.push(keywordCount < keywordMin ? `关键词至少 ${keywordMin} 个，当前 ${keywordCount} 个` : `关键词不超过 ${keywordMax} 个，当前 ${keywordCount} 个`);
  }

  // ============================================================
  // 4. 总分
  // ============================================================
  const totalScore = titleScore + descScore + keywordScore;
  const totalMax = titleMaxScore + descMaxScore + keywordMaxScore;
  const finalScore = Math.round((totalScore / totalMax) * 100);

  let level: 'excellent' | 'good' | 'fair' | 'poor';
  let color: string;
  let label: string;
  if (finalScore >= 90) {
    level = 'excellent';
    color = '#22c55e';
    label = '优秀';
  } else if (finalScore >= 70) {
    level = 'good';
    color = '#3b82f6';
    label = '良好';
  } else if (finalScore >= 50) {
    level = 'fair';
    color = '#eab308';
    label = '一般';
  } else {
    level = 'poor';
    color = '#ef4444';
    label = '待优化';
  }

  const uniqueSuggestions = Array.from(new Set(suggestions));

  return {
    score: finalScore,
    level,
    color,
    label,
    dimensions: {
      seo_title: { score: titleScore, maxScore: titleMaxScore, checks: titleChecks },
      seo_description: { score: descScore, maxScore: descMaxScore, checks: descChecks },
      seo_keywords: { score: keywordScore, maxScore: keywordMaxScore, checks: keywordChecks },
    },
    suggestions: uniqueSuggestions.slice(0, 6),
  };
}