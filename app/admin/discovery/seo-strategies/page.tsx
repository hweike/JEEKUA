'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Settings,
  Globe,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// 类型定义
type FieldConfig = {
  enabled: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  promptTemplate: string;
};

type Strategy = {
  pageType: string;
  label: string;
  fields: {
    seo_title: FieldConfig;
    seo_description: FieldConfig;
    seo_keywords: FieldConfig;
  };
  useGlobalContext: boolean;
};

type BasicData = {
  site_name: string;
  brand_name: string;
  site_url: string;
  default_locale: string;
  supported_locales: string[];
  target_audience: string;
  core_values: string[];
};

const PAGE_TYPES_LIST = [
  { key: 'home', label: '首页' },
  { key: 'productLine', label: '产品线落地页' },
  { key: 'productCollection', label: '产品合集' },
  { key: 'product', label: '产品' },
  { key: 'page', label: '页面' },
  { key: 'blog', label: '博客落地页' },
  { key: 'blogCategory', label: '博客合集' },
  { key: 'blogPost', label: '博客文章' },
  { key: 'docLibrary', label: '文档库' },
  { key: 'doc', label: '文档' },
  { key: 'videoCategory', label: '视频合集' },
  { key: 'video', label: '视频' },
  { key: 'inquiry', label: '询盘' },
  { key: 'policy', label: '政策' },
];

