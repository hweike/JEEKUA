import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const STRATEGIES_DIR = path.join(process.cwd(), 'data', 'seo-strategies');

// 页面类型列表（用于前端下拉或索引）
const PAGE_TYPES = [
  'home', 'productLine', 'productCollection', 'product', 'page',
  'blog', 'blogCategory', 'blogPost', 'docLibrary', 'doc',
  'videoCategory', 'video', 'inquiry', 'policy'
];

// 确保目录存在
async function ensureDir() {
  try {
    await fs.access(STRATEGIES_DIR);
  } catch {
    await fs.mkdir(STRATEGIES_DIR, { recursive: true });
  }
}

// 读取 JSON 文件
async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 写入 JSON 文件
async function writeJsonFile(filePath: string, data: any) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const basic = searchParams.get('basic') === 'true';

  try {
    await ensureDir();

    // 获取全局基础数据
    if (basic) {
      const basicPath = path.join(STRATEGIES_DIR, 'seoBasicData.json');
      let basicData = await readJsonFile(basicPath);
      if (!basicData) {
        // 默认数据
        basicData = {
          site_name: 'My Website',
          brand_name: 'My Brand',
          site_url: 'https://example.com',
          default_locale: 'en',
          supported_locales: ['en'],
          target_audience: '',
          core_values: []
        };
        await writeJsonFile(basicPath, basicData);
      }
      return NextResponse.json({ success: true, data: basicData });
    }

    // 获取单个策略
    if (type && PAGE_TYPES.includes(type)) {
      const strategyPath = path.join(STRATEGIES_DIR, `${type}.json`);
      let strategy = await readJsonFile(strategyPath);
      if (!strategy) {
        // 返回默认空策略
        strategy = {
          pageType: type,
          label: type,
          fields: {
            seo_title: { enabled: true, required: true, minLength: 50, maxLength: 60, promptTemplate: '' },
            seo_description: { enabled: true, required: true, minLength: 150, maxLength: 160, promptTemplate: '' },
            seo_keywords: { enabled: false, required: false, promptTemplate: '' }
          },
          useGlobalContext: true
        };
      }
      return NextResponse.json({ success: true, data: strategy });
    }

    // 获取所有策略列表（只返回元信息，不返回完整 promptTemplate 以减少数据量）
    const strategies = {};
    for (const t of PAGE_TYPES) {
      const strategyPath = path.join(STRATEGIES_DIR, `${t}.json`);
      const strategy = await readJsonFile(strategyPath);
      strategies[t] = strategy ? { label: strategy.label, pageType: strategy.pageType } : { label: t, pageType: t };
    }
    return NextResponse.json({ success: true, data: strategies });
  } catch (error) {
    console.error('GET /api/discovery/seo-strategies error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, basic, data } = body;

    if (!type && basic !== true) {
      return NextResponse.json({ success: false, error: 'Missing type or basic flag' }, { status: 400 });
    }

    await ensureDir();

    // 保存全局基础数据
    if (basic === true) {
      const basicPath = path.join(STRATEGIES_DIR, 'seoBasicData.json');
      await writeJsonFile(basicPath, data);
      return NextResponse.json({ success: true });
    }

    // 保存指定类型的策略
    if (type && PAGE_TYPES.includes(type)) {
      const strategyPath = path.join(STRATEGIES_DIR, `${type}.json`);
      await writeJsonFile(strategyPath, data);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/discovery/seo-strategies error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}