import { pinyin } from 'pinyin-pro';

export function toPinyin(text: string): string {
  // 将中文转换为拼音（不带声调，空格分隔）
  return pinyin(text, { toneType: 'none', type: 'string', separator: ' ' });
}