export default function SEOStrategiesPage() {
  const [activeTab, setActiveTab] = useState<'basic' | string>('basic');
  const [basicData, setBasicData] = useState<BasicData | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载全局数据
  const loadBasicData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/discovery/seo-strategies?basic=true');
      const json = await res.json();
      if (json.success) setBasicData(json.data);
    } catch (error) {
      console.error('Failed to load basic data', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载指定类型的策略
  const loadStrategy = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discovery/seo-strategies?type=${type}`);
      const json = await res.json();
      if (json.success) setCurrentStrategy(json.data);
    } catch (error) {
      console.error('Failed to load strategy', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存全局数据
  const saveBasicData = async () => {
    if (!basicData) return;
    setSaving(true);
    try {
      const res = await fetch('/api/discovery/seo-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basic: true, data: basicData }),
      });
      const json = await res.json();
      if (json.success) alert('全局基础数据保存成功');
      else alert('保存失败');
    } catch (error) {
      console.error(error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 保存策略
  const saveStrategy = async () => {
    if (!currentStrategy) return;
    setSaving(true);
    try {
      const res = await fetch('/api/discovery/seo-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: currentStrategy.pageType, data: currentStrategy }),
      });
      const json = await res.json();
      if (json.success) alert('策略保存成功');
      else alert('保存失败');
    } catch (error) {
      console.error(error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'basic') {
      loadStrategy(activeTab);
    } else {
      loadBasicData();
    }
  }, [activeTab]);

  const updateFieldConfig = (
    field: 'seo_title' | 'seo_description' | 'seo_keywords',
    updates: Partial<FieldConfig>
  ) => {
    if (!currentStrategy) return;
    setCurrentStrategy({
      ...currentStrategy,
      fields: {
        ...currentStrategy.fields,
        [field]: { ...currentStrategy.fields[field], ...updates },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8 text-blue-600" />
            SEO 策略配置
          </h1>
          <p className="text-gray-600 mt-2">管理全局基础数据和每种页面类型的 SEO 生成规则</p>
        </div>

        {/* Tab 切换 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="flex flex-wrap border-b border-gray-200">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Globe className="w-4 h-4" />
              全局基础数据
            </button>
            {PAGE_TYPES_LIST.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="p-6">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            )}

            {/* 全局基础数据表单 */}
            {activeTab === 'basic' && basicData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      网站名称 (site_name)
                    </label>
                    <input
                      type="text"
                      value={basicData.site_name}
                      onChange={(e) => setBasicData({ ...basicData, site_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      品牌名称 (brand_name)
                    </label>
                    <input
                      type="text"
                      value={basicData.brand_name}
                      onChange={(e) => setBasicData({ ...basicData, brand_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      网站 URL
                    </label>
                    <input
                      type="text"
                      value={basicData.site_url}
                      onChange={(e) => setBasicData({ ...basicData, site_url: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      默认语言
                    </label>
                    <input
                      type="text"
                      value={basicData.default_locale}
                      onChange={(e) => setBasicData({ ...basicData, default_locale: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      支持的语言 (英文逗号分隔)
                    </label>
                    <input
                      type="text"
                      value={basicData.supported_locales.join(',')}
                      onChange={(e) =>
                        setBasicData({
                          ...basicData,
                          supported_locales: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">示例: en,zh,es</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      目标受众
                    </label>
                    <textarea
                      value={basicData.target_audience}
                      onChange={(e) => setBasicData({ ...basicData, target_audience: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      核心价值观 (英文逗号分隔)
                    </label>
                    <input
                      type="text"
                      value={basicData.core_values.join(',')}
                      onChange={(e) =>
                        setBasicData({
                          ...basicData,
                          core_values: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveBasicData}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存全局配置'}
                  </button>
                </div>
              </div>
            )}

            {/* 页面类型策略配置 */}
            {activeTab !== 'basic' && currentStrategy && (
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    配置 {currentStrategy.label}
                  </h2>
                  <button
                    onClick={saveStrategy}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存策略'}
                  </button>
                </div>

                {/* seo_title 配置卡片 */}
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800">SEO 标题 (seo_title)</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={currentStrategy.fields.seo_title.enabled}
                          onChange={(e) => updateFieldConfig('seo_title', { enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">启用</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={currentStrategy.fields.seo_title.required || false}
                          onChange={(e) => updateFieldConfig('seo_title', { required: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">必填</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">最小长度</label>
                        <input
                          type="number"
                          value={currentStrategy.fields.seo_title.minLength || 0}
                          onChange={(e) =>
                            updateFieldConfig('seo_title', { minLength: parseInt(e.target.value) })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">最大长度</label>
                        <input
                          type="number"
                          value={currentStrategy.fields.seo_title.maxLength || 0}
                          onChange={(e) =>
                            updateFieldConfig('seo_title', { maxLength: parseInt(e.target.value) })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Prompt 模板</label>
                      <textarea
                        value={currentStrategy.fields.seo_title.promptTemplate}
                        onChange={(e) =>
                          updateFieldConfig('seo_title', { promptTemplate: e.target.value })
                        }
                        rows={6}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        可用变量：{'{title}'}, {'{site_name}'}, {'{seo_keywords}'}, {'{content_summary}'}, {'{minLength}'}, {'{maxLength}'} 等
                      </p>
                    </div>
                  </div>
                </div>

                {/* seo_description 配置卡片 */}
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800">SEO 描述 (seo_description)</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currentStrategy.fields.seo_description.enabled}
                        onChange={(e) => updateFieldConfig('seo_description', { enabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">启用</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">最小长度</label>
                        <input
                          type="number"
                          value={currentStrategy.fields.seo_description.minLength || 0}
                          onChange={(e) =>
                            updateFieldConfig('seo_description', { minLength: parseInt(e.target.value) })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">最大长度</label>
                        <input
                          type="number"
                          value={currentStrategy.fields.seo_description.maxLength || 0}
                          onChange={(e) =>
                            updateFieldConfig('seo_description', { maxLength: parseInt(e.target.value) })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Prompt 模板</label>
                      <textarea
                        value={currentStrategy.fields.seo_description.promptTemplate}
                        onChange={(e) =>
                          updateFieldConfig('seo_description', { promptTemplate: e.target.value })
                        }
                        rows={6}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        可用变量：{'{title}'}, {'{site_name}'}, {'{seo_keywords}'}, {'{content_summary}'}, {'{minLength}'}, {'{maxLength}'} 等
                      </p>
                    </div>
                  </div>
                </div>

                {/* seo_keywords 配置卡片 */}
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800">SEO 关键词 (seo_keywords)</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currentStrategy.fields.seo_keywords.enabled}
                        onChange={(e) => updateFieldConfig('seo_keywords', { enabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">启用</span>
                    </label>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Prompt 模板</label>
                      <textarea
                        value={currentStrategy.fields.seo_keywords.promptTemplate}
                        onChange={(e) =>
                          updateFieldConfig('seo_keywords', { promptTemplate: e.target.value })
                        }
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        可用变量：{'{title}'}, {'{site_name}'}, {'{content_summary}'} 等
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentStrategy.useGlobalContext}
                      onChange={(e) =>
                        setCurrentStrategy({ ...currentStrategy, useGlobalContext: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">使用全局上下文（将基础数据注入 Prompt）</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}