import api from './api';

/**
 * Notification Service - Handle notification API calls
 */
const notificationService = {
  /**
   * List current user's notifications (paginated)
   */
  list: async ({ page, limit, isRead } = {}) => {
    try {
      const params = {};
      if (page) params.page = page;
      if (limit) params.limit = limit;
      if (isRead !== undefined) params.isRead = isRead;

      const response = await api.get('/notifications', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách thông báo thất bại' };
    }
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy số thông báo chưa đọc thất bại' };
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Đánh dấu thông báo thất bại' };
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      const response = await api.patch('/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Đánh dấu tất cả thông báo thất bại' };
    }
  },
};

export default notificationService;
