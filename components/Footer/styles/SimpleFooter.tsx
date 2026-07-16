'use client';

import { FooterConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import { ActiveFooterItem, getActiveFooterItems, getLayoutMode } from '../shared/utils';
import BrandItem from '../shared/BrandItem';
import MenuColumn from '../shared/MenuColumn';
import TextInfo from '../shared/TextInfo';
import NewsletterSection from '../shared/NewsletterSection';
import FooterHorizontalMenu from '../shared/FooterHorizontalMenu';
import SocialLinks from '../shared/SocialLinks';
import PolicyLinks from '../shared/PolicyLinks';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

interface SimpleFooterProps {
  footerConfig?: FooterConfig;
  menusMap: Map<string, any>;
  siteSettings?: SiteSettings;
}

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

export default function SimpleFooter({ footerConfig, menusMap, siteSettings }: SimpleFooterProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const safeFooterConfig = footerConfig || DEFAULT_FOOTER_CONFIG;
  const safeSiteName = siteSettings?.siteName || 'My Web';
  const activeItems = getActiveFooterItems(safeFooterConfig, menusMap, safeSiteName);
  const layoutMode = getLayoutMode(activeItems.length);
  const { emailSubscription, brandMenu, social, utilities, textInfo } = safeFooterConfig;

  const paddingStyle = {
    paddingTop: `${utilities.topSpacing}px`,
    paddingBottom: `${utilities.bottomSpacing}px`,
  };

  const renderActiveItem = (item: ActiveFooterItem) => {
    switch (item.type) {
      case 'brand':
        return (
          <BrandItem
            imageUrl={item.data.imageUrl}
            imageWidth={item.data.imageWidth}
            imageAlign={item.data.imageAlign}
            siteName={safeSiteName}
          />
        );
      case 'menu':
        if (layoutMode === 'horizontal') {
          // 横向布局时简单显示菜单列表（这里简单使用垂直菜单，可扩展横向样式）
          return <MenuColumn title={item.title} menu={item.data.menu} menuId={item.data.menuId} />;
        }
        return (
          <MenuColumn
            title={item.title}
            menu={item.data.menu}
            menuId={item.data.menuId}
          />
        );
      case 'text':
        return (
          <TextInfo
            title={item.title}
            content={item.data.content}
          />
        );
      default:
        return null;
    }
  };

  return (
    <footer
      className="border-t border-border"
      style={{
        ...paddingStyle,
        backgroundColor: 'var(--footer-bg, var(--background))',
        color: 'var(--footer-text, var(--foreground))',
      }}
    >
      {emailSubscription.enabled && (
        <div className="border-b-0">
          <NewsletterSection title={emailSubscription.title} subtitle={emailSubscription.subtitle} />
        </div>
      )}

      {activeItems.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {layoutMode === 'horizontal' ? (
            <div className="flex flex-wrap justify-start gap-8">
              {activeItems.map((item) => (
                <div key={item.key} className={activeItems.length === 1 ? "flex-1 flex justify-center" : "flex-1 min-w-[150px]"}>
                  {renderActiveItem(item)}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {activeItems.slice(0, 5).map((item) => (
                <div key={item.key}>{renderActiveItem(item)}</div>
              ))}
              {activeItems.length > 5 && (
                <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mt-8">
                  {activeItems.slice(5).map((item) => (
                    <div key={item.key}>{renderActiveItem(item)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {social.visible && social.links.length > 0 && (
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SocialLinks links={social.links} />
          </div>
        </div>
      )}

      <div className="border-t border-[rgba(255,255,255,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="text-center md:text-left">
              © {new Date().getFullYear()} {safeSiteName}. Powered by{' '}
              <a
                href="https://www.jeekua.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-footer-link hover:text-footer-link-hover transition-colors"
              >
                JEEKUA
              </a>
            </div>
            {utilities.showPolicyLinks && <PolicyLinks />}
          </div>
        </div>
      </div>
    </footer>
  );
}