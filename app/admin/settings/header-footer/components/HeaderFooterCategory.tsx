'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import HeaderFooterEntry from './HeaderFooterEntry';

interface Entry {
  locale: string;
  config: any; // HeaderConfig | FooterConfig | null
}

interface HeaderFooterCategoryProps {
  title: string;
  type: 'header' | 'footer';
  entries: Entry[];
  availableLocales: string[];
  onRefresh: () => void;
  onInit: (locale: string) => Promise<void>;
}

export default function HeaderFooterCategory({
  title,
  type,
  entries,
  availableLocales,
  onRefresh,
  onInit,
}: HeaderFooterCategoryProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => setCollapsed(!collapsed);

  const hasData = entries.some((entry) => entry.config !== null);

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
              {entries.map((entry) => (
                <HeaderFooterEntry
                  key={entry.locale}
                  type={type}
                  locale={entry.locale}
                  config={entry.config}
                  availableLocales={availableLocales}
                  onRefresh={onRefresh}
                  onInit={onInit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}