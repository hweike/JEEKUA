// lib/theme/page-mappings.ts

export const PAGE_TYPE_MAP: Record<string, string> = {
  home: '/',
  products: '/products/*',
  blog: '/blog/*',
  docs: '/docs/*',
  video: '/videos/*',
  inquiry: '/inquiry/*',
  account: '/account/*',
};

export const PAGE_TYPE_OPTIONS = [
  { id: 'home', label: '首页' },
  { id: 'products', label: '产品页' },
  { id: 'blog', label: 'Blog' },
  { id: 'docs', label: '文档页' },
  { id: 'video', label: '视频页' },
  { id: 'inquiry', label: '询盘页' },
  { id: 'account', label: '用户中心' },
  { id: 'custom', label: '普通页面' },
];