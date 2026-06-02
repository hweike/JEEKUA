export interface SeoValidationResult {
  valid: boolean;
  errors: {
    seo_title?: string;
    seo_description?: string;
  };
}

export function validateSeo(
  seoTitle: string,
  seoDescription: string,
  keywords: string
): SeoValidationResult {
  const errors: SeoValidationResult['errors'] = {};

  // 检查元标题长度 ≤60
  if (seoTitle.length > 60) {
    errors.seo_title = 'SEO元标题不能超过60个字符';
  }
  // 检查是否包含核心关键词
  if (keywords && !seoTitle.includes(keywords)) {
    errors.seo_title = `SEO元标题必须包含核心关键词“${keywords}”`;
  }

  // 检查元描述长度 ≤160
  if (seoDescription.length > 160) {
    errors.seo_description = 'SEO元描述不能超过160个字符';
  }
  if (keywords && !seoDescription.includes(keywords)) {
    errors.seo_description = `SEO元描述必须包含核心关键词“${keywords}”`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}