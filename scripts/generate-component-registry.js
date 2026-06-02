#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REGISTRY_DIR = path.join(__dirname, '../lib/webbuilder/registry');
const OUTPUT_FILE = path.join(__dirname, '../lib/webbuilder/components.aggregate.ts');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function scanRegistryFiles() {
  if (!fs.existsSync(REGISTRY_DIR)) {
    console.warn(`⚠️ 目录不存在: ${REGISTRY_DIR}`);
    return [];
  }
  const files = fs.readdirSync(REGISTRY_DIR);
  return files.filter(file => file.endsWith('.config.tsx'));
}

function getComponentName(filename) {
  return filename.replace(/\.config\.tsx$/, '');
}

function generateAggregateContent(configFiles) {
  const imports = [];
  const configs = [];

  configFiles.forEach(file => {
    const componentName = getComponentName(file);
    const importName = `${componentName}Config`;
    imports.push(`import { config as ${importName} } from './registry/${componentName}.config';`);
    configs.push(`  ${componentName}: ${importName},`);
  });

  return `// ============================================================
// 此文件由脚本自动生成，请勿手动编辑！
// 运行 'npm run gen:registry' 重新生成
// ============================================================

${imports.join('\n')}

// 🔥 直接导出组件配置对象，符合 Puck Config 的 components 字段格式
export default {
${configs.join('\n')}
};
`;
}

function main() {
  console.log('🔍 扫描组件注册表...');
  ensureDir(path.dirname(OUTPUT_FILE));
  const configFiles = scanRegistryFiles();
  if (configFiles.length === 0) {
    console.log('⚠️ 未找到任何 .config.tsx 文件，将生成空注册表');
  } else {
    console.log(`📦 发现 ${configFiles.length} 个组件配置:`);
    configFiles.forEach(file => console.log(`   - ${file}`));
  }
  const content = generateAggregateContent(configFiles);
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`✅ 组件注册表已生成: ${OUTPUT_FILE}`);
}

main();