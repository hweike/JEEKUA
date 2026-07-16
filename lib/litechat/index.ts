// lib/litechat/index.ts

// 类型导出
export * from './types';

// 服务导出
export {
  getOrCreateChatCustomer,
  getCustomerById,
  customerExists,
} from './services/customer.service';

export {
  getOrCreateConversation,
  getConversationById,
  getCustomerConversations,
  getAllConversationsForAdmin,
  updateConversationStatus,
  assignAgentToConversation,
} from './services/conversation.service';

export {
  getMessagesByConversation,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
} from './services/message.service';

// 实时订阅导出
export {
  subscribeToMessages,
  subscribeToAllMessages,
} from './realtime';