// lib/date-utils.ts

/**
 * 根据 locale 格式化日期时间
 * @param dateStr ISO 日期字符串（如 "2026-04-07T14:35:22.123Z"）
 * @param locale 语言代码（如 'zh', 'en', 'de'）
 * @param options Intl.DateTimeFormatOptions 可选
 * @returns 格式化后的日期时间字符串
 */
export function formatLocalizedDateTime(
  dateStr: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const mergedOptions = { ...defaultOptions, ...options };
  return new Intl.DateTimeFormat(locale, mergedOptions).format(date);
}

/**
 * 仅格式化日期部分（不带时间）
 */
export function formatLocalizedDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}