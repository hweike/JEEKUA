#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const componentName = process.argv[2];
if (!componentName) {
  console.error('请提供组件名称，例如: npm run gen-block button');
  process.exit(1);
}

const componentPascal = componentName.charAt(0).toUpperCase() + componentName.slice(1);
const componentPath = path.join(projectRoot, 'components', 'ui', `${componentName}.tsx`);
const blocksDir = path.join(projectRoot, 'lib', 'webbuilder', 'blocks');   // 修改为小写 webbuilder
const targetBlockDir = path.join(blocksDir, componentPascal);
const configPath = path.join(projectRoot, 'lib', 'webbuilder', 'config.tsx'); // 修改路径

async function componentExists() {
  try {
    await fs.access(componentPath);
    return true;
  } catch {
    return false;
  }
}

async function extractProps() {
  const source = await fs.readFile(componentPath, 'utf-8');
  const propsMatch = source.match(/export\s+(interface|type)\s+(\w+Props)\s*=/);
  if (!propsMatch) return null;
  const propsTypeName = propsMatch[2];
  const interfaceMatch = source.match(new RegExp(`export\\s+interface\\s+${propsTypeName}\\s*\\{([^}]+)\\}`));
  if (interfaceMatch) {
    const members = interfaceMatch[1];
    const lines = members.split('\n');
    const props = [];
    for (const line of lines) {
      const propMatch = line.match(/^\s*(\w+)\??\s*:/);
      if (propMatch) props.push(propMatch[1]);
    }
    return { propsTypeName, props };
  }
  return null;
}

async function generateIndex() {
  const content = `import { ${componentName} } from "@/components/ui/${componentName}";
export type ${componentPascal}Props = React.ComponentProps<typeof ${componentName}>;
export { ${componentName} };
`;
  await fs.writeFile(path.join(targetBlockDir, 'index.tsx'), content);
}

async function generateBlock(propsInfo) {
  let fieldsCode = '';
  let defaultPropsCode = '';
  if (propsInfo && propsInfo.props.length) {
    for (const prop of propsInfo.props) {
      let fieldType = 'text';
      let fieldOptions = '';
      if (prop === 'variant' || prop === 'size') {
        fieldType = 'select';
        fieldOptions = `\n      options: [\n        { label: "默认", value: "default" },\n        { label: "轮廓", value: "outline" },\n      ],`;
      } else if (prop === 'children') {
        fieldType = 'text';
      } else if (prop.includes('src') || prop.includes('url') || prop.includes('link')) {
        fieldType = 'text';
      } else if (prop.includes('disabled')) {
        fieldType = 'boolean';
      }
      fieldsCode += `    ${prop}: { type: "${fieldType}"${fieldOptions}, label: "${prop}" },\n`;
      let defaultValue = '""';
      if (fieldType === 'boolean') defaultValue = 'false';
      defaultPropsCode += `    ${prop}: ${defaultValue},\n`;
    }
  } else {
    fieldsCode = `    children: { type: "text", label: "内容" },\n`;
    defaultPropsCode = `    children: "这是一个 ${componentName} 组件",\n`;
  }
  const blockContent = `import type { ComponentConfig } from "@measured/puck";
import { ${componentName}, ${componentPascal}Props } from "./index";

export const ${componentPascal}Block: ComponentConfig<${componentPascal}Props> = {
  fields: {
${fieldsCode}  },
  defaultProps: {
${defaultPropsCode}  },
  render: (props) => <${componentName} {...props} />,
};
`;
  await fs.writeFile(path.join(targetBlockDir, 'block.tsx'), blockContent);
}

async function registerInConfig() {
  let configContent = await fs.readFile(configPath, 'utf-8');
  const importRegex = new RegExp(`import\\s+\\{.*\\b${componentPascal}Block\\b.*\\}\\s+from\\s+['"].*blocks/${componentPascal}/block['"]`);
  if (importRegex.test(configContent)) {
    console.log(`区块 ${componentPascal}Block 已存在，跳过注册`);
    return;
  }
  const importStatement = `import { ${componentPascal}Block } from "./blocks/${componentPascal}/block";\n`;
  const lastImportIndex = configContent.lastIndexOf('import ');
  const afterLastImport = configContent.indexOf('\n', lastImportIndex) + 1;
  configContent = configContent.slice(0, afterLastImport) + importStatement + configContent.slice(afterLastImport);
  const componentsRegex = /(components:\s*\{)([\s\S]*?)(\})/;
  const match = configContent.match(componentsRegex);
  if (match) {
    const before = match[1];
    const body = match[2];
    const after = match[3];
    if (body.includes(`${componentPascal}Block,`)) return;
    const newBody = body + `    ${componentPascal}Block,\n`;
    configContent = configContent.replace(componentsRegex, `${before}${newBody}${after}`);
  } else {
    console.error('无法定位 config.tsx 中的 components 对象，请手动注册');
    return;
  }
  await fs.writeFile(configPath, configContent);
  console.log(`✅ 已自动注册 ${componentPascal}Block 到 config.tsx`);
}

async function main() {
  if (!await componentExists()) {
    console.error(`组件 ${componentName} 不存在，请先运行: npx shadcn@latest add ${componentName}`);
    process.exit(1);
  }
  await fs.mkdir(targetBlockDir, { recursive: true });
  const propsInfo = await extractProps();
  await generateIndex();
  await generateBlock(propsInfo);
  await registerInConfig();
  console.log(`🎉 成功为组件 ${componentName} 生成 Puck 区块！`);
  console.log(`   区块位置: ${path.relative(projectRoot, targetBlockDir)}`);
  console.log(`   请检查并完善 block.tsx 中的 fields 和 defaultProps。`);
}

main().catch(console.error);