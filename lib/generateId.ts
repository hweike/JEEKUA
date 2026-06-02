// lib/generateId.ts
export function generatePostId(): string {
  // 生成 10000000 ~ 99999999 之间的随机数
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}