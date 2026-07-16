'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Mail,
  CheckCircle,
  Reply,
  Building,
  Phone,
  Calendar,
  FileText,
  Package,
  ExternalLink,
  Inbox,
  Send,
  UserPlus,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Edit,
} from 'lucide-react';

// 类型定义
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
  customer_id: string | null;
  customers?: {
    id: string;
    name: string;
    email: string;
    company_name: string;
  };
}

interface Reply {
  id: number;
  sender_type: 'admin' | 'user' | 'system';
  sender_email: string;
  sender_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  admin_id?: number;
  customer_id?: string;
}

// Toast 组件
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-gray-300 hover:text-white">×</button>
    </div>
  );
}

// 辅助：将文本中的 URL 转为可点击链接
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

export default function InquiriesAdmin() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newInquiryMessage, setNewInquiryMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => setToast(msg);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/inquiries');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInquiries(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
      showToast('加载询盘失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiryDetails = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.inquiry && Number(data.inquiry.id) === id) {
        setSelectedInquiry(data.inquiry);
        setReplies(data.replies || []);
      } else {
        if (data.replies) {
          setReplies(data.replies);
        }
        console.warn('[fetchInquiryDetails] ID mismatch, keeping selectedInquiry', {
          requested: id,
          returned: data.inquiry?.id,
        });
      }
    } catch (err) {
      showToast('加载详情失败');
    }
  }, []);

  const openDetail = useCallback((inquiry: Inquiry) => {
    setSelectedId(inquiry.id);
    setSelectedInquiry(inquiry);
    fetchInquiryDetails(inquiry.id);
  }, [fetchInquiryDetails]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedInquiry) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${selectedInquiry.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          is_internal: isInternal,
        }),
      });
      if (!res.ok) throw new Error();

      await fetchInquiryDetails(selectedInquiry.id);

      if (!isInternal) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === selectedInquiry.id ? { ...inq, status: '已回复' } : inq
          )
        );
        setSelectedInquiry((prev) =>
          prev ? { ...prev, status: '已回复' } : null
        );
      }

      setReplyContent('');
      showToast('回复成功');
    } catch (err) {
      showToast('回复失败');
    } finally {
      setSubmittingReply(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchInquiries();
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => prev ? { ...prev, status } : null);
      }
      showToast('状态已更新');
    } catch (err) {
      showToast('更新失败');
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers?limit=50');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      showToast('加载客户列表失败');
    }
  };

  const openCreateModal = () => {
    fetchCustomers();
    setShowCreateModal(true);
  };

  const handleCreateInquiry = async () => {
    if (!selectedCustomerId || !newInquiryMessage.trim()) {
      showToast('请选择客户并填写内容');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/inquiries/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          message: newInquiryMessage,
        }),
      });
      if (!res.ok) throw new Error();
      showToast('询盘创建成功');
      setShowCreateModal(false);
      setSelectedCustomerId('');
      setNewInquiryMessage('');
      await fetchInquiries();
    } catch (err) {
      showToast('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const groupedInquiries = useMemo(() => {
    const groups: Record<string, Inquiry[]> = {};
    inquiries.forEach((inq) => {
      const key = inq.email;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inq);
    });
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    return groups;
  }, [inquiries]);

  const toggleGroup = (email: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  if (loading) return <div className="p-6 text-center">加载中...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">客户询盘管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInquiries}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            发起询盘
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-700">询盘列表</span>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                {inquiries.length} 条
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {Object.keys(groupedInquiries).length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Inbox className="w-10 h-10" />
                  <span>暂无询盘</span>
                </div>
              ) : (
                Object.entries(groupedInquiries).map(([email, groupItems]) => {
                  const latest = groupItems[0];
                  const isExpanded = expandedGroups[email] ?? false;
                  const isGroupSelected = groupItems.some(item => item.id === selectedId);
                  return (
                    <div key={email} className="border-b border-gray-100 last:border-0">
                      {/* 父行 */}
                      <div
                        onClick={() => toggleGroup(email)}
                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 flex items-center justify-between ${
                          isGroupSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {latest.name || latest.email}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 truncate">{latest.email}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(latest.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      {/* 子行列表 */}
                      {isExpanded && (
                        <div className="bg-gray-50/50 border-t border-gray-100">
                          {groupItems.map((inquiry, index) => (
                            <div
                              key={inquiry.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(inquiry);
                              }}
                              className={`pl-8 pr-3 py-2 cursor-pointer transition-colors hover:bg-gray-100 ${
                                selectedId === inquiry.id ? 'bg-blue-50' : ''
                              } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    #{inquiry.inquiry_number}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    inquiry.status === '待处理' ? 'bg-red-100 text-red-700' :
                                    inquiry.status === '处理中' ? 'bg-yellow-100 text-yellow-700' :
                                    inquiry.status === '已回复' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {inquiry.status}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 line-clamp-2 break-words">
                                  {inquiry.message || '无内容'}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(inquiry.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="md:col-span-2">
          {selectedInquiry ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[70vh]">
              {/* 头部 */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    #{selectedInquiry.inquiry_number}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedInquiry.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => updateStatus(selectedInquiry.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="待处理">待处理</option>
                    <option value="处理中">处理中</option>
                    <option value="已回复">已回复</option>
                    <option value="已关闭">已关闭</option>
                  </select>
                </div>
              </div>

              {/* 客户信息 */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 text-sm grid grid-cols-2 gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium">姓名：</span>
                  <span>{selectedInquiry.name || '-'}</span>
                  {selectedInquiry.customer_id && (
                    <a
                      href={`/admin/crm/${selectedInquiry.customer_id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline ml-1"
                    >
                      <Edit className="w-3 h-3" />
                      编辑
                    </a>
                  )}
                </div>
                <div><span className="font-medium">邮箱：</span>{selectedInquiry.email}</div>
                {selectedInquiry.company && <div><span className="font-medium">公司：</span>{selectedInquiry.company}</div>}
                {selectedInquiry.phone && <div><span className="font-medium">电话：</span>{selectedInquiry.phone}</div>}
                {selectedInquiry.product_id && (
                  <div className="col-span-2">
                    <span className="font-medium">关联产品：</span>
                    <a href={selectedInquiry.product_id} target="_blank" className="text-blue-600 hover:underline">
                      {selectedInquiry.product_id}
                    </a>
                  </div>
                )}
              </div>

              {/* 对话区域 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`flex ${reply.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      reply.sender_type === 'admin'
                        ? 'bg-blue-50 text-gray-800'
                        : reply.sender_type === 'system'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-gray-100 text-gray-800'
                    } ${reply.is_internal ? 'border-2 border-dashed border-yellow-400' : ''}`}>
                      <div className="text-xs opacity-75 mb-1 flex items-center gap-2">
                        <span>{reply.sender_name || reply.sender_email}</span>
                        <span>·</span>
                        <span>{new Date(reply.created_at).toLocaleString()}</span>
                        {reply.is_internal && <span className="bg-yellow-200 text-yellow-800 px-1 rounded text-[10px]">内部</span>}
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

              {/* 回复输入 - 添加 disabled 和样式 */}
              <div className="border-t border-gray-100 p-4 shrink-0 bg-gray-50">
                <form onSubmit={handleReplySubmit} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="输入回复内容..."
                      className="flex-1 border rounded-lg p-2 resize-none h-20 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submittingReply}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      内部备注（不发送给客户）
                    </label>
                    <button
                      type="submit"
                      disabled={submittingReply || !replyContent.trim()}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {submittingReply ? '发送中...' : '发送'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center gap-3 h-[70vh] justify-center">
              <Inbox className="w-12 h-12 text-gray-300" />
              <p>点击左侧询盘查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 发起询盘模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">选择客户发起询盘</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">选择客户</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border rounded p-2"
                >
                  <option value="">请选择...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.email} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">询盘内容</label>
                <textarea
                  value={newInquiryMessage}
                  onChange={(e) => setNewInquiryMessage(e.target.value)}
                  className="w-full border rounded p-2 h-32"
                  placeholder="请输入询盘内容..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateInquiry}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? '创建中...' : '发起询盘'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}