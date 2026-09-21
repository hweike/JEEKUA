'use client';

import { FooterConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import SimpleFooter from './styles/SimpleFooter';

interface FooterClientProps {
  footerConfig?: FooterConfig;
  menusMap: Map<string, any>;
  siteSettings?: SiteSettings;
  policyLinks?: React.ReactNode; // 新增
}

const styleMap: Record<string, React.ComponentType<FooterClientProps>> = {
  simple: SimpleFooter,
  default: SimpleFooter,
};

export default function FooterClient({ footerConfig, menusMap, siteSettings, policyLinks }: FooterClientProps) {
  const style = footerConfig?.style || 'simple';
  const Component = styleMap[style] || SimpleFooter;
  return (
    <Component
      footerConfig={footerConfig}
      menusMap={menusMap}
      siteSettings={siteSettings}
      policyLinks={policyLinks}
    />
  );
}