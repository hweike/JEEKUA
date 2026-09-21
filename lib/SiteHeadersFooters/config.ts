// lib/SiteHeadersFooters/config.ts
import { HeaderConfig, FooterConfig, SocialLink } from './types';

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  style: 'simple',
  logo: {
    imageUrl: '',
    width: 120,
    position: 'middle-left',
    mobilePosition: 'center',
    faviconUrl: '',
  },
  menu: {
    menuSourceId: 'navigation',
    menuType: 'dropdown',
    stickyBehavior: 'scroll-up',
    showSeparator: false,
  },
  utilities: {
    showLanguageSelector: true,
    topSpacing: 16,
    bottomSpacing: 16,
  },
  announcements: {
    enabled: false,
    items: [],
  },
  search: {
    enabled: true,
    placeholder: '',
  },
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  style: 'simple',
  emailSubscription: {
    enabled: false,
    title: 'Subscribe to our newsletter',
    subtitle: 'Get the latest updates directly in your inbox.',
  },
  brandMenu: {
    brandItem: {
      visible: true,
      imageUrl: '',
      imageWidth: 120,
      imageAlign: 'left',
    },
    column1: { visible: true, title: 'Quick Links', menuId: 'footer-menu-1' },
    column2: { visible: true, title: 'Resources', menuId: 'footer-menu-2' },
    column3: { visible: true, title: 'Support', menuId: 'footer-menu-3' },
  },
  social: {
    visible: true,
    links: [],
  },
  utilities: {
    showPolicyLinks: true,
    topSpacing: 32,
    bottomSpacing: 32,
  },
  // ✅ 顶层 textInfo 字段已包含（与 FooterConfig 类型匹配）
  textInfo: {
    enabled: false,
    title: '',
    content: '',
  },
};

// 社交平台配置（顺序已调整：LinkedIn 在 Twitter 之后）
export const SOCIAL_PLATFORMS: { value: SocialLink['platform']; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'vimeo', label: 'Vimeo' },
];

export const LOGO_POSITIONS = [
  { value: 'top-center', label: '顶部居中' },
  { value: 'middle-left', label: '中间居左' },
  { value: 'middle-center', label: '中间居中' },
] as const;

export const MOBILE_LOGO_POSITIONS = [
  { value: 'center', label: '居中' },
  { value: 'left', label: '居左' },
] as const;

export const MENU_TYPES = [
  { value: 'dropdown', label: '下拉菜单' },
  { value: 'mega', label: '超级菜单' },
] as const;

export const STICKY_BEHAVIORS = [
  { value: 'scroll-up', label: '向上滚动' },
  { value: 'always', label: '始终' },
] as const;

export const ALIGN_OPTIONS = [
  { value: 'left', label: '居左' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '居右' },
] as const;