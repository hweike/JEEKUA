// app/admin/discovery/seo/strategies/page.tsx

'use client';

import { useState } from 'react';
import { Settings, Loader2, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { StrategyList } from './components/StrategyList';
import { StrategyEditor } from './components/StrategyEditor';
import { SiteSettingsPreview } from './components/SiteSettingsPreview';
import { useStrategies } from './hooks/useStrategies';

export default function SEOStrategiesPage() {
  const [showSitePreview, setShowSitePreview] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    strategies,
    currentStrategy,
    loading,
    saving,
    error,
    selectedType,
    selectType,
    updateStrategy,
    updateField,
    saveCurrentStrategy,
  } = useStrategies('home');

  const handleSave = async () => {
    try {
      await saveCurrentStrategy();
      setSuccess('策略保存成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // 错误已在 hook 中处理
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-8 h-8 text-blue-600" />
              SEO 策略配置
            </h1>
            <p className="text-gray-600 mt-2">
              管理每种页面类型的 SEO 生成规则和 AI 提示词模板
            </p>
          </div>
          <button
            onClick={() => setShowSitePreview(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Globe className="w-4 h-4" />
            站点信息
          </button>
        </div>

        {/* 消息 */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* 主体 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <StrategyList
              selectedType={selectedType}
              strategies={strategies}
              onSelect={selectType}
            />
          </div>

          <div className="flex-1 min-w-0">
            {currentStrategy && (
              <StrategyEditor
                strategy={currentStrategy}
                saving={saving}
                onUpdate={updateStrategy}
                onUpdateField={updateField}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </div>

      {/* 站点信息预览（只读） */}
      {showSitePreview && (
        <SiteSettingsPreview onClose={() => setShowSitePreview(false)} />
      )}
    </div>
  );
}