'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit, X } from 'lucide-react';

export interface AttributePreset {
  name: string;
  rule: string;
}

export interface AttributeTemplate {
  id: string;
  name: string;
  attributes: AttributePreset[];
}

interface Props {
  templates: AttributeTemplate[];
  onUpdate: (templates: AttributeTemplate[]) => void;
}

function generateId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export default function AttributeTemplates({ templates, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addTemplate = () => {
    const newTemplate: AttributeTemplate = {
      id: generateId(),
      name: '',
      attributes: [],
    };
    onUpdate([...templates, newTemplate]);
    setEditingId(newTemplate.id);
  };

  const deleteTemplate = (id: string) => {
    if (confirm('确定删除此模板吗？')) {
      onUpdate(templates.filter(t => t.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const updateTemplateName = (id: string, name: string) => {
    onUpdate(templates.map(t => t.id === id ? { ...t, name } : t));
  };

  const addAttribute = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template && template.attributes.length >= 10) {
      alert('最多支持10个属性');
      return;
    }
    onUpdate(templates.map(t =>
      t.id === id ? { ...t, attributes: [...t.attributes, { name: '', rule: '请输入{属性名}' }] } : t
    ));
  };

  const removeAttribute = (id: string, attrIndex: number) => {
    onUpdate(templates.map(t =>
      t.id === id ? { ...t, attributes: t.attributes.filter((_, i) => i !== attrIndex) } : t
    ));
  };

  const updateAttribute = (id: string, attrIndex: number, field: keyof AttributePreset, value: string) => {
    onUpdate(templates.map(t => {
      if (t.id !== id) return t;
      const newAttrs = [...t.attributes];
      newAttrs[attrIndex] = { ...newAttrs[attrIndex], [field]: value };
      return { ...t, attributes: newAttrs };
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">自定义属性模板</h2>
        <button
          onClick={addTemplate}
          className="bg-blue-600 text-white px-3 py-1.5 rounded inline-flex items-center gap-1 text-sm"
        >
          <Plus size={14} /> 添加模板
        </button>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500 border rounded-lg">
          暂无自定义属性模板，点击“添加模板”创建。
        </div>
      )}

      <div className="space-y-4">
        {templates.map(template => {
          const isEditing = editingId === template.id;
          return (
            <div key={template.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => updateTemplateName(template.id, e.target.value)}
                    className="border rounded p-1 text-lg font-medium w-64"
                    placeholder="模板名称"
                    autoFocus
                  />
                ) : (
                  <span className="text-lg font-medium">{template.name || '未命名模板'}</span>
                )}
                <div className="flex gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-500 hover:text-gray-700"
                      title="完成编辑"
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingId(template.id)}
                      className="text-blue-500 hover:text-blue-700"
                      title="编辑模板"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="text-red-500 hover:text-red-700"
                    title="删除模板"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
                  {template.attributes.map((attr, idx) => {
                    const placeholderRule = attr.name ? `请输入${attr.name}` : '请输入{属性名}';
                    return (
                      <div key={idx} className="flex gap-2 items-start">
                        <input
                          type="text"
                          placeholder="属性名（如材质）"
                          value={attr.name}
                          onChange={(e) => updateAttribute(template.id, idx, 'name', e.target.value)}
                          className="border rounded p-1 w-1/3"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder={placeholderRule}
                            value={attr.rule}
                            onChange={(e) => updateAttribute(template.id, idx, 'rule', e.target.value)}
                            className="border rounded p-1 w-full"
                          />
                          <div className="text-xs text-gray-400 mt-1">
                            属性填写时提示信息，可根据需要设置
                          </div>
                        </div>
                        <button
                          onClick={() => removeAttribute(template.id, idx)}
                          className="text-red-500 mt-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {template.attributes.length < 10 && (
                    <button
                      onClick={() => addAttribute(template.id)}
                      className="text-blue-600 text-sm mt-1 inline-flex items-center gap-1"
                    >
                      <Plus size={14} /> 添加属性
                    </button>
                  )}
                  {template.attributes.length >= 10 && (
                    <p className="text-xs text-gray-400">已达上限10个属性</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}