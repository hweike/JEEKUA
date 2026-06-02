import { FooterConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import FooterClient from './FooterClient';

interface FooterProps {
  footerConfig?: FooterConfig;
  menusMap: Map<string, any>;
  siteSettings?: SiteSettings;
}

export default function Footer({ footerConfig, menusMap, siteSettings }: FooterProps) {
  return (
    <FooterClient
      footerConfig={footerConfig}
      menusMap={menusMap}
      siteSettings={siteSettings}
    />
  );
}