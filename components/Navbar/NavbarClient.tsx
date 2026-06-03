'use client';

import { HeaderConfig } from '@/lib/config-loader';
import { FooterConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import DefaultNavbar from './styles/DefaultNavbar';
import ClassicNavbar from './styles/ClassicNavbar';
import SimpleNavbar from './styles/SimpleNavbar';
import LuxuryNavbar from './styles/LuxuryNavbar/LuxuryNavbar';

interface NavbarClientProps {
  headerConfig: HeaderConfig;
  menuTree: any[];
  siteSettings: SiteSettings;
  footerConfig?: FooterConfig;
}

// 风格映射表（后续可扩展）
const styleMap: Record<string, React.ComponentType<NavbarClientProps>> = {
  default: DefaultNavbar,
  simple: SimpleNavbar,   // 未来添加
  classic: ClassicNavbar,
  luxury: LuxuryNavbar,
};

export default function NavbarClient({ headerConfig, menuTree, siteSettings, footerConfig }: NavbarClientProps) {
  // 防御：如果 headerConfig 为 undefined，使用默认空对象；并通过类型断言访问 style 属性
  const safeHeaderConfig = headerConfig || { style: 'default' } as HeaderConfig & { style?: string };
  const style = (safeHeaderConfig as any).style || 'default';
  const Component = styleMap[style] || DefaultNavbar;
  return (
    <Component
      headerConfig={headerConfig}
      menuTree={menuTree}
      siteSettings={siteSettings}
      footerConfig={footerConfig}
    />
  );
}