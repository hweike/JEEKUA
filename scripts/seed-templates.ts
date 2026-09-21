// scripts/seed-templates.ts
// ✅ 加载环境变量（tsx 不会自动加载 .env.local）
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 如果环境变量仍未加载，手动设置备用值（确保 R2_PRIVATE_BUCKET 存在）
process.env.R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || 'feisman-power-private';

import { getPrivateStorage } from '@/lib/storage/factory';
import { createHash } from 'crypto';

const STORAGE_PREFIX = 'webbuilder/templates';

interface TemplateDef {
  id: string;
  name: string;
  category: string;
}

// 所有系统模板定义（包含两个新增模板）
const defaultTemplates: TemplateDef[] = [
  { id: 'default_homepage',          name: '默认HOME页模板',        category: 'page' },
  { id: 'default_page',              name: '默认页面模板',          category: 'page' },
  { id: 'default_inquiry',           name: '默认询盘模板',          category: 'page' },
  { id: 'default_product',           name: '默认产品详情模板',      category: 'product' },
  { id: 'default_product_category',  name: '默认产品合集模板',      category: 'product_category' },
  { id: 'default_product_line',      name: '默认产品线模板',        category: 'product_line' },
  { id: 'default_document',          name: '默认文档详情模板',      category: 'document' },
  { id: 'default_document_library',  name: '默认文档库模板',        category: 'document_library' },
  { id: 'default_blog',              name: '默认博客合集模板',      category: 'blog' },
  { id: 'default_blog_post',         name: '默认博客详情模板',      category: 'blog_post' },
  { id: 'default_video_category',    name: '默认视频合集模板',      category: 'video_category' },
  { id: 'default_video',             name: '默认视频详情模板',      category: 'video' },
  // ✅ 新增两个模板：news 归类到 blog，PSU 归类到 product_line
  { id: 'default_news',              name: '默认新闻资讯页模板',    category: 'blog' },
  { id: 'default_product_line_PSU',  name: '默认工业产品线模板',    category: 'product_line' },
];

function getEmptyPuckData(title: string) {
  return {
    root: { props: { title } },
    content: [],
    zones: {},
  };
}

function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function seedSystemTemplates() {
  const storage = getPrivateStorage();
  const now = new Date().toISOString();

  for (const def of defaultTemplates) {
    const publishedId = `${def.id}_published`;
    const key = `${STORAGE_PREFIX}/${def.category}/${publishedId}.json`;

    // 检查文件是否已存在
    let exists = false;
    try {
      await storage.read(key, 'utf8');
      exists = true;
    } catch {
      // 文件不存在，继续创建
    }

    if (exists) {
      console.log(`✅ 系统模板已存在: ${def.name} (${key})，跳过`);
      continue;
    }

    const data = getEmptyPuckData(def.name);
    const template = {
      id: publishedId,
      name: def.name,
      category: def.category,
      data,
      isSystem: true,
      version: 'published' as const,
      hash: computeTemplateHash(data),
      syncStatus: 'idle' as const,
      createdAt: now,
      updatedAt: now,
    };

    await storage.write(key, JSON.stringify(template, null, 2), {
      contentType: 'application/json',
    });
    console.log(`✅ 创建系统模板: ${key}`);
  }

  console.log('🎉 所有系统模板导入完成');
}

seedSystemTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 导入失败:', err);
    process.exit(1);
  });