// app/api/discovery/translation-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

// R2 中存储路径
function getStorageKey(): string {
  return `discovery/translation-config.json`;
}

// 默认配置（包含 prompt 字段）
// 这个配置表中的字段名称与实际业务模块的内容表中的字段名称一致，便于后续根据配置动态调用翻译接口
// 产品中attributes字段比较特殊，是一个对象，在代码进行了特殊处理，翻译时会递归翻译其中的键和值，但保持技术术语不变
const DEFAULT_CONFIG = {
  home: {
    fields: ["title", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将首页的标题和SEO信息翻译成目标语言。保持品牌名称和关键术语不变。"
  },
  page: {
    fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将静态页面的标题、正文和SEO信息翻译成目标语言。保持HTML标记和变量（如{{name}}）不变，不翻译URL链接。"
  },
   productLine: {
    fields: ["seoTitle", "seoDescription", "seoKeywords"],
    prompt: "将产品线名称和SEO信息翻译成目标语言。保持品牌名称（如'金升阳', 'mornsun'）和技术术语不变。"
  },
   productCollection: {
    fields: ["name", "description", "seoTitle", "seoDescription", "seoKeywords"],
    prompt: "将产品分类标题、描述和SEO信息翻译成目标语言。保持分类中涉及的技术术语、品牌名称和产品型号不变。"
  },
  product: {
    fields: ["product_name", "short_description", "description", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将产品标题、简述、详细描述和SEO信息翻译成目标语言。保持技术术语（如电压、功率）、品牌名称和产品型号不变。属性字段（attributes）是一个包含多个属性项的数组，每个属性项有 name 和 value 两个字段，请分别翻译 name 和 value，但保持技术术语不变。"
  }, 
  blogCategory: {
    fields: ["title", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将博客分类标题和SEO信息翻译成目标语言。保持分类名称的简洁和准确。"
  },
  blogPost: {
    fields: ["title", "excerpt", "content", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将博客文章标题、摘要、正文和SEO信息翻译成目标语言。保持文章风格和语气，保留代码块和链接不变。"
  },
  docLibrary: {
    fields: ["title", "description", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将文档库名称、描述和SEO信息翻译成目标语言。保持文档库名称简洁准确。"
  },
  doc: {
    fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将文档标题、正文和SEO信息翻译成目标语言。保持技术术语、代码和链接不变。"
  },
  videoCategory: {
    fields: ["title", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将视频分类标题和SEO信息翻译成目标语言。保持分类名称的简洁和准确。"
  },
  video: {
    fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将视频标题、描述和SEO信息翻译成目标语言。保持视频相关的技术术语不变。"
  },
  inquiry: {
    fields: ["title", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将询盘页面标题和SEO信息翻译成目标语言。保持表单字段和提示信息不变。"
  },
  policy: {
    fields: ["title", "content", "seo_title", "seo_description", "seo_keywords"],
    prompt: "将政策页面（如隐私政策、服务条款）标题、正文和SEO信息翻译成目标语言。保持法律术语的准确性和严谨性。"
  }
};

export async function GET() {
  try {
    const storage = getPrivateStorage();
    const key = getStorageKey();
    let config;
    try {
      const content = await storage.read(key, 'utf8');
      config = JSON.parse(content as string);
    } catch (error: any) {
      // 文件不存在，创建默认配置
      if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
        await storage.write(key, JSON.stringify(DEFAULT_CONFIG, null, 2), { contentType: 'application/json' });
        config = DEFAULT_CONFIG;
      } else {
        throw error;
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
    // 验证每个类型必须有 fields 和 prompt（prompt 可选）
    for (const [key, value] of Object.entries(newConfig)) {
      if (typeof value !== 'object' || !Array.isArray((value as any).fields)) {
        return NextResponse.json({ error: `Invalid config for type "${key}": missing fields array` }, { status: 400 });
      }
      // prompt 是可选的，但建议提供
      if ((value as any).prompt !== undefined && typeof (value as any).prompt !== 'string') {
        return NextResponse.json({ error: `Invalid config for type "${key}": prompt must be a string` }, { status: 400 });
      }
    }
    const storage = getPrivateStorage();
    const key = getStorageKey();
    await storage.write(key, JSON.stringify(newConfig, null, 2), { contentType: 'application/json' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/discovery/translation-config error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}