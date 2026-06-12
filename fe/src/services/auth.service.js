import api from './api';

const authService = {
  login: async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async ({ fullName, email, phone, province, district, ward, password, role }) => {
    const response = await api.post('/auth/register', {
      fullName, email, phone, province, district, ward, password, role,
    });
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  loginWithGoogle: () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  },
};

export default authService;