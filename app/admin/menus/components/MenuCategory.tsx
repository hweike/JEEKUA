'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import MenuEntry from './MenuEntry';
import { LANGUAGES } from '@/lib/languages/config';

interface MenuEntryData {
  locale: string;
  menu: any;
  isDefault: boolean;
  menus?: any[];
}

interface MenuCategoryProps {
  title: string;
  entries: MenuEntryData[];
  type: 'navigation' | 'footer' | 'custom';
  onInit?: (locale: string, menuType: 'navigation' | 'footer') => void;
  onDelete?: (locale: string, menuId: string) => void;
  initLoading?: { type: string; locale: string; loading: boolean } | null;
  availableLocales: string[];
  onRefresh: () => void;
}

function getLocaleDisplay(locale: string): string {
  const lang = LANGUAGES.find(l => l.code === locale);
  return lang ? `${lang.zhName}(${locale})` : locale.toUpperCase();
}

export default function MenuCategory({
  title,
  entries,
  type,
  onInit,
  onDelete,
  initLoading,
  availableLocales,
  onRefresh,
}: MenuCategoryProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => setCollapsed(!collapsed);

  const hasData = entries.some((entry) => {
    if (type === 'custom') {
      return entry.menus && entry.menus.length > 0;
    }
    return entry.menu !== null;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <span className="text-sm text-gray-400">
            ({entries.filter(e => e.locale).length} 个语言)
          </span>
          {!hasData && <span className="text-xs text-gray-400 ml-2">(暂无数据)</span>}
        </div>
        <button className="p-1 rounded-full hover:bg-gray-200">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 border-t border-gray-100">
          {entries.length === 0 ? (
            <p className="text-gray-400 text-sm">未找到任何语言配置</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                if (type === 'custom') {
                  return entry.menus && entry.menus.length > 0 ? (
                    <div key={entry.locale} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                      <div className="text-sm font-medium text-gray-600 mb-1">
                        {getLocaleDisplay(entry.locale)}
                      </div>
                      <div className="space-y-2 pl-2">
                        {entry.menus.map((menu) => (
                          <MenuEntry
                            key={menu.id}
                            locale={entry.locale}
                            menu={menu}
                            type="custom"
                            onDelete={onDelete}
                            availableLocales={availableLocales}
                            onRefresh={onRefresh}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div key={entry.locale} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                      <div className="text-sm font-medium text-gray-600 mb-1">
                        {getLocaleDisplay(entry.locale)}
                      </div>
                      <p className="text-xs text-gray-400 pl-2">暂无自定义菜单</p>
                    </div>
                  );
                } else {
                  const menu = entry.menu;
                  const isLoading =
                    initLoading?.type === type &&
                    initLoading.locale === entry.locale &&
                    initLoading.loading;
                  return (
                    <MenuEntry
                      key={entry.locale}
                      locale={entry.locale}
                      menu={menu}
                      type={type}
                      onInit={onInit}
                      isLoading={isLoading}
                      availableLocales={availableLocales}
                      onRefresh={onRefresh}
                    />
                  );
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}