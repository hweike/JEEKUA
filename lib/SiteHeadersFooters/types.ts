// lib/SiteHeadersFooters/types.ts

// 页头相关类型
export interface LogoConfig {
  imageUrl: string;
  width: number;
  position: 'top-center' | 'middle-left' | 'middle-center';
  mobilePosition: 'center' | 'left';
  faviconUrl: string;
}

export interface MenuConfig {
  menuSourceId: string;
  menuType: 'dropdown' | 'mega';
  stickyBehavior: 'scroll-up' | 'always';
  showSeparator: boolean;
}

export interface UtilitiesConfig {
  showLanguageSelector: boolean;
  topSpacing: number;
  bottomSpacing: number;
}

export interface Announcement {
  id: string;
  text: string;
  link?: string;
}

export interface HeaderConfig {
  style: 'simple' | 'classic' | 'luxury';
  logo: LogoConfig;
  menu: MenuConfig;
  utilities: UtilitiesConfig;
  announcements: {
    enabled: boolean;
    items: Announcement[];
  };
  search: {
    enabled: boolean;
    placeholder: string;
  };
}

// 页脚相关类型
export interface EmailSubscriptionConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
}

export interface BrandMenuItem {
  visible: boolean;
  imageUrl?: string;
  imageWidth?: number;
  imageAlign?: 'left' | 'center' | 'right';
}

export interface MenuColumn {
  visible: boolean;
  title: string;
  menuId: string;
}

export interface SocialLink {
  platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'linkedin' | 'snapchat' | 'pinterest' | 'vimeo';
  url: string;
}

// ✅ 新增：文本信息配置
export interface TextInfoConfig {
  enabled: boolean;
  title: string;
  content: string;
}

export interface FooterConfig {
  style: 'simple' | 'classic' | 'luxury';
  emailSubscription: EmailSubscriptionConfig;
  brandMenu: {
    brandItem: BrandMenuItem;
    column1: MenuColumn;
    column2: MenuColumn;
    column3: MenuColumn;
  };
  social: {
    visible: boolean;
    links: SocialLink[];
  };
  utilities: {
    showPolicyLinks: boolean;
    topSpacing: number;
    bottomSpacing: number;
  };
  textInfo: TextInfoConfig; // 现在已定义
}