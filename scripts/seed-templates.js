// scripts/seed-templates.js
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'data', 'webbuilder', 'templates');

const defaultTemplates = [
  { id: 'default_homepage_published',          name: '默认HOME页模板',      category: 'page' },
  { id: 'default_page_published',              name: '默认页面模板',        category: 'page' },
  { id: 'default_product_published',           name: '默认产品详情模板',    category: 'product' },
  { id: 'default_product_category_published',  name: '默认产品合集模板',    category: 'product_category' },
  { id: 'default_product_line_published',      name: '默认产品线模板',      category: 'product_line' },
  { id: 'default_document_published',          name: '默认文档详情模板',    category: 'document' },
  { id: 'default_document_library_published',  name: '默认文档库模板',      category: 'document_library' },
  { id: 'default_blog_published',              name: '默认博客合集模板',    category: 'blog' },
  { id: 'default_blog_post_published',         name: '默认博客详情模板',    category: 'blog_post' },
  { id: 'default_video_category_published',    name: '默认视频合集模板',    category: 'video_category' },
  { id: 'default_video_published',             name: '默认视频详情模板',    category: 'video' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getEmptyTemplateData(title) {
  return {
    root: { props: { title } },
    content: [],
    zones: {},
  };
}

defaultTemplates.forEach(({ id, name, category }) => {
  const catDir = path.join(TEMPLATES_DIR, category);
  ensureDir(catDir);

  // 获取基础 ID（去掉 _published 后缀），用于清理旧文件
  const baseId = id.replace(/_published$/, '');
  
  // 清理可能存在的旧版无后缀文件
  const oldFiles = [
    path.join(catDir, `${baseId}.json`),
    path.join(catDir, `${baseId}_draft.json`),
  ];
  oldFiles.forEach(oldFile => {
    if (fs.existsSync(oldFile)) {
      fs.unlinkSync(oldFile);
      console.log(`🗑️ 清理旧文件: ${category}/${path.basename(oldFile)}`);
    }
  });

  const filePath = path.join(catDir, `${id}.json`);

  // 如果文件不存在，则创建
  if (!fs.existsSync(filePath)) {
    const template = {
      id: id,
      name: name,
      category: category,
      data: getEmptyTemplateData(name),
      isSystem: true,
      version: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    console.log(`✅ 创建系统模板: ${category}/${id}.json`);
  } else {
    // 如果已存在，检查是否为系统模板，是则更新
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (existing.isSystem) {
      existing.name = name;
      existing.data = getEmptyTemplateData(name);
      existing.isSystem = true;
      existing.version = 'published';
      existing.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
      console.log(`🔄 更新系统模板: ${category}/${id}.json`);
    } else {
      console.log(`⚠️ 跳过非系统模板: ${category}/${id}.json`);
    }
  }
});

console.log('✅ 所有系统模板初始化完成');