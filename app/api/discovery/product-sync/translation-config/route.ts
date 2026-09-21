// app/api/discovery/product-sync/translation-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

const CONFIG_KEY = 'discovery/product-sync-config.json';

// 默认配置（与 AI 助手保持一致，增加 attributes 支持）
const DEFAULT_CONFIG = {
  fields: [
    'product_name',
    'short_description',
    'description',
    'spec_text',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'attributes', // 新增
  ],
  promptTemplate: `你是一位专业的产品翻译专家。请将以下产品信息从 {sourceLocale} 翻译成 {targetLocale} 版本。

【翻译要求】:
1. 只翻译以下字段：{fields}
2. 对于 description 和 spec_text 字段：
   - 这些字段可能包含 HTML 标签（如 <p>, <strong>, <ul>, <li> 等）。
   - 请完整保留所有 HTML 标签、属性、类名和结构。
   - 只翻译标签之间的用户可见文本（即标签内的自然语言内容）。
   - 不要翻译任何数字、单位（如 V, A, W, Hz）、型号代码、标准编号或品牌名称。
3. 对于 attributes 字段：
   - attributes 是一个键值对对象，其中键（如“型号”“功率”）和值（如“VCB48_SBO-30WR3-N”“30”）都需要翻译。
   - 对于值，同样遵循第2条规则：只翻译自然语言部分，保留数字、单位、型号代码等。
   - 翻译后的 attributes 对象应保持相同的键值对结构。
4. 对于所有纯文本字段，直接翻译自然语言内容。
5. 不要翻译 id、任何技术标识符。
6. 翻译要准确、自然，符合目标语言的产品营销表达习惯；专业术语应使用行业标准译法。

【输入数据】（JSON格式）:
{data}

【输出格式】:
请直接输出纯 JSON 对象，包含翻译后的所有字段，字段名保持不变，不要添加任何额外解释或代码块标记。`,
};

async function readConfig() {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(CONFIG_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch {
    // 文件不存在时返回默认配置
    return DEFAULT_CONFIG;
  }
}

export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('读取产品同步翻译配置失败:', error);
    return NextResponse.json({ error: '读取配置失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { fields, promptTemplate } = body;
    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields 必须是数组' }, { status: 400 });
    }
    if (typeof promptTemplate !== 'string') {
      return NextResponse.json({ error: 'promptTemplate 必须是字符串' }, { status: 400 });
    }
    const storage = getPrivateStorage();
    await storage.write(
      CONFIG_KEY,
      JSON.stringify({ fields, promptTemplate }, null, 2),
      { contentType: 'application/json' }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('保存产品同步翻译配置失败:', error);
    return NextResponse.json({ error: error.message || '保存失败' }, { status: 500 });
  }
}