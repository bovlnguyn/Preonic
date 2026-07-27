import api from './api';

/**
 * Messaging Service - Handle direct messaging API calls
 */
const messagingService = {
  /**
   * List current user's conversations (newest last-message first)
   */
  listConversations: async () => {
    try {
      const response = await api.get('/messaging/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách hội thoại thất bại' };
    }
  },

  /**
   * Get an existing conversation with a partner, or create a new one
   */
  startConversation: async (partnerId) => {
    try {
      const response = await api.post('/messaging/conversations', { partnerId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Tạo hội thoại thất bại' };
    }
  },

  /**
   * List messages in a conversation (paginated, oldest -> newest within the page)
   */
  listMessages: async (conversationId, { page, limit } = {}) => {
    try {
      const params = {};
      if (page) params.page = page;
      if (limit) params.limit = limit;

      const response = await api.get(`/messaging/conversations/${conversationId}/messages`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy tin nhắn thất bại' };
    }
  },

  /**
   * Send a message in a conversation
   */
  sendMessage: async (conversationId, text) => {
    try {
      const response = await api.post(`/messaging/conversations/${conversationId}/messages`, { text });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Gửi tin nhắn thất bại' };
    }
  },

  /**
   * Mark all messages in a conversation as read
   */
  markAsRead: async (conversationId) => {
    try {
      const response = await api.patch(`/messaging/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Đánh dấu hội thoại thất bại' };
    }
  },
};

export default messagingService;
