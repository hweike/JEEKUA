'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Mail,
  Inbox,
  Calendar,
  FileText,
  Send,
  Plus,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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
          className="underline"
          style={{ color: 'var(--account-inquiry-link-color, #2563eb)' }}
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
  const t = useTranslations('Account.Inquiry');
  const tShared = useTranslations('Shared');

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [createMessage, setCreateMessage] = useState('');
  const [createProductId, setCreateProductId] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const detailRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // ✅ 询盘页面专属 CSS 变量
  // ============================================================
  const titleColor = 'var(--account-inquiry-title-color, #1f2937)';
  const listBg = 'var(--account-inquiry-list-bg, #ffffff)';
  const listBorder = 'var(--account-inquiry-list-border, #f3f4f6)';
  const listRadius = 'var(--account-inquiry-list-radius, 0.75rem)';
  const itemBg = 'var(--account-inquiry-item-bg, #ffffff)';
  const itemHover = 'var(--account-inquiry-item-hover, #f9fafb)';
  const itemActiveBg = 'var(--account-inquiry-item-active-bg, #eff6ff)';
  const itemActiveBorder = 'var(--account-inquiry-item-active-border, #3b82f6)';
  const itemText = 'var(--account-inquiry-item-text, #374151)';
  const itemMeta = 'var(--account-inquiry-item-meta, #9ca3af)';
  const detailBg = 'var(--account-inquiry-detail-bg, #ffffff)';
  const detailBorder = 'var(--account-inquiry-detail-border, #f3f4f6)';
  const detailRadius = 'var(--account-inquiry-detail-radius, 0.75rem)';
  const headerBg = 'var(--account-inquiry-header-bg, #f9fafb)';
  const headerText = 'var(--account-inquiry-header-text, #1f2937)';
  const infoBg = 'var(--account-inquiry-info-bg, #f9fafb)';
  const infoText = 'var(--account-inquiry-info-text, #6b7280)';
  const replyUserBg = 'var(--account-inquiry-reply-user-bg, #eff6ff)';
  const replyUserText = 'var(--account-inquiry-reply-user-text, #1f2937)';
  const replyAdminBg = 'var(--account-inquiry-reply-admin-bg, #f3f4f6)';
  const replyAdminText = 'var(--account-inquiry-reply-admin-text, #1f2937)';
  const replySystemBg = 'var(--account-inquiry-reply-system-bg, #e5e7eb)';
  const replySystemText = 'var(--account-inquiry-reply-system-text, #374151)';
  const replyInputBg = 'var(--account-inquiry-reply-input-bg, #ffffff)';
  const replyInputBorder = 'var(--account-inquiry-reply-input-border, #d1d5db)';
  const replyInputRadius = 'var(--account-inquiry-reply-input-radius, 0.5rem)';
  const sendBtnBg = 'var(--account-inquiry-send-btn-bg, #2563eb)';
  const sendBtnText = 'var(--account-inquiry-send-btn-text, #ffffff)';
  const sendBtnHover = 'var(--account-inquiry-send-btn-hover, #1d4ed8)';
  const createBtnBg = 'var(--account-inquiry-create-btn-bg, #2563eb)';
  const createBtnText = 'var(--account-inquiry-create-btn-text, #ffffff)';
  const createBtnHover = 'var(--account-inquiry-create-btn-hover, #1d4ed8)';
  const emptyIcon = 'var(--account-inquiry-empty-icon, #d1d5db)';
  const emptyText = 'var(--account-inquiry-empty-text, #9ca3af)';

  const statusColors = {
    '待处理': 'var(--account-inquiry-status-pending, #dc2626)',
    '处理中': 'var(--account-inquiry-status-processing, #ca8a04)',
    '已回复': 'var(--account-inquiry-status-replied, #16a34a)',
    '已关闭': 'var(--account-inquiry-status-closed, #6b7280)',
  };

  const statusBgColors = {
    '待处理': 'var(--account-inquiry-status-pending-bg, #fee2e2)',
    '处理中': 'var(--account-inquiry-status-processing-bg, #fef9c3)',
    '已回复': 'var(--account-inquiry-status-replied-bg, #dcfce7)',
    '已关闭': 'var(--account-inquiry-status-closed-bg, #f3f4f6)',
  };

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/account/inquiries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('errorFetchList'));
      const data = await res.json();
      setInquiries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const fetchInquiryDetails = useCallback(async (id: number) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/account/inquiries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('errorFetchDetail'));
      const data = await res.json();
      setSelectedInquiry(data.inquiry);
      setReplies(data.replies || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [t]);

  const handleRefresh = async () => {
    if (loading) return;
    await fetchInquiries();
    if (selectedInquiry && viewMode !== 'create') {
      await fetchInquiryDetails(selectedInquiry.id);
    }
  };

  const handleSelect = (inquiry: Inquiry) => {
    if (selectedInquiry?.id === inquiry.id) return;
    setViewMode('list');
    fetchInquiryDetails(inquiry.id);
    if (window.innerWidth < 768 && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

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
      if (!res.ok) throw new Error(t('errorReply'));
      await fetchInquiryDetails(selectedInquiry.id);
      setReplyContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createMessage.trim()) {
      setError(t('errorCreate'));
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
        throw new Error(data.error || t('errorCreate'));
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

  const statusMap: Record<string, string> = {
    '待处理': 'pending',
    '处理中': 'processing',
    '已回复': 'replied',
    '已关闭': 'closed',
  };

  const getStatusLabel = (status: string) => {
    const key = statusMap[status] || status;
    try {
      return t(`status.${key}`);
    } catch {
      return status;
    }
  };

  if (loading && inquiries.length === 0) {
    return <div className="p-6 text-center">{tShared('loading')}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6" style={{ color: createBtnBg }} />
          <h1 className="text-2xl font-bold" style={{ color: titleColor }}>
            {t('title')}
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
          aria-label={t('refresh')}
        >
          <RefreshCw
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            style={{ color: itemMeta }}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: listBg,
              border: `1px solid ${listBorder}`,
              borderRadius: listRadius,
            }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{
                backgroundColor: headerBg,
                borderColor: listBorder,
              }}
            >
              <span className="font-medium" style={{ color: itemText }}>
                {t('history')}
              </span>
              <button
                onClick={() => {
                  setViewMode('create');
                  setSelectedInquiry(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition"
                style={{
                  backgroundColor: createBtnBg,
                  color: createBtnText,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = createBtnHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = createBtnBg;
                }}
              >
                <Plus className="w-4 h-4" />
                {t('newInquiry')}
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-[40vh] md:max-h-[70vh] overflow-y-auto">
              {inquiries.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2" style={{ color: emptyText }}>
                  <Inbox className="w-10 h-10" style={{ color: emptyIcon }} />
                  <span>{t('noInquiries')}</span>
                </div>
              ) : (
                inquiries.map((inquiry) => {
                  const statusColor = statusColors[inquiry.status] || statusColors['已关闭'];
                  const statusBg = statusBgColors[inquiry.status] || statusBgColors['已关闭'];
                  const isActive = selectedInquiry?.id === inquiry.id && viewMode === 'list';
                  return (
                    <div
                      key={inquiry.id}
                      onClick={() => handleSelect(inquiry)}
                      className="p-3 sm:p-4 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isActive ? itemActiveBg : itemBg,
                        borderLeft: isActive ? `4px solid ${itemActiveBorder}` : '4px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = itemHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = itemBg;
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium truncate text-sm sm:text-base" style={{ color: itemText }}>
                          #{inquiry.inquiry_number}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: statusBg,
                            color: statusColor,
                          }}
                        >
                          {getStatusLabel(inquiry.status)}
                        </span>
                      </div>
                      <div
                        className="text-sm line-clamp-2 break-words mt-0.5"
                        style={{ color: infoText }}
                      >
                        {inquiry.message || t('noContent')}
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-1" style={{ color: itemMeta }}>
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(inquiry.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2" ref={detailRef}>
          {viewMode === 'create' ? (
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: detailBg,
                border: `1px solid ${detailBorder}`,
                borderRadius: detailRadius,
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedInquiry(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                  style={{ color: itemText }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold" style={{ color: titleColor }}>
                  {t('createTitle')}
                </h2>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div>
                  <label htmlFor="createMessage" className="block font-medium mb-1" style={{ color: itemText }}>
                    {t('createMessage')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="createMessage"
                    value={createMessage}
                    onChange={(e) => setCreateMessage(e.target.value)}
                    rows={6}
                    className="w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{
                      border: `1px solid ${replyInputBorder}`,
                      backgroundColor: replyInputBg,
                      color: itemText,
                      borderRadius: replyInputRadius,
                    }}
                    placeholder={t('createMessagePlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="createProductId" className="block font-medium mb-1" style={{ color: itemText }}>
                    {t('productId')}
                  </label>
                  <input
                    id="createProductId"
                    type="text"
                    value={createProductId}
                    onChange={(e) => setCreateProductId(e.target.value)}
                    className="w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{
                      border: `1px solid ${replyInputBorder}`,
                      backgroundColor: replyInputBg,
                      color: itemText,
                      borderRadius: replyInputRadius,
                    }}
                    placeholder={t('productIdPlaceholder')}
                  />
                  <p className="text-sm mt-1" style={{ color: itemMeta }}>{t('productIdNote')}</p>
                </div>

                {error && (
                  <div className="text-sm p-3 rounded-lg" style={{ color: 'var(--account-error-color, #ef4444)', backgroundColor: 'var(--account-error-bg, #fee2e2)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="w-full py-3 rounded-lg font-medium transition disabled:opacity-50"
                  style={{
                    backgroundColor: sendBtnBg,
                    color: sendBtnText,
                  }}
                  onMouseEnter={(e) => {
                    if (!submittingCreate) e.currentTarget.style.backgroundColor = sendBtnHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!submittingCreate) e.currentTarget.style.backgroundColor = sendBtnBg;
                  }}
                >
                  {submittingCreate ? t('submitting') : t('submit')}
                </button>
              </form>
            </div>
          ) : selectedInquiry ? (
            <div
              className="rounded-xl border flex flex-col h-[60vh] md:h-[80vh] min-h-[300px] md:min-h-[500px] overflow-hidden"
              style={{
                backgroundColor: detailBg,
                borderColor: detailBorder,
                borderRadius: detailRadius,
              }}
            >
              <div
                className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
                style={{
                  backgroundColor: headerBg,
                  borderColor: detailBorder,
                }}
              >
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2" style={{ color: headerText }}>
                  <FileText className="w-5 h-5" style={{ color: itemMeta }} />
                  #{selectedInquiry.inquiry_number}
                </h2>
                <p className="text-sm" style={{ color: infoText }}>{selectedInquiry.subject}</p>
              </div>

              <div
                className="px-4 sm:px-6 py-2 sm:py-3 border-b text-sm grid grid-cols-2 gap-2 shrink-0"
                style={{
                  backgroundColor: infoBg,
                  borderColor: detailBorder,
                  color: infoText,
                }}
              >
                <div>
                  <span className="font-medium">{t('nameLabel')}：</span>
                  {selectedInquiry.name}
                </div>
                <div>
                  <span className="font-medium">{t('emailLabel')}：</span>
                  {selectedInquiry.email}
                </div>
                {selectedInquiry.company && (
                  <div>
                    <span className="font-medium">{t('companyLabel')}：</span>
                    {selectedInquiry.company}
                  </div>
                )}
                {selectedInquiry.phone && (
                  <div>
                    <span className="font-medium">{t('phoneLabel')}：</span>
                    {selectedInquiry.phone}
                  </div>
                )}
                {selectedInquiry.product_id && (
                  <div className="col-span-2">
                    <span className="font-medium">{t('productLabel')}：</span>
                    {selectedInquiry.product_id}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-0">
                {replies.map((reply) => {
                  const isUser = reply.sender_type === 'user';
                  const isSystem = reply.sender_type === 'system';
                  return (
                    <div key={reply.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[80%] rounded-lg px-4 py-2"
                        style={{
                          backgroundColor: isUser ? replyUserBg : isSystem ? replySystemBg : replyAdminBg,
                          color: isUser ? replyUserText : isSystem ? replySystemText : replyAdminText,
                        }}
                      >
                        <div className="text-xs opacity-75 mb-1 flex items-center gap-2 flex-wrap">
                          <span>{reply.sender_name || reply.sender_email}</span>
                          <span>·</span>
                          <span>{new Date(reply.created_at).toLocaleString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap break-words">
                          {linkifyText(reply.content)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {replies.length === 0 && (
                  <div className="text-center py-8" style={{ color: emptyText }}>
                    {t('noReplies')}
                  </div>
                )}
              </div>

              <div
                className="border-t p-3 sm:p-4 shrink-0"
                style={{
                  borderColor: detailBorder,
                  backgroundColor: infoBg,
                }}
              >
                <form onSubmit={handleReplySubmit} className="flex flex-col gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={t('replyPlaceholder')}
                    className="flex-1 p-2 resize-none h-20"
                    style={{
                      border: `1px solid ${replyInputBorder}`,
                      backgroundColor: replyInputBg,
                      color: itemText,
                      borderRadius: replyInputRadius,
                    }}
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply || !replyContent.trim()}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg transition disabled:opacity-50"
                      style={{
                        backgroundColor: sendBtnBg,
                        color: sendBtnText,
                      }}
                      onMouseEnter={(e) => {
                        if (!submittingReply && replyContent.trim()) {
                          e.currentTarget.style.backgroundColor = sendBtnHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!submittingReply && replyContent.trim()) {
                          e.currentTarget.style.backgroundColor = sendBtnBg;
                        }
                      }}
                    >
                      <Send className="w-4 h-4" />
                      {submittingReply ? t('sending') : t('sendReply')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border p-6 text-center flex flex-col items-center gap-3 h-[60vh] md:h-[80vh] min-h-[300px] md:min-h-[500px] justify-center"
              style={{
                backgroundColor: detailBg,
                borderColor: detailBorder,
                borderRadius: detailRadius,
                color: emptyText,
              }}
            >
              <Inbox className="w-12 h-12" style={{ color: emptyIcon }} />
              <p>{t('emptyDetail')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}