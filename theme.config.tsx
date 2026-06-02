// theme.config.tsx
import type { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <span>📘 管理后台帮助中心</span>,
  project: {
    link: 'https://github.com/your/project', // 可选，你的项目仓库
  },
  docsRepositoryBase: 'https://github.com/your/project/blob/main', // 可选，用于“编辑此页”
  footer: {
    text: '内部帮助文档 - 仅管理员可见',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – 帮助中心',
    };
  },
  search: {
    placeholder: '搜索文档...',
  },
  // 如果你需要多语言，可配置 i18n
  // i18n: [{ locale: 'zh-CN', text: '中文' }],
};

export default config;