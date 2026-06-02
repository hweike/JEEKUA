import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'discovery', 'translation-config.json');
const DEFAULT_CONFIG = {
  home: { fields: ["title", "seo_title", "seo_description", "seo_keywords"] },
  page: { fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"] },
  product: { fields: ["title", "short_description", "content", "seo_title", "seo_description", "seo_keywords"] },
  productCollection: { fields: ["title", "description", "seo_title", "seo_description", "seo_keywords"] },
  blogCategory: { fields: ["title", "seo_title", "seo_description", "seo_keywords"] },
  blogPost: { fields: ["title", "excerpt", "content", "seo_title", "seo_description", "seo_keywords"] },
  docLibrary: { fields: ["title", "description", "seo_title", "seo_description", "seo_keywords"] },
  doc: { fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"] },
  videoCategory: { fields: ["title", "seo_title", "seo_description", "seo_keywords"] },
  video: { fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"] },
  inquiry: { fields: ["title", "seo_title", "seo_description", "seo_keywords"] },
  policy: { fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"] },
};

export async function GET() {
  try {
    let config;
    try {
      const content = await fs.readFile(CONFIG_PATH, 'utf-8');
      config = JSON.parse(content);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // 文件不存在，创建默认配置
        await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
        config = DEFAULT_CONFIG;
      } else {
        throw err;
      }
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/discovery/translation-config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const newConfig = await req.json();
    if (typeof newConfig !== 'object' || newConfig === null) {
      return NextResponse.json({ error: 'Invalid config: must be an object' }, { status: 400 });
    }
    for (const [key, value] of Object.entries(newConfig)) {
      if (typeof value !== 'object' || !Array.isArray((value as any).fields)) {
        return NextResponse.json({ error: `Invalid config for type "${key}": missing fields array` }, { status: 400 });
      }
    }
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/discovery/translation-config error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}