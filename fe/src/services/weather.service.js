import api from './api';

/**
 * Weather Service - Handle weather + weather-alert API calls
 */
const unwrap = (res) => res.data;

// BE trả WeatherAlert phẳng (id, province, district); FE (FarmerWeatherInsurance) dùng _id + location lồng nhau.
const normalizeAlert = (alert) => ({
  ...alert,
  _id: alert.id,
  location: { province: alert.province, district: alert.district },
});

const weatherService = {
  /**
   * Toạ độ tất cả tỉnh/thành — dùng cho bản đồ Windy
   */
  getProvinceCoords: async () => {
    try {
      const response = await api.get('/weather/provinces');
      return unwrap(response).data || {};
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy toạ độ tỉnh/thành thất bại' };
    }
  },

  /**
   * Thời tiết hiện tại theo tỉnh
   */
  getCurrentWeather: async (province) => {
    try {
      const response = await api.get('/weather/current', { params: { province } });
      return unwrap(response);
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy thời tiết hiện tại thất bại' };
    }
  },

  /**
   * Dự báo 5 ngày theo tỉnh
   */
  getForecast: async (province) => {
    try {
      const response = await api.get('/weather/daily-forecast', { params: { province } });
      return unwrap(response);
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy dự báo thời tiết thất bại' };
    }
  },

  /**
   * Ngưỡng cảnh báo thời tiết của hệ thống
   */
  getThresholds: async () => {
    try {
      const response = await api.get('/weather/thresholds');
      return unwrap(response);
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy ngưỡng cảnh báo thất bại' };
    }
  },

  /**
   * Danh sách cảnh báo thời tiết của user hiện tại (đã đăng nhập)
   */
  getAlerts: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/weather/alerts', { params: { page, limit } });
      const body = unwrap(response);
      const alerts = (body?.data?.alerts || []).map(normalizeAlert);
      return { data: alerts, pagination: body?.data?.pagination };
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách cảnh báo thất bại' };
    }
  },

  /**
   * Đánh dấu 1 cảnh báo là đã đọc
   */
  markAlertAsRead: async (id) => {
    try {
      const response = await api.patch(`/weather/alerts/${id}/read`);
      return unwrap(response);
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Đánh dấu cảnh báo thất bại' };
    }
  },

  /**
   * Đánh dấu tất cả cảnh báo là đã đọc
   */
  markAllAlertsAsRead: async () => {
    try {
      const response = await api.patch('/weather/alerts/read-all');
      return unwrap(response);
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Đánh dấu tất cả cảnh báo thất bại' };
    }
  },
};

export default weatherService;
