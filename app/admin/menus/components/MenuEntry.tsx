'use client';

import Link from 'next/link';
import { Edit, Trash2, RefreshCw, Copy } from 'lucide-react';
import { useState } from 'react';
import CopyMenuDialog from './CopyMenuDialog';
import { LANGUAGES } from '@/lib/languages/config';

interface MenuEntryProps {
  locale: string;
  menu: any;
  type: 'navigation' | 'footer' | 'custom';
  onInit?: (locale: string, menuType: 'navigation' | 'footer') => void;
  onDelete?: (locale: string, menuId: string) => void;
  isLoading?: boolean;
  availableLocales: string[];
  onRefresh: () => void;
}

function getLocaleDisplay(locale: string): string {
  const lang = LANGUAGES.find(l => l.code === locale);
  return lang ? `${lang.zhName}(${locale})` : locale.toUpperCase();
}

export default function MenuEntry({
  locale,
  menu,
  type,
  onInit,
  onDelete,
  isLoading,
  availableLocales,
  onRefresh,
}: MenuEntryProps) {
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  const getEditUrl = () => {
    if (!menu) return '#';
    if (type === 'custom') {
      return `/admin/menus/${locale}/custom_menus/${menu.id}/edit`;
    }
    return `/admin/menus/${locale}/${menu.id}/edit`;
  };

  const showCopy = locale === 'en' && (type === 'navigation' || type === 'footer');

  // --- 无菜单时的渲染（虚线、淡背景） ---
  if (!menu) {
    return (
      <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 border border-dashed border-gray-300 rounded">
        <div>
          <span className="font-medium text-gray-400">{getLocaleDisplay(locale)}</span>
          <span className="ml-3 text-sm text-gray-400">（未初始化）</span>
        </div>
        <div className="flex items-center gap-2">
          {onInit && (type === 'navigation' || type === 'footer') && (
            <button
              onClick={() => onInit(locale, type)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  初始化
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- 有菜单时的渲染（实线、灰色背景） ---
  return (
    <>
      <div className="flex justify-between items-center py-2 px-3 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* 自定义菜单不显示语言前缀，默认菜单显示语言前缀 */}
          {type !== 'custom' && (
            <span className="font-medium text-gray-700 w-auto flex-shrink-0">
              {getLocaleDisplay(locale)}
            </span>
          )}
          <span className="text-gray-800 truncate">{menu.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            ({menu.items?.length || 0} 项)
          </span>
          {/* 移除“默认”标签 */}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href={getEditUrl()}
            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
            title="编辑菜单项"
          >
            <Edit className="w-4 h-4" />
          </Link>
          {type === 'custom' && onDelete && (
            <button
              onClick={() => onDelete(locale, menu.id)}
              className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition"
              title="删除菜单"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onInit && (type === 'navigation' || type === 'footer') && (
            <button
              onClick={() => onInit(locale, type)}
              disabled={isLoading}
              className="p-1.5 text-gray-500 hover:text-orange-600 rounded-full hover:bg-orange-50 transition"
              title="初始化菜单（恢复预设）"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          )}
          {showCopy && (
            <button
              onClick={() => setShowCopyDialog(true)}
              className="p-1.5 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50 transition"
              title="复制此菜单到其他语言"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showCopyDialog && (
        <CopyMenuDialog
          isOpen={showCopyDialog}
          onClose={() => setShowCopyDialog(false)}
          sourceLocale={locale}
          menuType={type}
          menuId={menu.id}
          availableLocales={availableLocales}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}