'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Mail,
  Inbox,
  Calendar,
  FileText,
  Send,
  Plus,
  ArrowLeft,
} from 'lucide-react';

// ---------- 类型定义 ----------
interface Inquiry {
  id: number;
  inquiry_number: string;
  subject: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  product_id: string | null;
  created_at: string;
  updated_at: string;
  customer_id: string;
}

interface Reply {
  id: number;
  sender_type: 'admin' | 'user' | 'system';
  sender_email: string;
  sender_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

// ---------- 辅助函数 ----------
const getToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? match[1] : null;
};

// 将文本中的 URL 转为可点击链接（新窗口打开）
function linkifyText(text: string) {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 hover:text-blue-800"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// ---------- 主页面 ----------
export default function UserInquiryPage() {
  // 状态
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState('');

  // 视图模式
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // 创建表单状态
  const [createMessage, setCreateMessage] = useState('');
  const [createProductId, setCreateProductId] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // ---------- 获取所有询盘 ----------
  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/account/inquiries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('获取询盘列表失败');
      const data = await res.json();
      setInquiries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // ---------- 获取单条询盘详情 ----------
  const fetchInquiryDetails = useCallback(async (id: number) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/account/inquiries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('获取详情失败');
      const data = await res.json();
      setSelectedInquiry(data.inquiry);
      setReplies(data.replies || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // ---------- 点击列表项 ----------
  const handleSelect = (inquiry: Inquiry) => {
    if (selectedInquiry?.id === inquiry.id) return;
    setViewMode('list');
    fetchInquiryDetails(inquiry.id);
  };

  // ---------- 提交回复 ----------
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedInquiry) return;

    setSubmittingReply(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/account/inquiries/${selectedInquiry.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      if (!res.ok) throw new Error('回复失败');
      await fetchInquiryDetails(selectedInquiry.id);
      setReplyContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  // ---------- 发起新询盘 ----------
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createMessage.trim()) {
      setError('请输入询盘内容');
      return;
    }

    setSubmittingCreate(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch('/api/account/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: createMessage.trim(),
          product_id: createProductId.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失败');
      }
      await fetchInquiries();
      setViewMode('list');
      setCreateMessage('');
      setCreateProductId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  // ---------- 渲染 ----------
  if (loading && inquiries.length === 0) {
    return <div className="p-6 text-center">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">我的询盘</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ---------- 左侧列表 ---------- */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-700">历史询盘</span>
              <button
                onClick={() => {
                  setViewMode('create');
                  setSelectedInquiry(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                立即询盘
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {inquiries.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Inbox className="w-10 h-10" />
                  <span>暂无询盘</span>
                </div>
              ) : (
                inquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    onClick={() => handleSelect(inquiry)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedInquiry?.id === inquiry.id && viewMode === 'list'
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium truncate">
                        #{inquiry.inquiry_number}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          inquiry.status === '待处理'
                            ? 'bg-red-100 text-red-700'
                            : inquiry.status === '处理中'
                            ? 'bg-yellow-100 text-yellow-700'
                            : inquiry.status === '已回复'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {inquiry.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2 break-words mt-0.5">
                      {inquiry.message || '无内容'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(inquiry.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ---------- 右侧内容 ---------- */}
        <div className="md:col-span-2">
          {viewMode === 'create' ? (
            // ----- 发起询盘表单 -----
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedInquiry(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-semibold text-gray-800">发起新询盘</h2>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div>
                  <label htmlFor="createMessage" className="block font-medium mb-1 text-gray-700">
                    询盘内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="createMessage"
                    value={createMessage}
                    onChange={(e) => setCreateMessage(e.target.value)}
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请详细描述您的需求或问题..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="createProductId" className="block font-medium mb-1 text-gray-700">
                    关联产品（可选）
                  </label>
                  <input
                    id="createProductId"
                    type="text"
                    value={createProductId}
                    onChange={(e) => setCreateProductId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="产品编号或名称"
                  />
                  <p className="text-sm text-gray-400 mt-1">如有特定产品，可在此填写以便我们快速定位</p>
                </div>

                {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submittingCreate ? '提交中...' : '提交询盘'}
                </button>
              </form>
            </div>
          ) : selectedInquiry ? (
            // ----- 询盘详情与回复（固定高度 + 内部滚动） -----
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[80vh] min-h-[500px]">
              {/* 头部 */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  #{selectedInquiry.inquiry_number}
                </h2>
                <p className="text-sm text-gray-500">{selectedInquiry.subject}</p>
              </div>

              {/* 客户信息 */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 text-sm grid grid-cols-2 gap-2 shrink-0">
                <div>
                  <span className="font-medium">姓名：</span>
                  {selectedInquiry.name}
                </div>
                <div>
                  <span className="font-medium">邮箱：</span>
                  {selectedInquiry.email}
                </div>
                {selectedInquiry.company && (
                  <div>
                    <span className="font-medium">公司：</span>
                    {selectedInquiry.company}
                  </div>
                )}
                {selectedInquiry.phone && (
                  <div>
                    <span className="font-medium">电话：</span>
                    {selectedInquiry.phone}
                  </div>
                )}
                {selectedInquiry.product_id && (
                  <div className="col-span-2">
                    <span className="font-medium">关联产品：</span>
                    {selectedInquiry.product_id}
                  </div>
                )}
              </div>

              {/* 对话区域（可滚动） */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`flex ${
                      reply.sender_type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        reply.sender_type === 'user'
                          ? 'bg-blue-50 text-gray-800'
                          : reply.sender_type === 'system'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1 flex items-center gap-2">
                        <span>{reply.sender_name || reply.sender_email}</span>
                        <span>·</span>
                        <span>{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {linkifyText(reply.content)}
                      </div>
                    </div>
                  </div>
                ))}
                {replies.length === 0 && (
                  <div className="text-center text-gray-400 py-8">暂无回复</div>
                )}
              </div>

              {/* 回复输入 */}
              <div className="border-t border-gray-100 p-4 shrink-0 bg-gray-50">
                <form onSubmit={handleReplySubmit} className="flex flex-col gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入您的回复..."
                    className="flex-1 border rounded-lg p-2 resize-none h-20"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply || !replyContent.trim()}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {submittingReply ? '发送中...' : '发送回复'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // ----- 默认空状态（同样高度） -----
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center gap-3 h-[80vh] min-h-[500px] justify-center">
              <Inbox className="w-12 h-12 text-gray-300" />
              <p>点击左侧询盘查看详情，或点击“立即询盘”发起新询盘</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}