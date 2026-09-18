import {
  MAX_PRODUCT_IMAGE_SIZE,
  getProductImagePaths,
  validateProductImageFiles,
  validateReplacementImageCount,
} from './productImages';

const imageFile = (name, type = 'image/jpeg', size = 1024) => ({ name, type, size });

describe('getProductImagePaths', () => {
  test('reads the primary image and JSON gallery without duplicates', () => {
    expect(
      getProductImagePaths({
        image: 'https://cdn.example.com/main.jpg',
        images: JSON.stringify([
          'https://cdn.example.com/main.jpg',
          'https://cdn.example.com/detail.png',
        ]),
      })
    ).toEqual([
      'https://cdn.example.com/main.jpg',
      'https://cdn.example.com/detail.png',
    ]);
  });

  test('supports legacy single-image strings and ignores malformed data', () => {
    expect(getProductImagePaths({ images: 'https://cdn.example.com/legacy.jpg' })).toEqual([
      'https://cdn.example.com/legacy.jpg',
    ]);
    expect(getProductImagePaths({ images: '{invalid json' })).toEqual([]);
  });
});

describe('validateProductImageFiles', () => {
  test('accepts JPG and PNG files within the limit', () => {
    expect(
      validateProductImageFiles([
        imageFile('one.jpg'),
        imageFile('two.png', 'image/png'),
        imageFile('three.jpeg'),
      ])
    ).toBe('');
  });

  test('rejects unsupported file types', () => {
    expect(validateProductImageFiles([imageFile('crop.webp', 'image/webp')])).toBe(
      'Ảnh sản phẩm chỉ hỗ trợ JPG hoặc PNG.'
    );
  });

  test('rejects files larger than 5 MB', () => {
    expect(
      validateProductImageFiles([
        imageFile('large.jpg', 'image/jpeg', MAX_PRODUCT_IMAGE_SIZE + 1),
      ])
    ).toBe('Ảnh “large.jpg” vượt quá giới hạn 5MB.');
  });

  test('rejects galleries larger than 10 images', () => {
    const files = Array.from({ length: 11 }, (_, index) => imageFile(`${index}.jpg`));
    expect(validateProductImageFiles(files)).toBe('Mỗi sản phẩm chỉ được tải tối đa 10 ảnh.');
  });
});

describe('validateReplacementImageCount', () => {
  test('keeps existing images when no replacement image is selected', () => {
    expect(validateReplacementImageCount([])).toBe('');
  });

  test('requires at least three images when replacing the gallery', () => {
    expect(validateReplacementImageCount([imageFile('one.jpg'), imageFile('two.jpg')])).toBe(
      'Vui lòng chọn ít nhất 3 ảnh khi thay bộ ảnh sản phẩm.'
    );
  });

  test('accepts a replacement gallery from three to ten images', () => {
    expect(
      validateReplacementImageCount([
        imageFile('one.jpg'),
        imageFile('two.jpg'),
        imageFile('three.jpg'),
      ])
    ).toBe('');
  });
});
