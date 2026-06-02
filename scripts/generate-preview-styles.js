const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../public/preview-styles.css');
const outputPath = path.join(__dirname, '../lib/webbuilder/preview-styles.ts');

let css = fs.readFileSync(cssPath, 'utf8');

// 🔥 关键修复：转义所有反斜杠，防止 TS 解析错误
css = css.replace(/\\/g, '\\\\');
// 转义反引号，防止模板字符串提前闭合
css = css.replace(/`/g, '\\`');
// 转义美元符号，防止模板字符串插值
css = css.replace(/\$/g, '\\$');

const content = `// 自动生成，请勿手动编辑\nexport const PREVIEW_STYLES = \`${css}\`;\n`;

fs.writeFileSync(outputPath, content);
console.log('✅ Generated lib/webbuilder/preview-styles.ts');