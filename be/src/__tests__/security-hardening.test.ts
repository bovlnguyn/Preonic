import { sendError } from '../utils/controller.util';
import { detectFileKind, validateFileSignature } from '../middlewares/uploads.middlewares';

const makeFile = (buffer: Buffer, mimetype: string, originalname: string) => ({
  fieldname: 'file',
  originalname,
  encoding: '7bit',
  mimetype,
  size: buffer.length,
  destination: '',
  filename: '',
  path: '',
  buffer,
}) as Express.Multer.File;

describe('Fix 07 security hardening', () => {
  test('does not expose unexpected 5xx database/provider messages to the client', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res: any = { status, locals: {} };
    const err: any = new Error("Invalid column name 'SecretColumn' SELECT * FROM Users");

    sendError(res, err, 'Không thể xử lý yêu cầu');

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Không thể xử lý yêu cầu',
    });
    expect(res.locals.apiError).toBe(err);
  });

  test('does not expose a raw error merely because a controller uses a 4xx fallback status', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res: any = { status, locals: {} };
    const err: any = new Error('SQL connection string leaked here');

    sendError(res, err, 'Refresh token thất bại', 401);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Refresh token thất bại',
    });
  });

  test('keeps business 4xx messages/codes for the frontend', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res: any = { status, locals: {} };
    const err: any = new Error('Sản phẩm không tồn tại');
    err.statusCode = 404;
    err.code = 'PRODUCT_NOT_FOUND';

    sendError(res, err, 'Lấy sản phẩm thất bại');

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      code: 'PRODUCT_NOT_FOUND',
      message: 'Sản phẩm không tồn tại',
    });
  });

  test('detects JPEG/PNG/PDF by magic bytes', () => {
    expect(detectFileKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('jpeg');
    expect(detectFileKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(detectFileKind(Buffer.from('%PDF-1.7\n'))).toBe('pdf');
    expect(detectFileKind(Buffer.from('plain text pretending to be image'))).toBeNull();
  });

  test('rejects a spoofed MIME type and mismatching extension', () => {
    const fakeJpeg = makeFile(Buffer.from('%PDF-1.7\n'), 'image/jpeg', 'photo.jpg');
    expect(() => validateFileSignature(fakeJpeg)).toThrow(/không khớp/i);

    const jpegWithPdfName = makeFile(
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]),
      'image/jpeg',
      'photo.pdf'
    );
    expect(() => validateFileSignature(jpegWithPdfName)).toThrow(/Phần mở rộng/i);
  });

  test('avatar rejects PDF even when the PDF signature is valid', () => {
    const pdf = makeFile(Buffer.from('%PDF-1.7\n'), 'application/pdf', 'avatar.pdf');
    expect(() => validateFileSignature(pdf, { avatarOnly: true })).toThrow(/Ảnh đại diện/i);
  });
});
