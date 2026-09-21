// app/admin/payment/orders/create/components/OtherInfo.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, FileText, Loader2 } from 'lucide-react';

// ============================================================
// 模板类型
// ============================================================
interface LegalTemplate {
  id: string;
  name: string;
  content: string;
  is_default?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

interface OtherInfoProps {
  legalTerms: string;
  onLegalTermsChange: (value: string) => void;
  postscript: string;
  onPostscriptChange: (value: string) => void;
  readOnly?: boolean;
}

export default function OtherInfo({
  legalTerms,
  onLegalTermsChange,
  postscript,
  onPostscriptChange,
  readOnly = false,
}: OtherInfoProps) {
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LegalTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // 加载模板列表
  // ============================================================
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payment/legal-templates');
      const result = await res.json();
      if (result.success) {
        setTemplates(result.data || []);
      } else {
        setError(result.error || '加载模板失败');
      }
    } catch (err) {
      setError('加载模板失败，请重试');
      console.error('加载模板失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 模态框打开时加载模板
  useEffect(() => {
    if (showTemplateModal) {
      loadTemplates();
    }
  }, [showTemplateModal]);

  // ============================================================
  // 选择模板
  // ============================================================
  const selectTemplate = (template: LegalTemplate) => {
    onLegalTermsChange(template.content);
    setShowTemplateModal(false);
  };

  // ============================================================
  // 打开新建模板
  // ============================================================
  const openNewTemplate = () => {
    setIsEditing(true);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateContent('');
    setError(null);
  };

  // ============================================================
  // 打开编辑模板
  // ============================================================
  const openEditTemplate = (template: LegalTemplate) => {
    setIsEditing(true);
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setError(null);
  };

  // ============================================================
  // 保存模板（创建或更新）
  // ============================================================
  const saveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      setError('请填写模板名称和内容');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingTemplate
        ? `/api/admin/payment/legal-templates?id=${editingTemplate.id}`
        : '/api/admin/payment/legal-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          content: templateContent.trim(),
        }),
      });

      const result = await res.json();

      if (result.success) {
        await loadTemplates();
        setIsEditing(false);
        setEditingTemplate(null);
        setTemplateName('');
        setTemplateContent('');
      } else {
        setError(result.error || '保存失败');
      }
    } catch (err) {
      setError('保存失败，请重试');
      console.error('保存模板失败:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 删除模板
  // ============================================================
  const deleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/payment/legal-templates?id=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        await loadTemplates();
      } else {
        setError(result.error || '删除失败');
      }
    } catch (err) {
      setError('删除失败，请重试');
      console.error('删除模板失败:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 取消编辑
  // ============================================================
  const cancelEdit = () => {
    setIsEditing(false);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateContent('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 法律条款 */}
      {/* ============================================================ */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">法律条款</label>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <FileText size={14} /> 选择模板
            </button>
          )}
        </div>
        <textarea
          value={legalTerms}
          onChange={(e) => onLegalTermsChange(e.target.value)}
          rows={4}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入法律条款..."
          disabled={readOnly}
        />
      </div>

      {/* ============================================================ */}
      {/* 附言 */}
      {/* ============================================================ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">附言</label>
        <textarea
          value={postscript}
          onChange={(e) => onPostscriptChange(e.target.value)}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入附言..."
          disabled={readOnly}
        />
      </div>

      {/* ============================================================ */}
      {/* 模板选择模态窗口 */}
      {/* ============================================================ */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">📄 选择法律条款模板</h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setIsEditing(false);
                  setEditingTemplate(null);
                  setError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* 新建模板按钮 */}
              {!isEditing && (
                <button
                  type="button"
                  onClick={openNewTemplate}
                  className="mb-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={16} /> 新建模板
                </button>
              )}

              {/* 加载状态 */}
              {loading && !isEditing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-500">加载模板...</span>
                </div>
              )}

              {/* 编辑/新建模板表单 */}
              {isEditing && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">
                      {editingTemplate ? '编辑模板' : '新建模板'}
                    </h4>
                    {/* ✅ 去掉 X 按钮，只保留取消和保存 */}
                  </div>
                  <div className="space-y-3">
                    <div>
                      {/* ✅ 去掉"模板名称"标签，只显示输入框 */}
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="模板名称"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      {/* ✅ 去掉"模板内容"标签，只显示输入框，高度增大 */}
                      <textarea
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        rows={6}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="模板内容"
                        disabled={saving}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                        disabled={saving}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={saveTemplate}
                        disabled={saving}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {editingTemplate ? '更新' : '保存'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 模板列表 */}
              {!isEditing && !loading && (
                <div className="space-y-3">
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-3 hover:border-blue-300 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{template.name}</span>
                              {template.is_default && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                  默认
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {template.content}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                            <button
                              type="button"
                              onClick={() => openEditTemplate(template)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                              title="编辑"
                              disabled={saving}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTemplate(template.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                              title="删除"
                              disabled={saving}
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => selectTemplate(template)}
                              className="ml-1 px-3 py-0.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                              disabled={saving}
                            >
                              使用
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>暂无模板</p>
                      <p className="text-sm mt-1">点击"新建模板"创建</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="px-6 py-4 border-t flex justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setIsEditing(false);
                  setEditingTemplate(null);
                  setError(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}