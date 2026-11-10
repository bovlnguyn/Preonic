import api from './api';

const advertisementService = {
  getPricing: async () => (await api.get('/advertisements/pricing')).data,
  getPublic: async (province) => (await api.get('/advertisements/public', {
    params: province ? { province } : undefined,
  })).data,
  getMine: async () => (await api.get('/advertisements/mine')).data,
  create: async (formData) => (await api.post('/advertisements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data,
  cancel: async (id) => (await api.patch(`/advertisements/${id}/cancel`)).data,
  trackImpression: (id) => api.post(`/advertisements/${id}/impression`, {}, { skipAuthToken: true }),
  trackClick: (id) => api.post(`/advertisements/${id}/click`, {}, { skipAuthToken: true }),
};

export default advertisementService;
