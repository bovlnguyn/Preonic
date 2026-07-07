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
  getMyCrops: async () => {
    const response = await productService.getMyProducts();
    const list = response?.data || response?.products || [];
    return Array.isArray(list) ? list : [];
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
