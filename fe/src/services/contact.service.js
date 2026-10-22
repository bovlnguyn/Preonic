import api from './api';

const contactService = {
  send: async (payload) => {
    try {
      const response = await api.post('/contact', payload, {
        skipAuthRefresh: true,
        skipAuthToken: true,
      });
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      throw data || {
        success: false,
        message: 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.',
      };
    }
  },
};

export default contactService;
