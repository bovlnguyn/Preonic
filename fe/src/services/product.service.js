import api from './api';

const productService = {
  // Danh sách công khai — hỗ trợ filter (category, region, type), search theo tên, sort, phân trang
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  createProduct: async (form, imageFiles = [], certFiles = []) => {
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (key === 'commitments' || key === 'certificationNames') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    imageFiles.forEach((file) => formData.append('images', file));
    certFiles.forEach((file) => formData.append('certifications', file));

    const response = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getMyProducts: async () => {
    const response = await api.get('/products/my-products');
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  updateProduct: async (id, form) => {
    const response = await api.put(`/products/${id}`, form);
    return response.data;
  },

  deleteProduct: async (id) => {
    await api.delete(`/products/${id}`);
  },
};

export default productService;