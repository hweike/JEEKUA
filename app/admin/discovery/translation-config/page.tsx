'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';

interface FieldConfig {
  fields: string[];
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
    setConfig(prev => ({ ...prev, [type]: { fields } }));
  };

  const addNewType = () => {
    if (!newTypeName.trim()) return;
    if (config[newTypeName]) {
      setToast({ message: '类型已存在', type: 'error' });
      return;
    }
    setConfig(prev => ({ ...prev, [newTypeName]: { fields: [] } }));
    setNewTypeName('');
  };

  const deleteType = (type: string) => {
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

  const FieldEditor = ({ type, fields }: { type: string; fields: string[] }) => {
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
      <div className="border rounded p-4 mb-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{type}</h3>
          <button onClick={() => deleteType(type)} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {fields.map(field => (
            <span key={field} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm">
              {field}
              <button onClick={() => removeField(field)} className="text-gray-500 hover:text-red-500">
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
            placeholder="添加字段，如 seo_title"
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <button onClick={addField} className="bg-blue-500 text-white px-2 py-1 rounded text-sm">添加</button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-6">加载配置中...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`mb-4 p-2 rounded ${toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="float-right">×</button>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">翻译字段配置</h1>
        <button onClick={saveConfig} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="新页面类型名称（如 faq）"
            className="border rounded px-3 py-2 flex-1"
          />
          <button onClick={addNewType} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Plus className="w-4 h-4" /> 添加类型
          </button>
        </div>
      </div>
      {Object.entries(config).map(([type, { fields }]) => (
        <FieldEditor key={type} type={type} fields={fields} />
      ))}
    </div>
  );
}