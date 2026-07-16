// components/litechat/QuickRepliesPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, X as XIcon } from 'lucide-react';

interface QuickReply {
  id: string;
  title: string;
  content: string;
  created_by: string;
  is_owner: boolean;
  created_at: string;
}

interface QuickRepliesPanelProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

export default function QuickRepliesPanel({ onSelect, onClose }: QuickRepliesPanelProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // 新增状态
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // 加载常用语列表
  const fetchReplies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/litechat/quick-replies');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '加载失败');
      }
      const data = await res.json();
      setReplies(data);
    } catch (err: any) {
      console.error('加载常用语失败:', err);
      setError(err.message || '加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, []);

  // 创建常用语
  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    try {
      setError(null);
      const res = await fetch('/api/admin/litechat/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }
      await fetchReplies();
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
    } catch (err: any) {
      console.error('创建失败:', err);
      setError(err.message || '创建失败');
    }
  };

  // 更新常用语
  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    try {
      setError(null);
      const res = await fetch(`/api/admin/litechat/quick-replies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '更新失败');
      }
      await fetchReplies();
      setEditingId(null);
      setEditTitle('');
      setEditContent('');
    } catch (err: any) {
      console.error('更新失败:', err);
      setError(err.message || '更新失败');
    }
  };

  // 删除常用语
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该常用语吗？')) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/litechat/quick-replies/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }
      await fetchReplies();
    } catch (err: any) {
      console.error('删除失败:', err);
      setError(err.message || '删除失败');
    }
  };

  // 开始编辑
  const startEdit = (reply: QuickReply) => {
    setEditingId(reply.id);
    setEditTitle(reply.title);
    setEditContent(reply.content);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  // 取消新增
  const cancelAdd = () => {
    setIsAdding(false);
    setNewTitle('');
    setNewContent('');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[550px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">常用回复语</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            aria-label="关闭"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              <XIcon size={14} />
            </button>
          </div>
        )}

        {/* 列表区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : replies.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>暂无常用语</p>
              <p className="text-sm mt-1">点击下方"添加常用语"创建</p>
            </div>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className={`group border rounded-lg p-3 transition ${
                  editingId === reply.id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {editingId === reply.id ? (
                  // 编辑模式
                  <div>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="标题"
                      className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="内容"
                      rows={2}
                      className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleUpdate(reply.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center gap-1"
                      >
                        <Check size={14} /> 保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  // 查看模式
                  <div className="flex items-start gap-2">
                    {/* 可点击区域：点击选择常用语 */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSelect(reply.content)}
                    >
                      <div className="font-medium text-sm text-gray-800">{reply.title}</div>
                      <div className="text-sm text-gray-500 truncate">{reply.content}</div>
                    </div>
                    {/* 操作按钮：仅创建者可见 */}
                    {reply.is_owner && (
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => startEdit(reply)}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="编辑"
                        >
                          <Edit2 size={14} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(reply.id)}
                          className="p-1 hover:bg-red-100 rounded transition"
                          title="删除"
                        >
                          <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    )}
                    {!reply.is_owner && (
                      <div className="flex-shrink-0 text-xs text-gray-400 pt-0.5">
                        来自 {reply.created_by_name || '其他管理员'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 底部：添加区域 */}
        <div className="border-t border-gray-200 p-4">
          {isAdding ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="标题（如：问候语）"
                className="w-full border rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="回复内容"
                rows={2}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreate}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Check size={14} /> 添加
                </button>
                <button
                  onClick={cancelAdd}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
            >
              <Plus size={16} /> 添加常用语
            </button>
          )}
        </div>
      </div>
    </div>
  );
}