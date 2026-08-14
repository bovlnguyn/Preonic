import { validationResult } from 'express-validator';
import { validatePublicProductList } from '../middlewares/validation';

const runProductListValidators = async (query: Record<string, unknown>) => {
  const req: any = { query };

  // Middleware cuối là handleValidationErrors; ở unit test chỉ cần chạy
  // ValidationChain để kiểm tra các query có được coi là hợp lệ hay không.
  for (const validator of validatePublicProductList.slice(0, -1) as any[]) {
    await validator.run(req);
  }

  return validationResult(req).array();
};

describe('Product list filter validation', () => {
  it('coi filter chuỗi rỗng là không lọc', async () => {
    const errors = await runProductListValidators({
      category: '',
      region: '',
      type: '',
      search: '',
      page: '1',
      limit: '6',
    });

    expect(errors).toHaveLength(0);
  });

  it('vẫn chặn enum filter sai thật sự', async () => {
    const errors = await runProductListValidators({
      category: 'invalid-category',
      region: 'central',
      page: '1',
      limit: '6',
    });

    expect(errors.map((error) => error.msg)).toContain('Loại nông sản không hợp lệ');
  });
});
