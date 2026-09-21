'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, LogOut, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Account');

  const menuItems = [
    { name: t('profile'), href: `/${locale}/account`, icon: User },
    { name: t('orders'), href: `/${locale}/account/orders`, icon: ShoppingBag },
    { name: t('inquiry'), href: `/${locale}/account/inquiry`, icon: Mail },
  ];

  const logout = () => {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; max-age=0';
    window.location.replace(`/${locale}/login`);
  };

  // ============================================================
  // ✅ 账户布局专属 CSS 变量
  // ============================================================
  const sidebarBg = 'var(--account-sidebar-bg, #ffffff)';
  const sidebarBorder = 'var(--account-sidebar-border, #e5e7eb)';
  const sidebarTitleColor = 'var(--account-sidebar-title-color, #374151)';
  const menuText = 'var(--account-menu-text, #4b5563)';
  const menuHoverBg = 'var(--account-menu-hover-bg, #f3f4f6)';
  const menuActiveBg = 'var(--account-menu-active-bg, #eff6ff)';
  const menuActiveText = 'var(--account-menu-active-text, #1d4ed8)';
  const logoutColor = 'var(--account-logout-color, #dc2626)';
  const logoutHoverBg = 'var(--account-logout-hover-bg, #fef2f2)';
  const contentBg = 'var(--account-content-bg, #ffffff)';
  const contentText = 'var(--account-content-text, #111827)';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col md:flex-row">
        <aside
          className="w-full md:w-64 p-3 sm:p-4 md:p-6 flex-shrink-0 border-b md:border-b-0 md:border-r"
          style={{
            backgroundColor: sidebarBg,
            borderColor: sidebarBorder,
          }}
        >
          <h2
            className="text-lg font-semibold mb-3 md:mb-4"
            style={{ color: sidebarTitleColor }}
          >
            {t('title')}
          </h2>
          <div className="flex flex-nowrap items-center gap-2 md:flex-col md:items-stretch md:gap-1">
            <div className="flex flex-nowrap items-center gap-2 flex-1 md:flex-col md:items-stretch md:gap-1 md:w-full">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap"
                    style={{
                      color: isActive ? menuActiveText : menuText,
                      backgroundColor: isActive ? menuActiveBg : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = menuHoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm w-auto md:w-full md:mt-4 transition-colors"
              style={{
                color: logoutColor,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = logoutHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={18} />
              {t('logout')}
            </button>
          </div>
        </aside>
        <main
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto"
          style={{
            backgroundColor: contentBg,
            color: contentText,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}