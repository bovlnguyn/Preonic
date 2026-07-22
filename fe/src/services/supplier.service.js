import api from './api';

const supplierService = {
  /**
   * Danh sach nong dan (nha cung cap) da/dang hop tac voi doanh nghiep dang dang nhap,
   * tong hop tu lich su hop dong.
   */
  list: async () => {
    try {
      const response = await api.get('/enterprise/suppliers');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách nhà cung cấp thất bại' };
    }
  },
};

export default supplierService;
