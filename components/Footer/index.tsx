import FooterClient from './FooterClient';
import PolicyLinks from './shared/PolicyLinks';
import { FooterConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';

interface FooterProps {
  footerConfig?: FooterConfig;
  menusMap: Map<string, any>;
  siteSettings?: SiteSettings;
}

// 完整的默认配置（与 SimpleFooter 中的保持一致）
const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  emailSubscription: { enabled: false, title: "", subtitle: "" },
  brandMenu: {
    brandItem: { visible: false, imageUrl: "", imageWidth: 120, imageAlign: "left" },
    column1: { visible: false, title: "", menuId: "" },
    column2: { visible: false, title: "", menuId: "" },
    column3: { visible: false, title: "", menuId: "" }
  },
  social: { visible: false, links: [] },
  utilities: { showPolicyLinks: true, topSpacing: 32, bottomSpacing: 32 },
  textInfo: { enabled: false, title: "", content: "" }
};

export default function Footer({ footerConfig, menusMap, siteSettings }: FooterProps) {
  const safeConfig = footerConfig || DEFAULT_FOOTER_CONFIG;
  const showPolicyLinks = safeConfig.utilities?.showPolicyLinks ?? true;

  // 仅在需要显示时才创建 PolicyLinks 组件
  const policyLinks = showPolicyLinks ? <PolicyLinks /> : null;

  return (
    <FooterClient
      footerConfig={footerConfig}
      menusMap={menusMap}
      siteSettings={siteSettings}
      policyLinks={policyLinks}
    />
  );
}