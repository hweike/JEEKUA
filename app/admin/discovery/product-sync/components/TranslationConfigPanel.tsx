'use client';
import { useState, useEffect } from 'react';
import { Save, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Toast from '@/components/Toast';

interface Config {
  fields: string[];
  promptTemplate: string;
}

export default function TranslationConfigPanel() {
  const [config, setConfig] = useState<Config>({ fields: [], promptTemplate: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/discovery/product-sync/translation-config');
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

  const addField = () => {
    const input = document.getElementById('newField') as HTMLInputElement;
    const val = input.value.trim();
    if (val && !config.fields.includes(val)) {
      setConfig(prev => ({ ...prev, fields: [...prev.fields, val] }));
      input.value = '';
    }
  };

  const removeField = (field: string) => {
    setConfig(prev => ({ ...prev, fields: prev.fields.filter(f => f !== field) }));
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/discovery/product-sync/translation-config', {
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

  if (loading) {
    return <div className="text-gray-500">加载配置中...</div>;
  }

  return (
    <div>
      {toast && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="bg-white rounded-lg border p-4 shadow-sm space-y-6">
        {/* 说明区域 */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">配置说明</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li><strong>可翻译字段</strong>：只有这些字段会被翻译。建议保留默认字段列表，除非有特殊需求。</li>
                <li><strong>翻译提示词模板</strong>：可以修改提示词内容，但请务必保留以下核心要求（已默认包含）：
                  <ul className="list-disc list-inside ml-4">
                    <li>保留 HTML 标签结构（对 description 和 spec_text 字段）</li>
                    <li>不翻译数字、单位、型号代码、标准编号</li>
                    <li>专业术语使用行业标准译法</li>
                  </ul>
                </li>
                <li>占位符 <code className="bg-blue-100 px-1 rounded">{'{sourceLocale}'}</code>、<code className="bg-blue-100 px-1 rounded">{'{targetLocale}'}</code>、<code className="bg-blue-100 px-1 rounded">{'{fields}'}</code>、<code className="bg-blue-100 px-1 rounded">{'{data}'}</code> 会被系统自动替换。</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 字段编辑 */}
        <div>
          <label className="block text-sm font-medium mb-1">可翻译字段</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {config.fields.length === 0 && <span className="text-sm text-gray-400 italic">暂无字段</span>}
            {config.fields.map(f => (
              <span key={f} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm border border-blue-100">
                {f}
                <button onClick={() => removeField(f)} className="text-blue-300 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id="newField"
              type="text"
              placeholder="输入字段名，如 seo_title"
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && addField()}
            />
            <button onClick={addField} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
              添加
            </button>
          </div>
        </div>

        {/* 提示词模板 */}
        <div>
          <label className="block text-sm font-medium mb-1">翻译提示词模板</label>
          <p className="text-xs text-gray-500 mb-1">
            占位符：<code>{'{sourceLocale}'}</code>、<code>{'{targetLocale}'}</code>、<code>{'{fields}'}</code>、<code>{'{data}'}</code>
          </p>
          <textarea
            value={config.promptTemplate}
            onChange={e => setConfig(prev => ({ ...prev, promptTemplate: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono h-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            <strong>提示：</strong>除非您非常了解翻译规则，否则建议只调整语言风格或专业术语要求，保留核心约束（如 HTML 保护、不翻译数字/单位等）。
          </p>
        </div>
      </div>
    </div>
  );
}