// lib/Basicsettings/validation.ts

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证电话号码（支持国际电话）
 * 规则：
 *  - 可选前缀 +（国际区号标识）
 *  - 区号：1-3 位数字（如 86, 1, 44）
 *  - 号码主体：至少 4 位数字（可包含空格、-、. 分隔符）
 *  - 总长度（不含分隔符）至少 6 位，最多 15 位（符合 ITU-T E.164 标准）
 *  - 示例：+86 18123913227, +1 800 555 0199, 010-88888888（国内固话）
 *  - 兼容国内手机（以 1 开头，11 位）和固话（0 开头）
 */
export function validatePhone(phone: string): boolean {
  // 去除空格、-、. 等常见分隔符，仅保留数字和 +
  const cleaned = phone.replace(/[\s\-\.()]/g, '');
  if (!cleaned) return false;

  // 1. 检查是否以 + 开头（国际号码）
  if (cleaned.startsWith('+')) {
    // 去掉 +，剩下的必须全部是数字
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) return false;
    // 总位数应在 6~15 之间（符合国际号码标准）
    return digitsOnly.length >= 6 && digitsOnly.length <= 15;
  }

  // 2. 国内号码（不以 + 开头）
  // 2.1 手机号：以 1 开头，11 位
  if (/^1\d{10}$/.test(cleaned)) return true;
  // 2.2 固定电话：以 0 开头，后面 7~11 位数字（包含区号）
  if (/^0\d{7,11}$/.test(cleaned)) return true;

  // 其他情况视为无效
  return false;
}