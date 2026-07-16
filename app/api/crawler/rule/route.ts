import { NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

const RULES_PREFIX = 'crawler/rules'; // 云存储中的前缀（无 data/ 前缀）

export async function GET() {
  try {
    const storage = getPrivateStorage();
    // 列出所有规则文件（以 .json 结尾）
    const files = await storage.list(RULES_PREFIX);
    const ruleFiles = files.filter(file => file.endsWith('.json'));

    const rules = await Promise.all(
      ruleFiles.map(async (file) => {
        const content = await storage.read(file, 'utf8');
        const rule = JSON.parse(content as string);
        // 提取 id（文件名去掉 .json 和后缀）
        const id = file.split('/').pop()?.replace('.json', '') || '';
        return { id, name: rule.name };
      })
    );
    return NextResponse.json(rules);
  } catch (error) {
    // 如果目录不存在或读取失败，返回空数组（与原逻辑一致）
    console.error('Failed to load crawler rules:', error);
    return NextResponse.json([]);
  }
}