'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Mail,
  CheckCircle,
  Circle,
  Trash2,
  Reply,
  Building,
  Phone,
  Calendar,
  FileText,
  Package,
  ExternalLink,
  Inbox,
} from 'lucide-react';

interface Inquiry {
  id: string;
  createdAt: string;
  read: boolean;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
  relatedProduct?: string;
  productUrl?: string;
}

// 简易 Toast 组件
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-gray-300 hover:text-white">×</button>
    </div>
  );
}

export default function InquiriesAdmin() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [markingReadIds, setMarkingReadIds] = useState<Set<string>>(new Set());

  // 显示提示消息
  const showToast = (msg: string) => {
    setToast(msg);
  };

  // 获取询盘列表（按时间倒序）
  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/inquiries');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sorted = [...data].sort(
        (a: Inquiry, b: Inquiry) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInquiries(sorted);
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

  // 标记已读
  const markAsRead = useCallback(
    async (id: string) => {
      if (markingReadIds.has(id)) return;
      setMarkingReadIds((prev) => new Set(prev).add(id));

      // 乐观更新
      const prevInquiries = [...inquiries];
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === id ? { ...inq, read: true } : inq))
      );
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, read: true } : null));
      }

      try {
        const res = await fetch(`/api/admin/inquiries?id=${id}`, { method: 'PATCH' });
        if (!res.ok) throw new Error();
      } catch (err) {
        // 回滚
        setInquiries(prevInquiries);
        if (selectedInquiry?.id === id) {
          setSelectedInquiry((prev) => (prev ? { ...prev, read: false } : null));
        }
        showToast('标记已读失败');
      } finally {
        setMarkingReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [inquiries, selectedInquiry]
  );

  // 删除询盘
  const deleteInquiry = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('确定删除该询盘吗？')) return;

    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      showToast('删除成功');
    } catch (err) {
      showToast('删除失败');
    }
  };

  // 打开详情，自动标记已读
  const openDetail = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    if (!inquiry.read) markAsRead(inquiry.id);
  };

  // 回复邮件
  const handleReply = (inquiry: Inquiry) => {
    const subject = encodeURIComponent(`回复您的询盘 - ${inquiry.relatedProduct || '产品咨询'}`);
    const body = encodeURIComponent(`您好 ${inquiry.name}，\n\n感谢您的留言。我们会尽快回复您。\n\n原始消息：\n${inquiry.message?.slice(0, 200) || ''}`);
    window.location.href = `mailto:${inquiry.email}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-3">出错：{error}</div>
        <button
          onClick={fetchInquiries}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast 提示 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">客户询盘管理</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧列表 - 白色卡片样式 */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-700">询盘列表</span>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                {inquiries.length} 条
              </span>
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
                    onClick={() => openDetail(inquiry)}
                    className={`group relative p-4 cursor-pointer transition-all duration-150 ${
                      !inquiry.read
                        ? 'bg-blue-50/30 hover:bg-blue-50'
                        : 'bg-white hover:bg-gray-50'
                    } ${selectedInquiry?.id === inquiry.id ? 'ring-1 ring-blue-400 bg-blue-50/50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!inquiry.read ? (
                            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              !inquiry.read ? 'font-semibold text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            {inquiry.name || '匿名用户'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 truncate mt-0.5 pl-6">
                          {inquiry.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!inquiry.read && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                            新
                          </span>
                        )}
                        <button
                          onClick={(e) => deleteInquiry(inquiry.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-2 pl-6">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(inquiry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧详情 - 白色卡片样式 */}
        <div className="md:col-span-2">
          {selectedInquiry ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  询盘详情
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(selectedInquiry)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Reply className="w-4 h-4" />
                    回复邮件
                  </button>
                  <button
                    onClick={() => deleteInquiry(selectedInquiry.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* 基本信息双栏布局 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-500">姓名</div>
                      <div className="text-gray-800">{selectedInquiry.name || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-500">邮箱</div>
                      <div className="text-gray-800 break-all">{selectedInquiry.email}</div>
                    </div>
                  </div>
                  {selectedInquiry.company && (
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">公司</div>
                        <div className="text-gray-800">{selectedInquiry.company}</div>
                      </div>
                    </div>
                  )}
                  {selectedInquiry.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">电话</div>
                        <div className="text-gray-800">{selectedInquiry.phone}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 关联产品 */}
                {(selectedInquiry.relatedProduct || selectedInquiry.productUrl) && (
                  <div className="flex items-start gap-2 border-t pt-4">
                    <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">关联产品</div>
                      <div className="text-gray-800">
                        {selectedInquiry.relatedProduct || '-'}
                        {selectedInquiry.productUrl && (
                          <a
                            href={selectedInquiry.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center text-blue-600 hover:underline text-sm"
                          >
                            <ExternalLink className="w-3 h-3 mr-0.5" />
                            查看产品
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 询盘内容 */}
                <div className="border-t pt-4">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    询盘内容
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedInquiry.message || '-'}
                  </div>
                </div>

                {/* 提交时间 */}
                <div className="flex items-center gap-1 text-sm text-gray-400 border-t pt-4">
                  <Calendar className="w-4 h-4" />
                  <span>提交时间：{new Date(selectedInquiry.createdAt).toLocaleString()}</span>
                  {selectedInquiry.read && (
                    <span className="ml-2 text-xs text-gray-400 flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> 已读
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <Inbox className="w-12 h-12 text-gray-300" />
              <p>点击左侧询盘查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}