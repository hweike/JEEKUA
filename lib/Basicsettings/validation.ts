// lib/Basicsettings/validation.ts
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  // 简单支持手机（1开头的11位数字）和固定电话（区号+号码，如 010-12345678）
  const mobileRe = /^1[3-9]\d{9}$/;
  const telRe = /^0\d{2,3}-?\d{7,8}$/;
  return mobileRe.test(phone) || telRe.test(phone);
}