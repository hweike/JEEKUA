'use client';

import { useEffect, useState } from 'react';
import { Globe, X, Loader2 } from 'lucide-react';
import type { BasicSettings } from '@/lib/Basicsettings/settings';

interface SiteSettingsPreviewProps {
  onClose: () => void;
}

export function SiteSettingsPreview({ onClose }: SiteSettingsPreviewProps) {
  const [settings, setSettings] = useState<BasicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/discovery/seo/site-settings')
      .then(res => res.json())
      .then(json => setSettings(json.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            站点基本信息（只读）
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">加载中...</span>
            </div>
          ) : settings ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium text-gray-600">站点名称</div>
                <div>{settings.siteName || '-'}</div>
                <div className="font-medium text-gray-600">网站 URL</div>
                <div>{settings.websiteUrl || '-'}</div>
                <div className="font-medium text-gray-600">默认语言</div>
                <div>{settings.defaultLocale || '-'}</div>
                <div className="font-medium text-gray-600">目标受众</div>
                <div>{settings.targetAudience || '-'}</div>
                <div className="font-medium text-gray-600">公司名称</div>
                <div>{settings.companyName || '-'}</div>
                <div className="font-medium text-gray-600">国家</div>
                <div>{settings.country || '-'}</div>
                <div className="font-medium text-gray-600">品牌/核心价值观</div>
                <div>{settings.brand?.length ? settings.brand.join(', ') : '-'}</div>
              </div>
            </div>
          ) : (
            <div className="text-red-500 text-center py-4">加载失败，请刷新重试</div>
          )}
        </div>
        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}