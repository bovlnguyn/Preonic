import api from './api';

const unwrapError = (error, fallback) => {
  throw error.response?.data || { success: false, message: fallback };
};

const orderService = {
  list: async (params = {}) => {
    try {
      return (await api.get('/orders', { params })).data;
    } catch (error) {
      return unwrapError(error, 'Không thể tải danh sách đơn hàng');
    }
  },

  getById: async (id) => {
    try {
      return (await api.get(`/orders/${id}`)).data;
    } catch (error) {
      return unwrapError(error, 'Không thể tải chi tiết đơn hàng');
    }
  },

  setReportSchedule: async (id, intervalDays) => {
    try {
      return (await api.patch(`/orders/${id}/report-schedule`, { intervalDays })).data;
    } catch (error) {
      return unwrapError(error, 'Không thể cập nhật lịch báo cáo');
    }
  },

  requestCropReport: async (id, data) => {
    try {
      return (await api.post(`/orders/${id}/report-requests`, data)).data;
    } catch (error) {
      return unwrapError(error, 'Không thể gửi yêu cầu báo cáo');
    }
  },

  submitCropReport: async (id, { reportId, note, images }) => {
    const body = new FormData();
    if (reportId) body.append('reportId', reportId);
    if (note) body.append('note', note);
    Array.from(images || []).forEach((file) => body.append('images', file));
    try {
      return (await api.post(`/orders/${id}/crop-reports`, body)).data;
    } catch (error) {
      return unwrapError(error, 'Không thể gửi báo cáo canh tác');
    }
  },

  readyToShip: async (id, note) => {
    try {
      return (await api.post(`/orders/${id}/ready-to-ship`, { note })).data;
    } catch (error) {
      return unwrapError(error, 'Không thể chuyển sang sẵn sàng giao');
    }
  },

  handover: async (id, { carrier, trackingCode, note, loadingPhoto }) => {
    const body = new FormData();
    body.append('carrier', carrier || 'ghn');
    body.append('trackingCode', trackingCode);
    if (note) body.append('note', note);
    if (loadingPhoto) body.append('loadingPhoto', loadingPhoto);
    try {
      return (await api.post(`/orders/${id}/handover`, body)).data;
    } catch (error) {
      return unwrapError(error, 'Không thể ghi nhận bàn giao vận chuyển');
    }
  },

  receive: async (id, note) => {
    try {
      return (await api.post(`/orders/${id}/receive`, { note })).data;
    } catch (error) {
      return unwrapError(error, 'Không thể xác nhận nhận hàng');
    }
  },

  complete: async (id) => {
    try {
      return (await api.post(`/orders/${id}/complete`)).data;
    } catch (error) {
      return unwrapError(error, 'Không thể hoàn tất hợp đồng');
    }
  },
};

export default orderService;
