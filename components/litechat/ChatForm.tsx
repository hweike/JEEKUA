// components/litechat/ChatForm.tsx
'use client';

interface ChatFormProps {
  email: string;
  name: string;
  setEmail: (v: string) => void;
  setName: (v: string) => void;
  onStart: (email: string, name: string) => void;
  loading: boolean;
  error: string | null;
  welcomeMessage: string;
  brandColor: string;
  visitorId?: string;  // 例如：visitor_550e8400
}

export default function ChatForm({
  email,
  name,
  setEmail,
  setName,
  onStart,
  loading,
  error,
  welcomeMessage,
  brandColor,
  visitorId,  // ✅ 接收 visitorId
}: ChatFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      // 错误通过父组件传递
      return;
    }
    onStart(email, name);
  };

  return (
    <div className="flex-1 p-6 flex flex-col justify-center">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">💬</div>
        <h3 className="text-lg font-semibold text-gray-800">在线客服</h3>
        <p className="text-sm text-gray-500 mt-1">{welcomeMessage}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="请输入您的邮箱 *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
          autoFocus
          required
        />
        <input
          type="text"
          placeholder="您的姓名（可选）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        {/* ✅ 显示 visitor_id 提示信息 */}
        {!name && visitorId && (
          <p className="text-xs text-gray-400 mb-3">
            将使用 "<span className="font-mono">{visitorId}</span>" 作为您的临时名称
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-white font-medium transition disabled:opacity-50"
          style={{ backgroundColor: brandColor }}
        >
          {loading ? '连接中...' : '开始聊天'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-4">
          我们会根据您提供的邮箱回复您
        </p>
      </form>
    </div>
  );
}