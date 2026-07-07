/**
 * Shared product filter/label maps — used by the public product catalog
 * and the product detail page so both stay in sync.
 */

export const CATEGORY_LABEL = {
  rice: 'Lúa gạo', vegetable: 'Rau củ', fruit: 'Trái cây',
  coffee: 'Cà phê', spice: 'Hồ tiêu / Gia vị', tea: 'Trà',
  grain: 'Ngũ cốc', other: 'Khác',
};

export const REGION_LABEL = {
  north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam',
};

export const TYPE_LABEL = {
  fresh: 'Tươi', dried: 'Khô', processed: 'Đã sơ chế',
};

const toOptions = (labelMap) =>
  Object.entries(labelMap).map(([value, label]) => ({ value, label }));

export const CATEGORY_OPTIONS = toOptions(CATEGORY_LABEL);
export const REGION_OPTIONS = toOptions(REGION_LABEL);
export const TYPE_OPTIONS = toOptions(TYPE_LABEL);
