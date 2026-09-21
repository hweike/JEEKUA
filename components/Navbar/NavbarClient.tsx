'use client';

import { HeaderConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import DefaultNavbar from './styles/DefaultNavbar';
import ClassicNavbar from './styles/ClassicNavbar';
import SimpleNavbar from './styles/SimpleNavbar';
import LuxuryNavbar from './styles/LuxuryNavbar';

interface NavbarClientProps {
  headerConfig: HeaderConfig;
  menuTree: any[];
  siteSettings: SiteSettings;
  footerConfig?: any;
}

const styleMap: Record<string, React.ComponentType<NavbarClientProps>> = {
  default: DefaultNavbar,
  simple: SimpleNavbar,
  classic: ClassicNavbar,
  luxury: LuxuryNavbar,
};

export default function NavbarClient({ headerConfig, menuTree, siteSettings, footerConfig }: NavbarClientProps) {
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