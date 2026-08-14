import authService from './auth.service';
import productService from './product.service';

/**
 * Farmer Service - Gom các API đã có backend hỗ trợ (auth + products)
 * thành một bề mặt gọi riêng cho Farmer Dashboard, tránh lặp lại logic
 * parse response ở từng trang (FarmerOverview, FarmerCrops...).
 */
const farmerService = {
  // ── Hồ sơ farmer ──
  getProfile: async () => {
    const response = await authService.getMe();
    return response?.data?.user || null;
  },

  updateProfile: async (data) => {
    const response = await authService.updateProfile(data);
    return response?.data?.user || null;
  },

  // ── Mùa vụ / sản phẩm của farmer đang đăng nhập ──
  getMyCrops: async (params = {}) => {
    const response = await productService.getMyProducts(params);
    const list = response?.data || response?.products || [];
    return Array.isArray(list) ? list : [];
  },

  getMyCropsPage: async (params = {}) => {
    const response = await productService.getMyProducts(params);
    const products = response?.data || response?.products || [];
    return {
      products: Array.isArray(products) ? products : [],
      pagination: response?.pagination || { page: 1, total: 0, totalPages: 0 },
      summary: response?.summary || { totalProducts: 0, totalQuantity: 0 },
      categories: Array.isArray(response?.categories) ? response.categories : [],
    };
  },

  getCropById: async (id) => {
    const response = await productService.getProductById(id);
    return response?.data?.product || null;
  },

  createCrop: (form, imageFiles = [], certFiles = []) =>
    productService.createProduct(form, imageFiles, certFiles),

  updateCrop: (id, form) => productService.updateProduct(id, form),

  deleteCrop: (id) => productService.deleteProduct(id),
};

export default farmerService;
