// app/[locale]/account/layout.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Bell, LogOut, Mail } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const menuItems = [
    { name: 'Profile', href: `/${locale}/account`, icon: User },
    { name: 'Inquiry', href: `/${locale}/account/inquiry`, icon: Mail },
    // { name: 'Marketing Preferences', href: `/${locale}/account/preferences`, icon: Bell },
  ];

  const logout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    router.push(`/${locale}/login`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col md:flex-row">
        <aside className="w-full md:w-64 p-4 sm:p-6 space-y-4 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">My Account</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="pt-4">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 w-full"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}