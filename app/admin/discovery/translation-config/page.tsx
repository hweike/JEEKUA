// app/admin/discovery/translation-config/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FieldConfig {
  fields: string[];
  prompt?: string;
}
type Config = Record<string, FieldConfig>;

export default function TranslationConfigPage() {
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/discovery/translation-config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error(err);
      setToast({ message: '加载配置失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateTypeFields = (type: string, fields: string[]) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        fields,
      },
    }));
  };

  const updateTypePrompt = (type: string, prompt: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        prompt: prompt.trim() || undefined,
      },
    }));
  };

  const addNewType = () => {
    if (!newTypeName.trim()) return;
    if (config[newTypeName]) {
      setToast({ message: '类型已存在', type: 'error' });
      return;
    }
    setConfig(prev => ({
      ...prev,
      [newTypeName]: { fields: [], prompt: '' },
    }));
    setNewTypeName('');
  };

  const deleteType = (type: string) => {
    if (!confirm(`确定要删除类型 "${type}" 吗？`)) return;
    const newConfig = { ...config };
    delete newConfig[type];
    setConfig(newConfig);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/discovery/translation-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }
      setToast({ message: '配置保存成功', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const FieldEditor = ({ type, fields, prompt }: { type: string; fields: string[]; prompt?: string }) => {
    const [inputValue, setInputValue] = useState('');
    const addField = () => {
      if (inputValue.trim() && !fields.includes(inputValue.trim())) {
        updateTypeFields(type, [...fields, inputValue.trim()]);
        setInputValue('');
      }
    };
    const removeField = (field: string) => {
      updateTypeFields(type, fields.filter(f => f !== field));
    };
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">{type}</h3>
          <button
            onClick={() => deleteType(type)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="删除此类型"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">可翻译字段</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {fields.length === 0 && (
              <span className="text-sm text-gray-400 italic">暂无字段</span>
            )}
            {fields.map(field => (
              <span
                key={field}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm border border-blue-100"
              >
                {field}
                <button
                  onClick={() => removeField(field)}
                  className="text-blue-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addField()}
              placeholder="输入字段名，如 seo_title"
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addField}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              添加
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">翻译提示词</label>
          <textarea
            value={prompt || ''}
            onChange={(e) => updateTypePrompt(type, e.target.value)}
            placeholder="针对该类型的翻译指令，如：保持品牌名称不变，技术术语准确等"
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <p className="text-xs text-gray-400 mt-1">将作为 AI 翻译的系统指令，可指定风格、术语约束、保留内容等</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">加载配置中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">翻译字段配置</h1>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="新页面类型名称，如 faq"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && addNewType()}
          />
          <button
            onClick={addNewType}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加类型
          </button>
        </div>
      </div>

      {Object.entries(config).length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无配置，请添加类型</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(config).map(([type, { fields, prompt }]) => (
            <FieldEditor key={type} type={type} fields={fields} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  );
}