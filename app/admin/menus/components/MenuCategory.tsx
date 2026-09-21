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
  onClear?: (locale: string, menuType: 'navigation' | 'footer') => void;
  onAiTranslate?: (locale: string, menuType: 'navigation' | 'footer' | 'custom_menus', menuId?: string) => void;
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
  onClear,
  onAiTranslate,
  initLoading,
  availableLocales,
  onRefresh,
}: MenuCategoryProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => setCollapsed(!collapsed);

  // 根据类型计算语言数量（只统计有数据的语言）
  const languageCount = type === 'custom'
    ? new Set(
        entries
          .filter((entry) => entry.menu)
          .map((entry) => entry.locale)
      ).size
    : entries.filter((entry) => entry.locale).length;

  const renderEntries = () => {
    if (type === 'custom') {
      // 按 locale 分组，只处理有 menu 的条目
      const grouped: Record<string, any[]> = {};
      
      for (const entry of entries) {
        if (entry.menu) {
          if (!grouped[entry.locale]) grouped[entry.locale] = [];
          grouped[entry.locale].push(entry.menu);
        }
      }

      const sortedLocales = Object.keys(grouped).sort();

      // 如果没有有数据的语言，显示提示
      if (sortedLocales.length === 0) {
        return <p className="text-gray-400 text-sm">暂无自定义菜单数据</p>;
      }

      return (
        <div className="space-y-3">
          {sortedLocales.map((locale) => {
            const menus = grouped[locale];
            const showAiTranslate = (locale === 'zh' || locale === 'en') && onAiTranslate;
            const lang = LANGUAGES.find(l => l.code === locale);
            const displayName = lang ? `${lang.zhName}站` : locale.toUpperCase();

            return (
              <div key={locale} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold text-gray-700">{displayName}</div>
                  {showAiTranslate && (
                    <button
                      onClick={() => onAiTranslate?.(locale, 'custom_menus')}
                      className="text-purple-600 hover:text-purple-800 text-xs px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-50 transition"
                    >
                      🤖 AI翻译
                    </button>
                  )}
                </div>
                <div className="space-y-2 pl-2">
                  {menus.map((menu) => (
                    <MenuEntry
                      key={menu.id}
                      locale={locale}
                      menu={menu}
                      type="custom"
                      onDelete={onDelete}
                      availableLocales={availableLocales}
                      onRefresh={onRefresh}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      // navigation 或 footer：每个 entry 是一个语言一个菜单
      return (
        <div className="space-y-3">
          {entries.map((entry) => {
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
                onDelete={onDelete}
                onClear={onClear}
                onAiTranslate={onAiTranslate}
                isLoading={isLoading}
                availableLocales={availableLocales}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {languageCount > 0 && (
            <span className="text-sm text-gray-400">({languageCount} 个语言)</span>
          )}
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
            renderEntries()
          )}
        </div>
      )}
    </div>
  );
}