'use client';

import { FooterConfig, Menu } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import { ActiveFooterItem, getActiveFooterItems, getLayoutMode } from '../shared/utils';
import BrandItem from '../shared/BrandItem';
import MenuColumn from '../shared/MenuColumn';
import TextInfo from '../shared/TextInfo';
import NewsletterSection from '../shared/NewsletterSection';
import SocialLinks from '../shared/SocialLinks';

interface SimpleFooterProps {
  footerConfig?: FooterConfig;
  menusMap: Map<string, any>;
  siteSettings?: SiteSettings;
  policyLinks: React.ReactNode;
}

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  emailSubscription: { enabled: false, title: "", subtitle: "" },
  brandMenu: {
    brandItem: { visible: false, imageUrl: "", imageWidth: 200, imageAlign: "left" },
    column1: { visible: false, title: "", menuId: "" },
    column2: { visible: false, title: "", menuId: "" },
    column3: { visible: false, title: "", menuId: "" }
  },
  social: { visible: false, links: [] },
  utilities: { showPolicyLinks: true, topSpacing: 32, bottomSpacing: 32 },
  textInfo: { enabled: false, title: "", content: "" }
};

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function SimpleFooter({
  footerConfig,
  menusMap,
  siteSettings,
  policyLinks
}: SimpleFooterProps) {
  const safeFooterConfig = footerConfig || DEFAULT_FOOTER_CONFIG;
  const safeSiteName = siteSettings?.siteName || 'My Web';
  const activeItems = getActiveFooterItems(safeFooterConfig, menusMap, safeSiteName);
  const layoutMode = getLayoutMode(activeItems.length);
  const { emailSubscription, brandMenu, social, utilities, textInfo } = safeFooterConfig;

  // ============================================================
  // 菜单列数量判断（直接读配置，严谨）
  // 与 getActiveFooterItems 的判定保持一致：visible && menuId
  // ============================================================
  const enabledMenuColumns = [
    brandMenu.column1,
    brandMenu.column2,
    brandMenu.column3,
  ].filter((col) => col?.visible && col?.menuId);

  const enabledMenuCount = enabledMenuColumns.length;
  const isSingleMenuMode = enabledMenuCount === 1;

  // 唯一菜单列 + 从 menusMap 取菜单数据（menusMap.get 返回 Menu | null）
  const singleMenuColumn = isSingleMenuMode ? enabledMenuColumns[0] : null;
  const singleMenu: Menu | null = singleMenuColumn?.menuId
    ? menusMap.get(singleMenuColumn.menuId) ?? null
    : null;

  // brand / text / social 直接读配置
  const hasBrand = !!brandMenu.brandItem?.visible;
  const hasText = !!textInfo?.enabled;
  const hasSocial = !!(social.visible && social.links.length > 0);

  // ✅ 品牌图片宽度：来自数据库配置，缺失时回退 200
  const brandImageWidth = brandMenu.brandItem?.imageWidth || 200;

  // ✅ 场景二网格列数：按实际项数动态生成，避免空列
  const gridColsClass =
    activeItems.length <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : activeItems.length === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : activeItems.length === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5';

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
            imageWidth={item.data.imageWidth || 200}
            imageAlign={item.data.imageAlign}
            siteName={safeSiteName}
          />
        );
      case 'menu':
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
      className="border-t"
      style={{
        ...paddingStyle,
        backgroundColor: 'var(--footer-bg, var(--background, #ffffff))',
        color: 'var(--footer-text, var(--foreground, #0f172a))',
        borderColor: 'var(--footer-divider-color, var(--border, #e2e8f0))',
      }}
    >
      {emailSubscription.enabled && (
        <div className="border-b-0">
          <NewsletterSection title={emailSubscription.title} subtitle={emailSubscription.subtitle} />
        </div>
      )}

      {/* ============================================================
          场景一：只有 1 个菜单列启用
          第一行：唯一菜单横向展开
          第二行：固定 3 列 —— Brand 居左 / 社媒居中 / text 居左
         ============================================================ */}
      {isSingleMenuMode ? (
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{
            paddingTop: 'var(--spacing-8, 2rem)',
            paddingBottom: 'var(--spacing-8, 2rem)',
          }}
        >
          {/* 第一行：唯一菜单列，横向展开 */}
          {singleMenuColumn && singleMenu && (
            <div className="w-full">
              <MenuColumn
                title={singleMenuColumn.title}
                menu={singleMenu}
                menuId={singleMenuColumn.menuId}
                horizontal
              />
            </div>
          )}

          {/* 第二行：固定 3 列 —— Brand 居左 / 社媒居中 / text 居左 */}
          {(hasBrand || hasSocial || hasText) && (
            <div
              className="grid grid-cols-1 md:grid-cols-3"
              style={{
                gap: 'var(--spacing-8, 2rem)',
                marginTop: 'var(--spacing-8, 2rem)',
                alignItems: 'center',
              }}
            >
              {/* 第 1 列：Brand —— 移动端居中 / md 及以上居左 */}
              <div
                className="flex justify-center md:justify-start"
                style={{ minWidth: 0 }}
              >
                {hasBrand && (
                  <BrandItem
                    imageUrl={brandMenu.brandItem.imageUrl}
                    imageWidth={brandImageWidth}
                    imageAlign={brandMenu.brandItem.imageAlign}
                    siteName={safeSiteName}
                  />
                )}
              </div>

              {/* 第 2 列：社媒 —— 居中 */}
              <div
                className="flex justify-center"
                style={{ minWidth: 0 }}
              >
                {hasSocial && <SocialLinks links={social.links} />}
              </div>

              {/* 第 3 列：text —— 移动端居中 / md 及以上居左 */}
              <div
                className="flex justify-center md:justify-start"
                style={{ minWidth: 0 }}
              >
                {hasText && (
                  <TextInfo
                    title={textInfo.title}
                    content={textInfo.content}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================
           场景二：0 个 或 2 个及以上菜单列启用 → 保持现有逻辑
           brand + 竖向菜单1 + 竖向菜单2 + 竖向菜单3 + text
           social.links 单独一行（>0 则显示）
           ============================================================ */
        <>
          {activeItems.length > 0 && (
            <div
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
              style={{
                paddingTop: 'var(--spacing-8, 2rem)',
                paddingBottom: 'var(--spacing-8, 2rem)',
              }}
            >
              {layoutMode === 'horizontal' ? (
                <div
                  className="flex flex-wrap justify-start"
                  style={{ gap: 'var(--spacing-8, 2rem)' }}
                >
                  {activeItems.map((item) => (
                    <div
                      key={item.key}
                      className={
                        activeItems.length === 1
                          ? 'flex-1 flex justify-center'
                          : 'flex-1 min-w-[150px]'
                      }
                    >
                      {renderActiveItem(item)}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`grid ${gridColsClass}`}
                  style={{ gap: 'var(--spacing-8, 2rem)' }}
                >
                  {activeItems.slice(0, 5).map((item) => (
                    <div key={item.key} style={{ minWidth: 0 }}>
                      {renderActiveItem(item)}
                    </div>
                  ))}
                  {activeItems.length > 5 && (
                    <div
                      className={`col-span-full grid ${gridColsClass}`}
                      style={{
                        gap: 'var(--spacing-8, 2rem)',
                        marginTop: 'var(--spacing-8, 2rem)',
                      }}
                    >
                      {activeItems.slice(5).map((item) => (
                        <div key={item.key} style={{ minWidth: 0 }}>
                          {renderActiveItem(item)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {hasSocial && (
            <div
              style={{
                paddingTop: 'var(--spacing-4, 1rem)',
                paddingBottom: 'var(--spacing-4, 1rem)',
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SocialLinks links={social.links} />
              </div>
            </div>
          )}
        </>
      )}

      {/* 版权区域 */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--footer-divider-color, rgba(255,255,255,0.1))' }}
      >
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{
            paddingTop: 'var(--spacing-6, 1.5rem)',
            paddingBottom: 'var(--spacing-6, 1.5rem)',
          }}
        >
          <div
            className={`flex flex-col md:flex-row items-center ${
              utilities.showPolicyLinks ? 'justify-between' : 'justify-center'
            }`}
            style={{
              gap: 'var(--spacing-4, 1rem)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
            }}
          >
            <div className="text-center md:text-left">
              © {new Date().getFullYear()} {safeSiteName}. Powered by{' '}
              <a
                href="https://www.jeekua.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--footer-link, var(--primary, #1e293b))',
                  transition: COLOR_TRANSITION,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color =
                    'var(--footer-link-hover, var(--accent, #f1f5f9))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color =
                    'var(--footer-link, var(--primary, #1e293b))';
                }}
              >
                JEEKUA
              </a>
            </div>
            {utilities.showPolicyLinks && policyLinks}
          </div>
        </div>
      </div>
    </footer>
  );
}