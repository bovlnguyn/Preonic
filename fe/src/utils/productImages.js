export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 10;
export const MIN_PRODUCT_IMAGES = 3;

const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

export const getProductImagePaths = (product) => {
  const paths = [];
  const addPath = (value) => {
    if (typeof value !== 'string') return;
    const path = value.trim();
    if (path && !paths.includes(path)) paths.push(path);
  };

  addPath(product?.image);

  if (Array.isArray(product?.images)) {
    product.images.forEach(addPath);
  } else if (typeof product?.images === 'string' && product.images.trim()) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) parsed.forEach(addPath);
      else if (typeof parsed === 'string') addPath(parsed);
    } catch {
      if (/^(https?:\/\/|\/)/i.test(product.images.trim())) addPath(product.images);
    }
  }

  return paths;
};

export const validateProductImageFiles = (files = []) => {
  const selected = Array.from(files || []);

  if (selected.length > MAX_PRODUCT_IMAGES) {
    return `Mỗi sản phẩm chỉ được tải tối đa ${MAX_PRODUCT_IMAGES} ảnh.`;
  }

  if (selected.some((file) => !ALLOWED_PRODUCT_IMAGE_TYPES.has(file?.type))) {
    return 'Ảnh sản phẩm chỉ hỗ trợ JPG hoặc PNG.';
  }

  const oversized = selected.find((file) => Number(file?.size) > MAX_PRODUCT_IMAGE_SIZE);
  if (oversized) {
    return `Ảnh “${oversized.name}” vượt quá giới hạn 5MB.`;
  }

  return '';
};

export const validateReplacementImageCount = (files = []) => {
  const count = Array.from(files || []).length;
  if (count > 0 && count < MIN_PRODUCT_IMAGES) {
    return `Vui lòng chọn ít nhất ${MIN_PRODUCT_IMAGES} ảnh khi thay bộ ảnh sản phẩm.`;
  }
  if (count > MAX_PRODUCT_IMAGES) {
    return `Mỗi sản phẩm chỉ được tải tối đa ${MAX_PRODUCT_IMAGES} ảnh.`;
  }
  return '';
};
