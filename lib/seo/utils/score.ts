// lib/seo/utils/score.ts

import type { SeoScoreConfig, SeoScoreResult, SeoScoreDimension, SeoScoreCheck } from '../types';

/**
 * 计算 SEO 评分（纯函数，语言无关）
 * 只保留程序能精确判断的检查项
 */
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

  // 策略配置（可覆盖）
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

  // 1.2 标题长度 30-60 字符 (12分)
  const titleLen = title.length;
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
    label: `标题包含 SEO 关键词（${keywords.join(', ') || '请填写关键词'}）`,
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

  // 2.2 描述长度 80-160 字符 (12分)
  const descLen = desc.length;
  const descLenOk = hasDesc && descLen >= descMin && descLen <= descMax;
  descChecks.push({
    label: `描述长度 ${descLen} 在 ${descMin}-${descMax} 字符之间`,
    passed: descLenOk,
    suggestion: descLenOk ? undefined : (descLen < descMin ? `描述应至少 ${descMin} 字符，当前 ${descLen} 字符` : `描述应不超过 ${descMax} 字符，当前 ${descLen} 字符`),
  });
  if (descLenOk) descScore += 12;
  else if (hasDesc) {
    suggestions.push(descLen < descMin ? `描述应至少 ${descMin} 字符，当前 ${descLen} 字符` : `描述应不超过 ${descMax} 字符，当前 ${descLen} 字符`);
  }

  // 2.3 描述包含 SEO 关键词 (12分)
  const hasKeywordInDesc = keywords.length > 0 && keywords.some(k => 
    desc.toLowerCase().includes(k.toLowerCase())
  );
  descChecks.push({
    label: `描述包含 SEO 关键词（${keywords.join(', ') || '请填写关键词'}）`,
    passed: hasKeywordInDesc,
    suggestion: hasKeywordInDesc ? undefined : (keywords.length > 0 ? `描述应包含关键词: ${keywords.join(', ')}` : '请先填写 SEO 关键词'),
  });
  if (hasKeywordInDesc) descScore += 12;
  else if (keywords.length > 0) suggestions.push(`描述应包含关键词: ${keywords.join(', ')}`);
  else suggestions.push('请填写 SEO 关键词');

  // 2.4 描述长度合理（≥80） (8分) - 确保描述有足够内容
  const descHasMinLength = hasDesc && descLen >= descMin;
  descChecks.push({
    label: `描述长度 ${descLen} ≥ ${descMin} 字符`,
    passed: descHasMinLength,
    suggestion: descHasMinLength ? undefined : `描述应至少 ${descMin} 字符，当前 ${descLen} 字符`,
  });
  if (descHasMinLength) descScore += 8;
  else if (hasDesc) suggestions.push(`描述应至少 ${descMin} 字符，当前 ${descLen} 字符`);

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

  // 等级
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
    suggestions: suggestions.slice(0, 6), // 限制建议数量，避免过多
  };
}