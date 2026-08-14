import api from './api';

const supplierService = {
  /**
   * Danh sach nong dan (nha cung cap) da/dang hop tac voi doanh nghiep dang dang nhap,
   * tong hop tu lich su hop dong.
   */
  list: async (params = {}) => {
    try {
      const response = await api.get('/enterprise/suppliers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách nhà cung cấp thất bại' };
    }
  },

  /**
   * Chi tiet 1 nha cung cap (nong dan): thong tin ho so, so lieu tong hop
   * va toan bo lich su hop dong voi doanh nghiep dang dang nhap.
   */
  getById: async (farmerId, params = {}) => {
    try {
      const response = await api.get(`/enterprise/suppliers/${farmerId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy thông tin nhà cung cấp thất bại' };
    }
  },
};

export default supplierService;
