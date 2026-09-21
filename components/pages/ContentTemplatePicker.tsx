// components/pages/ContentTemplatePicker.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, Lock, Trash2, Plus, Save, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

// ============================================================
// 类型
// ============================================================

interface ContentTemplate {
  id: string;
  name: string;
  content: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  locale: string;
  onSelect: (content: string) => void;
  onClose: () => void;
}

type ViewMode = 'list' | 'create';

// ============================================================
// 主组件
// ============================================================

export default function ContentTemplatePicker({ locale, onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [previewTemplate, setPreviewTemplate] = useState<ContentTemplate | null>(null);

  // ========== 加载模板列表 ==========
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pages/content-templates?locale=${encodeURIComponent(locale)}`);
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      } else {
        toast.error(data.error || '加载模板失败');
      }
    } catch (err) {
      console.error('[ContentTemplatePicker] 加载失败:', err);
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [locale]);

  // ========== 删除模板 ==========
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此模板吗？')) return;

    try {
      const res = await fetch(`/api/admin/pages/content-templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        toast.success('删除成功');
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (err) {
      console.error('[ContentTemplatePicker] 删除失败:', err);
      toast.error('删除失败');
    }
  };

  // ========== 创建模板 ==========
  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('请输入模板名称');
      return;
    }
    if (!newContent.trim()) {
      toast.error('请输入模板内容');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/pages/content-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          name: newName.trim(),
          content: newContent,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('模板已创建');
        setViewMode('list');
        setNewName('');
        setNewContent('');
        await loadTemplates();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (err) {
      console.error('[ContentTemplatePicker] 创建失败:', err);
      toast.error('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCreate = () => {
    if (newName || newContent) {
      if (!confirm('确定取消创建？已填写的内容将丢失')) return;
    }
    setViewMode('list');
    setNewName('');
    setNewContent('');
  };

  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  // ============================================================
  // 新建视图
  // ============================================================
  if (viewMode === 'create') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-semibold">新建内容模板</h2>
            <button onClick={handleCancelCreate} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板名称 *
              </label>
              <input
                type="text"
                placeholder="例如：产品介绍"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板内容 *
              </label>
              <RichTextEditor
                value={newContent}
                onChange={(val) => setNewContent(val)}
              />
            </div>
          </div>

          <div className="p-4 border-t flex justify-end gap-2">
            <button
              onClick={handleCancelCreate}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存模板
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 列表视图
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">选择内容模板</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              加载中...
            </div>
          ) : (
            <>
              {systemTemplates.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    系统模板
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {systemTemplates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        onSelect={() => onSelect(tpl.content)}
                        onPreview={() => setPreviewTemplate(tpl)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">我的模板</h3>
                  <button
                    onClick={() => setViewMode('create')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    新建模板
                  </button>
                </div>
                {userTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-lg">
                    暂无自定义模板，点击"新建模板"创建
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {userTemplates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        onSelect={() => onSelect(tpl.content)}
                        onPreview={() => setPreviewTemplate(tpl)}
                        onDelete={(e) => handleDelete(tpl.id, e)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>

      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onApply={() => {
            onSelect(previewTemplate.content);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// 模板卡片
// ============================================================

interface TemplateCardProps {
  template: ContentTemplate;
  onSelect: () => void;
  onPreview: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

function TemplateCard({ template, onSelect, onPreview, onDelete }: TemplateCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden hover:border-blue-500 hover:shadow-md cursor-pointer transition group">
      <div
        className="bg-gray-50 p-3 h-32 overflow-hidden relative"
        onClick={onPreview}
      >
        <div
          className="text-xs text-gray-700"
          dangerouslySetInnerHTML={{ __html: template.content }}
          style={{
            transform: 'scale(0.7)',
            transformOrigin: 'top left',
            width: '143%',
            height: '143%',
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white px-3 py-1 rounded shadow text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" />
            预览
          </span>
        </div>
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{template.name}</h4>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              使用
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 模板预览弹窗
// ============================================================

interface TemplatePreviewProps {
  template: ContentTemplate;
  onClose: () => void;
  onApply: () => void;
}

function TemplatePreview({ template, onClose, onApply }: TemplatePreviewProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: template.content }}
          />
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            关闭
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            使用此模板
          </button>
        </div>
      </div>
    </div>
  );
}