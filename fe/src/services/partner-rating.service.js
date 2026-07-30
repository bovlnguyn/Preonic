import api from './api';

/**
 * Partner Rating Service - Handle farmer<->enterprise rating API calls
 */
const partnerRatingService = {
  /**
   * List partners (with eligible contracts) the current user can rate
   */
  getEligiblePartners: async () => {
    try {
      const response = await api.get('/partner-ratings/eligible-partners');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách đối tác thất bại' };
    }
  },

  /**
   * Ratings given by / received by the current user
   */
  getMyRatings: async () => {
    try {
      const response = await api.get('/partner-ratings/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách đánh giá thất bại' };
    }
  },

  /**
   * Submit a partner rating for a contract already cooperated on
   */
  create: async ({ contractId, revieweeId, criteria, comment }) => {
    try {
      const response = await api.post('/partner-ratings', { contractId, revieweeId, criteria, comment });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Đánh giá đối tác thất bại' };
    }
  },
};

export default partnerRatingService;
