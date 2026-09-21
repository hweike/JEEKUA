'use client';

import Link from 'next/link';
import { Edit, Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import CopyHeaderDialog from './CopyHeaderDialog';
import { LANGUAGES } from '@/lib/languages/config';
import Toast from '@/components/common/Toast';

interface HeaderFooterEntryProps {
  type: 'header' | 'footer';
  locale: string;
  config: any;
  availableLocales: string[];
  onRefresh: () => void;
  onInit: (locale: string) => Promise<void>;
  onAiTranslate?: (locale: string, type: 'header' | 'footer') => void;
}

/**
 * 获取语言显示名称：统一为 "XX站" 格式
 */
function getLocaleDisplay(locale: string): string {
  const lang = LANGUAGES.find(l => l.code === locale);
  const name = lang ? lang.zhName : locale.toUpperCase();
  return `${name}站`;
}

export default function HeaderFooterEntry({
  type,
  locale,
  config,
  availableLocales,
  onRefresh,
  onInit,
  onAiTranslate,
}: HeaderFooterEntryProps) {
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showCopy = locale === 'en'; // 复制功能仅限英语源
  const isZhOrEn = locale === 'zh' || locale === 'en';
  const showInit = isZhOrEn;
  const showAiTranslate = isZhOrEn && onAiTranslate;

  const handleInit = async () => {
    setInitLoading(true);
    await onInit(locale);
    setInitLoading(false);
  };

  const editPath = `/admin/settings/header-footer/${type}/${locale}`;

  const handleCopySuccess = (message: string) => {
    setToast({ message, type: 'success' });
    onRefresh();
  };

  const handleCopyError = (message: string) => {
    setToast({ message, type: 'error' });
  };

  const displayName = getLocaleDisplay(locale);

  // 无配置：灰色、不加粗
  if (!config) {
    return (
      <>
        <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 border border-dashed border-gray-300 rounded">
          <div>
            <span className="font-medium text-gray-400">{displayName}</span>
            <span className="ml-3 text-sm text-gray-400">（未配置）</span>
          </div>
          <div className="flex items-center gap-2">
            {showInit && (
              <button
                onClick={handleInit}
                disabled={initLoading}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {initLoading ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    初始化
                  </>
                )}
              </button>
            )}
            {showAiTranslate && (
              <button
                onClick={() => onAiTranslate(locale, type)}
                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                title="AI 翻译此配置"
              >
                🤖 AI翻译
              </button>
            )}
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // 有配置：加粗
  return (
    <>
      <div className="flex justify-between items-center py-2 px-3 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="font-bold text-gray-700 w-auto flex-shrink-0">
            {displayName}
          </span>
          <span className="text-gray-800 truncate">已配置</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href={editPath}
            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
            title={`编辑${type === 'header' ? '页头' : '页脚'}`}
          >
            <Edit className="w-4 h-4" />
          </Link>
          {showCopy && (
            <button
              onClick={() => setShowCopyDialog(true)}
              className="p-1.5 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50 transition"
              title={`复制此${type === 'header' ? '页头' : '页脚'}到其他语言`}
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {showInit && (
            <button
              onClick={handleInit}
              disabled={initLoading}
              className="p-1.5 text-gray-500 hover:text-orange-600 rounded-full hover:bg-orange-50 transition"
              title="初始化（恢复默认）"
            >
              {initLoading ? (
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          )}
          {showAiTranslate && (
            <button
              onClick={() => onAiTranslate(locale, type)}
              className="p-1.5 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-50 transition"
              title="AI 翻译此配置"
            >
              🤖
            </button>
          )}
        </div>
      </div>

      {showCopyDialog && (
        <CopyHeaderDialog
          isOpen={showCopyDialog}
          onClose={() => setShowCopyDialog(false)}
          type={type}
          sourceLocale={locale}
          availableLocales={availableLocales}
          onRefresh={onRefresh}
          onSuccess={handleCopySuccess}
          onError={handleCopyError}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}