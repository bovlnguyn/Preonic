import api, { API_URL } from './api';

const UPLOADS_BASE_URL = API_URL.replace(/\/api\/v1\/?$/, '');

// Ảnh sản phẩm lưu đường dẫn tương đối (vd: /uploads/xxx.jpg) — ghép với gốc server để hiển thị.
export const resolveImageUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${UPLOADS_BASE_URL}${path}`;
};

// Không gửi các filter rỗng lên API. Giá trị "" trên UI có nghĩa là
// "Tất cả/không lọc", không phải một enum category/region/type hợp lệ.
// Giữ lại 0/false vì đây vẫn có thể là giá trị query có ý nghĩa.
export const cleanProductQueryParams = (params = {}) =>
  Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null) return result;

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) return result;
      result[key] = normalized;
      return result;
    }

    result[key] = value;
    return result;
  }, {});

const productService = {
  // Danh sách công khai — hỗ trợ filter (category, region, type), search theo tên, sort, phân trang
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params: cleanProductQueryParams(params) });
    return response.data;
  },

  createProduct: async (form, imageFiles = [], certFiles = []) => {
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      // Không append undefined/null vào FormData vì browser sẽ biến chúng
      // thành chuỗi "undefined"/"null" và có thể bị lưu xuống database.
      if (value === undefined || value === null) return;

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

  getMyProducts: async (params = {}) => {
    const response = await api.get('/products/my-products', { params: cleanProductQueryParams(params) });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getSimilar: async (id) => {
    const response = await api.get(`/products/${id}/similar`);
    return response.data;
  },

  getReviews: async (id) => {
    const response = await api.get(`/products/${id}/reviews`);
    return response.data;
  },

  getReviewEligibility: async (id) => {
    const response = await api.get(`/products/${id}/reviews/eligibility`);
    return response.data;
  },

  addReview: async (id, { rating, text }) => {
    const response = await api.post(`/products/${id}/reviews`, { rating, text });
    return response.data;
  },

  updateProduct: async (id, form) => {
    const isMultipart = typeof FormData !== 'undefined' && form instanceof FormData;

    const response = await api.put(`/products/${id}`, form,
      isMultipart
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined
    );

    return response.data;
  },

  deleteProduct: async (id) => {
    await api.delete(`/products/${id}`);
  },
};

export default productService;