import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiSave,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import productService, { resolveImageUrl } from '../../../services/product.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { CATEGORY_OPTIONS, REGION_OPTIONS, TYPE_OPTIONS } from '../../../constants/product';
import './FarmerCreateProduct.css';
import { toLocalDateInputValue } from '../../../utils/date';
import {
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  getProductImagePaths,
  validateProductImageFiles,
  validateReplacementImageCount,
} from '../../../utils/productImages';
import './FarmerEditProduct.css';

const UNITS = ['kg', 'Tạ', 'Tấn'];
const COVERAGE_PRESETS = [25, 50, 75, 100];
const MAX_CERT_FILES = 10;
const MAX_CERT_SIZE = 5 * 1024 * 1024;
const ALLOWED_CERT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const buildForm = (product) => ({
  name: product?.name || '',
  category: product?.category || '',
  region: product?.region || '',
  type: product?.type || '',
  variety: product?.variety || '',
  area: product?.area ?? '',
  priceMin: product?.priceMin ?? '',
  priceMax: product?.priceMax ?? '',
  unit: product?.unit || 'kg',
  priceUnit: product?.priceUnit || product?.unit || 'kg',
  totalQuantity: product?.totalQuantity ?? '',
  coverageRate: Number.isFinite(Number(product?.coverageRate)) ? Number(product.coverageRate) : 50,
  plantDate: product?.plantDate ? product.plantDate.slice(0, 10) : '',
  expectedDate: product?.expectedDate ? product.expectedDate.slice(0, 10) : '',
  description: product?.description || '',
  nutritionInfo: product?.nutritionInfo || '',
  note: product?.note || '',
});

const normalizeCertifications = (certifications = []) =>
  certifications.map((certification, index) => {
    if (typeof certification === 'string') {
      return {
        id: `existing-${index}`,
        value: certification,
        fileUrl: '',
      };
    }

    return {
      id: certification?.id ?? `existing-${index}`,
      value: certification?.value || certification?.name || `Chứng chỉ ${index + 1}`,
      fileUrl: certification?.fileUrl || '',
    };
  });

const certificationFileName = (fileName = '') =>
  fileName.replace(/\.[^/.]+$/, '').trim() || 'Chứng chỉ mới';

export default function FarmerEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const imageInputRef = useRef(null);
  const certInputRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(buildForm(null));
  const [currentImagePaths, setCurrentImagePaths] = useState([]);
  const [replacementImages, setReplacementImages] = useState([]);
  const [replacementPreviews, setReplacementPreviews] = useState([]);
  const [existingCertifications, setExistingCertifications] = useState([]);
  const [newCertifications, setNewCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    productService
      .getProductById(id)
      .then((data) => {
        if (!active) return;

        const nextProduct = data?.data?.product || data?.data || data;
        setProduct(nextProduct);
        setForm(buildForm(nextProduct));
        setCurrentImagePaths(getProductImagePaths(nextProduct));
        setReplacementImages([]);
        setExistingCertifications(normalizeCertifications(nextProduct?.certifications));
      })
      .catch(() => {
        if (active) setError('Không thể tải thông tin sản phẩm.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const previews = replacementImages.map((file) => URL.createObjectURL(file));
    setReplacementPreviews(previews);

    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [replacementImages]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateExistingCertificateName = (index, value) => {
    setExistingCertifications((prev) =>
      prev.map((certification, certIndex) =>
        certIndex === index ? { ...certification, value } : certification
      )
    );
  };

  const removeExistingCertificate = (index) => {
    setExistingCertifications((prev) => prev.filter((_, certIndex) => certIndex !== index));
  };

  const updateNewCertificateName = (index, value) => {
    setNewCertifications((prev) =>
      prev.map((certification, certIndex) =>
        certIndex === index ? { ...certification, value } : certification
      )
    );
  };

  const removeNewCertificate = (index) => {
    setNewCertifications((prev) => prev.filter((_, certIndex) => certIndex !== index));
  };

  const handleReplacementImages = (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const nextImages = [...replacementImages, ...selectedFiles];
    const validationError = validateProductImageFiles(nextImages);
    if (validationError) {
      toast.error(validationError);
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    setReplacementImages(nextImages);
    setError('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeReplacementImage = (index) => {
    setReplacementImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const cancelImageReplacement = () => {
    setReplacementImages([]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleCertificateFiles = (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const invalidType = selectedFiles.find((file) => !ALLOWED_CERT_TYPES.includes(file.type));
    if (invalidType) {
      toast.error('Chứng chỉ chỉ hỗ trợ PDF, JPG hoặc PNG.');
      return;
    }

    const oversized = selectedFiles.find((file) => file.size > MAX_CERT_SIZE);
    if (oversized) {
      toast.error(`File “${oversized.name}” vượt quá giới hạn 5MB.`);
      return;
    }

    const remainingSlots = Math.max(
      0,
      MAX_CERT_FILES - existingCertifications.length - newCertifications.length
    );

    if (remainingSlots === 0) {
      toast.warning(`Mỗi sản phẩm chỉ nên có tối đa ${MAX_CERT_FILES} chứng chỉ.`);
      return;
    }

    const accepted = selectedFiles.slice(0, remainingSlots).map((file) => ({
      file,
      value: certificationFileName(file.name),
    }));

    if (accepted.length < selectedFiles.length) {
      toast.warning(`Chỉ thêm ${accepted.length} file để không vượt quá ${MAX_CERT_FILES} chứng chỉ.`);
    }

    setNewCertifications((prev) => [...prev, ...accepted]);

    if (certInputRef.current) {
      certInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.category || !form.region || !form.type) {
      setError('Vui lòng điền đầy đủ tên sản phẩm, loại nông sản, vùng miền và hình thức.');
      return;
    }

    const replacementImageError = validateReplacementImageCount(replacementImages);
    if (replacementImageError) {
      setError(replacementImageError);
      return;
    }

    if (
      form.priceMin !== '' &&
      form.priceMax !== '' &&
      Number(form.priceMin) > Number(form.priceMax)
    ) {
      setError('Giá tối thiểu không được lớn hơn giá tối đa.');
      return;
    }

    const today = toLocalDateInputValue();
    if (form.expectedDate) {
      if (form.expectedDate < today) {
        setError('Ngày thu hoạch không được trước ngày hiện tại.');
        return;
      }

      if (form.plantDate && form.expectedDate < form.plantDate) {
        setError('Ngày thu hoạch không được trước ngày gieo trồng.');
        return;
      }
    }

    const invalidExistingName = existingCertifications.some(
      (certification) => !certification.value.trim()
    );
    const invalidNewName = newCertifications.some((certification) => !certification.value.trim());

    if (invalidExistingName || invalidNewName) {
      setError('Tên chứng chỉ không được để trống.');
      return;
    }

    const payload = new FormData();

    payload.append('name', form.name.trim());
    payload.append('category', form.category);
    payload.append('region', form.region);
    payload.append('type', form.type);
    payload.append('unit', form.unit);
    payload.append('priceUnit', form.priceUnit);

    // Gửi cả chuỗi rỗng để người dùng có thể xóa dữ liệu tùy chọn đã nhập trước đó.
    payload.append('variety', form.variety.trim());
    payload.append('area', form.area === '' ? '' : String(Number(form.area)));
    payload.append('priceMin', form.priceMin === '' ? '' : String(Number(form.priceMin)));
    payload.append('priceMax', form.priceMax === '' ? '' : String(Number(form.priceMax)));
    payload.append(
      'totalQuantity',
      form.totalQuantity === '' ? '' : String(Number(form.totalQuantity))
    );
    payload.append('coverageRate', String(Number(form.coverageRate)));
    payload.append('plantDate', form.plantDate || '');
    payload.append('expectedDate', form.expectedDate || '');
    payload.append('description', form.description.trim());
    payload.append('nutritionInfo', form.nutritionInfo.trim());
    payload.append('note', form.note.trim());

    // Luôn gửi danh sách chứng chỉ cũ còn giữ lại. Nếu mảng rỗng, BE sẽ xóa hết chứng chỉ cũ.
    payload.append(
      'existingCertifications',
      JSON.stringify(
        existingCertifications.map(({ value, fileUrl }) => ({
          value: value.trim(),
          fileUrl,
        }))
      )
    );

    // Tên chứng chỉ mới phải cùng thứ tự với các file certifications gửi lên.
    payload.append(
      'certificationNames',
      JSON.stringify(newCertifications.map((certification) => certification.value.trim()))
    );

    newCertifications.forEach(({ file }) => {
      payload.append('certifications', file);
    });

    // Backend chỉ thay ảnh khi request có field images. Không chọn ảnh mới = giữ nguyên ảnh cũ.
    replacementImages.forEach((file) => {
      payload.append('images', file);
    });

    setSaving(true);

    try {
      await productService.updateProduct(id, payload);
      toast.success('Cập nhật sản phẩm thành công');
      navigate(`/farmer/crops/${id}`);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Cập nhật sản phẩm thất bại, vui lòng thử lại.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const backToProduct = () => navigate(`/farmer/crops/${id}`);

  if (loading) {
    return (
      <div className="fep-page fep-page--loading">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  if (!product || (user && product.createdBy !== user.id)) {
    return (
      <div className="fep-page">
        <button type="button" className="fep-back-button" onClick={() => navigate('/farmer/crops')}>
          <FiArrowLeft /> Quay lại mùa vụ của tôi
        </button>

        <div className="fep-empty-card">
          <span>⚠️</span>
          <strong>Không thể chỉnh sửa sản phẩm này</strong>
          <p>Sản phẩm không tồn tại hoặc không thuộc về bạn.</p>
          <button type="button" className="fcp-nav__submit" onClick={() => navigate('/farmer/crops')}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fep-page">
      <div className="fep-page-nav">
        <button type="button" className="fep-back-button" onClick={backToProduct}>
          <FiArrowLeft />
          <span>Quay lại sản phẩm</span>
        </button>
      </div>

      <div className="fep-breadcrumb" aria-label="Điều hướng chỉnh sửa sản phẩm">
        <button type="button" onClick={() => navigate('/farmer')}>Dashboard</button>
        <span>/</span>
        <button type="button" onClick={() => navigate('/farmer/crops')}>Mùa vụ của tôi</button>
        <span>/</span>
        <strong>{product.name}</strong>
      </div>

      <div className="fep-heading">
        <span className="fep-heading__eyebrow">QUẢN LÝ MÙA VỤ</span>
        <h1>Chỉnh sửa sản phẩm</h1>
        <p>Cập nhật thông tin nông sản, giá bán và chứng chỉ trong cùng một màn hình.</p>
      </div>

      <section className="fep-surface">
        <form className="fep-form" onSubmit={handleSubmit}>
        <section className="fcp-card fep-card">
          <div className="fcp-card__head">
            <span className="fcp-card__icon">🌿</span>
            <div>
              <div className="fcp-card__title">Thông tin cơ bản</div>
              <div className="fcp-card__sub">Tên, nhóm nông sản, vùng miền và hình thức sản phẩm</div>
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Tên / Loại nông sản <span className="fcp-required">*</span></label>
            <input
              className="fcp-input"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Nhập tên sản phẩm"
            />
          </div>

          <div className="fep-option-row">
            <div className="fcp-field">
              <label>Loại nông sản <span className="fcp-required">*</span></label>
              <div className="fcp-btn-group">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    className={`fcp-btn-region ${
                      form.category === category.value ? 'fcp-btn-region--active' : ''
                    }`}
                    onClick={() => set('category', category.value)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fcp-field">
              <label>Vùng miền <span className="fcp-required">*</span></label>
              <div className="fcp-btn-group">
                {REGION_OPTIONS.map((region) => (
                  <button
                    key={region.value}
                    type="button"
                    className={`fcp-btn-region ${
                      form.region === region.value ? 'fcp-btn-region--active' : ''
                    }`}
                    onClick={() => set('region', region.value)}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Hình thức <span className="fcp-required">*</span></label>
            <div className="fcp-btn-group">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`fcp-btn-region ${
                    form.type === type.value ? 'fcp-btn-region--active' : ''
                  }`}
                  onClick={() => set('type', type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fcp-row">
            <div className="fcp-field">
              <label>Giống / Phân loại</label>
              <input
                className="fcp-input"
                value={form.variety}
                onChange={(event) => set('variety', event.target.value)}
                placeholder="VD: ST25, Hắc Mỹ Nhân..."
              />
            </div>

            <div className="fcp-field">
              <label>Diện tích canh tác (ha)</label>
              <div className="fcp-input-suffix">
                <input
                  className="fcp-input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.area}
                  onChange={(event) => set('area', event.target.value)}
                />
                <span>ha</span>
              </div>
            </div>
          </div>
        </section>

        <div className="fep-two-column">
          <section className="fcp-card fep-card">
            <div className="fcp-card__head">
              <span className="fcp-card__icon">💲</span>
              <div>
                <div className="fcp-card__title">Sản lượng và giá</div>
                <div className="fcp-card__sub">Số lượng, mức giá và thời gian thu hoạch</div>
              </div>
            </div>

            <div className="fcp-field fcp-field--full">
              <label>Sản lượng ước tính</label>
              <div className="fcp-input-suffix">
                <input
                  className="fcp-input"
                  type="number"
                  min="0"
                  value={form.totalQuantity}
                  onChange={(event) => set('totalQuantity', event.target.value)}
                />
                <select
                  className="fcp-select-inline"
                  value={form.unit}
                  onChange={(event) => set('unit', event.target.value)}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit.toLowerCase()}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="fcp-field fcp-field--full">
              <label>Đơn vị tính giá</label>
              <div className="fcp-btn-group">
                {UNITS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    className={`fcp-btn-region ${
                      form.priceUnit === unit.toLowerCase() ? 'fcp-btn-region--active' : ''
                    }`}
                    onClick={() => set('priceUnit', unit.toLowerCase())}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            <div className="fcp-row">
              <div className="fcp-field">
                <label>Giá tối thiểu</label>
                <div className="fcp-input-suffix">
                  <input
                    className="fcp-input"
                    type="number"
                    min="0"
                    value={form.priceMin}
                    onChange={(event) => set('priceMin', event.target.value)}
                  />
                  <span>VNĐ/{form.priceUnit}</span>
                </div>
              </div>

              <div className="fcp-field">
                <label>Giá tối đa</label>
                <div className="fcp-input-suffix">
                  <input
                    className="fcp-input"
                    type="number"
                    min="0"
                    value={form.priceMax}
                    onChange={(event) => set('priceMax', event.target.value)}
                  />
                  <span>VNĐ/{form.priceUnit}</span>
                </div>
              </div>
            </div>

            <div className="fcp-field fcp-field--full">
              <div className="fcp-coverage-head">
                <label>Tỉ lệ bao tiêu tối thiểu chấp nhận</label>
                <strong>{form.coverageRate}%</strong>
              </div>
              <div className="fcp-coverage-control">
                <input
                  className="fcp-coverage-range"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.coverageRate}
                  onChange={(event) => set('coverageRate', Number(event.target.value))}
                  aria-label="Tỉ lệ bao tiêu tối thiểu"
                />
                <div className="fcp-btn-group fcp-coverage-presets">
                  {COVERAGE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`fcp-btn-region ${form.coverageRate === preset ? 'fcp-btn-region--active' : ''}`}
                      onClick={() => set('coverageRate', preset)}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
              <span className="fcp-hint">Tỉ lệ tối thiểu sản lượng bạn mong muốn doanh nghiệp cam kết thu mua.</span>
            </div>

            <div className="fcp-row">
              <div className="fcp-field">
                <label>Ngày bắt đầu gieo / trồng</label>
                <input
                  className="fcp-input"
                  type="date"
                  value={form.plantDate}
                  onChange={(event) => set('plantDate', event.target.value)}
                />
              </div>

              <div className="fcp-field">
                <label>Ngày thu hoạch dự kiến</label>
                <input
                  className="fcp-input"
                  type="date"
                  value={form.expectedDate}
                  onChange={(event) => set('expectedDate', event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="fcp-card fep-card">
            <div className="fcp-card__head">
              <span className="fcp-card__icon">📝</span>
              <div>
                <div className="fcp-card__title">Mô tả chi tiết</div>
                <div className="fcp-card__sub">Thông tin giúp doanh nghiệp hiểu rõ sản phẩm hơn</div>
              </div>
            </div>

            <div className="fcp-field fcp-field--full">
              <label>Mô tả sản phẩm</label>
              <textarea
                className="fcp-input fep-textarea"
                rows={4}
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="Mô tả chất lượng, đặc điểm vùng trồng..."
              />
            </div>

            <div className="fcp-field fcp-field--full">
              <label>Thông tin dinh dưỡng</label>
              <textarea
                className="fcp-input fep-textarea"
                rows={4}
                value={form.nutritionInfo}
                onChange={(event) => set('nutritionInfo', event.target.value)}
                placeholder="Thông tin dinh dưỡng nổi bật của sản phẩm..."
              />
            </div>

            <div className="fcp-field fcp-field--full">
              <label>Ghi chú</label>
              <textarea
                className="fcp-input fep-textarea fep-textarea--small"
                rows={2}
                value={form.note}
                onChange={(event) => set('note', event.target.value)}
                placeholder="Ghi chú thêm nếu có..."
              />
            </div>
          </section>
        </div>

        <section className="fcp-card fep-card fep-image-card">
          <div className="fcp-card__head">
            <span className="fcp-card__icon"><FiImage /></span>
            <div>
              <div className="fcp-card__title">Hình ảnh sản phẩm</div>
              <div className="fcp-card__sub">
                Xem ảnh đang sử dụng hoặc chọn một bộ ảnh mới để thay thế toàn bộ
              </div>
            </div>
          </div>

          <div className="fep-image-notice">
            <FiCheckCircle />
            <span>
              Nếu không chọn ảnh mới, hệ thống sẽ giữ nguyên bộ ảnh hiện tại. Khi lưu bộ ảnh
              mới, ảnh đầu tiên sẽ trở thành ảnh chính.
            </span>
          </div>

          <div className="fep-image-section">
            <div className="fep-image-section__head">
              <div>
                <strong>Ảnh hiện tại</strong>
                <span>{currentImagePaths.length} ảnh đang hiển thị</span>
              </div>
            </div>

            {currentImagePaths.length > 0 ? (
              <div className="fep-image-grid">
                {currentImagePaths.map((path, index) => (
                  <div className="fep-image-thumb" key={`${path}-${index}`}>
                    <img
                      src={resolveImageUrl(path) || path}
                      alt={`${product.name} ${index + 1}`}
                      loading="lazy"
                    />
                    {index === 0 && <span className="fep-image-cover">Ảnh chính hiện tại</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="fep-image-empty">
                <FiImage />
                <span>Sản phẩm chưa có hình ảnh.</span>
              </div>
            )}
          </div>

          <div className="fep-image-section fep-image-section--replacement">
            <div className="fep-image-section__head">
              <div>
                <strong>Bộ ảnh thay thế</strong>
                <span>JPG, PNG · tối đa 5MB/ảnh · từ {MIN_PRODUCT_IMAGES} đến {MAX_PRODUCT_IMAGES} ảnh</span>
              </div>
              {replacementImages.length > 0 && (
                <button type="button" onClick={cancelImageReplacement}>
                  <FiX /> Hủy thay ảnh
                </button>
              )}
            </div>

            {replacementImages.length > 0 && (
              <div className="fep-image-grid fep-image-grid--replacement">
                {replacementImages.map((file, index) => (
                  <div className="fep-image-thumb fep-image-thumb--replacement" key={`${file.name}-${file.lastModified}-${index}`}>
                    <img src={replacementPreviews[index]} alt={`Ảnh thay thế ${index + 1}`} />
                    {index === 0 && <span className="fep-image-cover">Ảnh chính mới</span>}
                    <button
                      type="button"
                      className="fep-image-remove"
                      onClick={() => removeReplacementImage(index)}
                      aria-label={`Bỏ ảnh thay thế ${index + 1}`}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className="fep-image-upload"
              onClick={() => imageInputRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                handleReplacementImages(event.dataTransfer.files);
              }}
              onDragOver={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') imageInputRef.current?.click();
              }}
              role="button"
              tabIndex={0}
              aria-label="Chọn bộ ảnh sản phẩm thay thế"
            >
              <FiCamera size={27} />
              <div>
                <strong>
                  {replacementImages.length > 0 ? 'Thêm ảnh vào bộ ảnh mới' : 'Chọn bộ ảnh thay thế'}
                </strong>
                <span>Kéo thả hoặc nhấn để chọn nhiều ảnh cùng lúc</span>
              </div>
              <small>{replacementImages.length}/{MAX_PRODUCT_IMAGES} ảnh</small>
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                multiple
                hidden
                onChange={(event) => handleReplacementImages(event.target.files)}
              />
            </div>

            {replacementImages.length > 0 && (
              <div className={`fep-image-status ${replacementImages.length >= MIN_PRODUCT_IMAGES ? 'is-ready' : ''}`}>
                {replacementImages.length >= MIN_PRODUCT_IMAGES ? (
                  <><FiCheckCircle /> Bộ ảnh mới đã sẵn sàng để lưu.</>
                ) : (
                  <><FiAlertTriangle /> Cần thêm {MIN_PRODUCT_IMAGES - replacementImages.length} ảnh để thay bộ ảnh hiện tại.</>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="fcp-card fep-card fep-cert-card">
          <div className="fcp-card__head">
            <span className="fcp-card__icon">📄</span>
            <div>
              <div className="fcp-card__title">Chứng chỉ & kiểm định</div>
              <div className="fcp-card__sub">
                Giữ, đổi tên, xóa chứng chỉ hiện có hoặc bổ sung file mới
              </div>
            </div>
          </div>

          <div className="fep-cert-summary">
            <div>
              <strong>{existingCertifications.length + newCertifications.length}</strong>
              <span>chứng chỉ sau khi lưu</span>
            </div>
            <small>PDF, JPG, PNG · tối đa 5MB/file · tối đa {MAX_CERT_FILES} file</small>
          </div>

          {existingCertifications.length > 0 && (
            <div className="fep-cert-section">
              <div className="fep-cert-section__title">
                <FiCheckCircle /> Chứng chỉ hiện tại
              </div>

              <div className="fep-cert-list">
                {existingCertifications.map((certification, index) => (
                  <div className="fep-cert-item" key={certification.id}>
                    <div className="fep-cert-item__icon"><FiFileText /></div>
                    <div className="fep-cert-item__body">
                      <input
                        className="fcp-input"
                        value={certification.value}
                        onChange={(event) =>
                          updateExistingCertificateName(index, event.target.value)
                        }
                        aria-label={`Tên chứng chỉ ${index + 1}`}
                      />
                      <div className="fep-cert-item__meta">
                        <span>File hiện tại được giữ nguyên nếu bạn không xóa.</span>
                        {certification.fileUrl && (
                          <a
                            href={resolveImageUrl(certification.fileUrl) || certification.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FiExternalLink /> Xem file
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="fep-cert-remove"
                      onClick={() => removeExistingCertificate(index)}
                      title="Xóa chứng chỉ"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="fep-cert-section">
            <div className="fep-cert-section__title">
              <FiUploadCloud /> Bổ sung chứng chỉ mới
            </div>

            <button
              type="button"
              className="fep-cert-upload"
              onClick={() => certInputRef.current?.click()}
              disabled={existingCertifications.length + newCertifications.length >= MAX_CERT_FILES}
            >
              <FiUploadCloud size={24} />
              <div>
                <strong>Chọn file chứng chỉ</strong>
                <span>Bạn có thể chọn nhiều file cùng lúc</span>
              </div>
            </button>

            <input
              ref={certInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              hidden
              onChange={(event) => handleCertificateFiles(event.target.files)}
            />

            {newCertifications.length > 0 && (
              <div className="fep-cert-list fep-cert-list--new">
                {newCertifications.map((certification, index) => (
                  <div className="fep-cert-item fep-cert-item--new" key={`${certification.file.name}-${index}`}>
                    <div className="fep-cert-item__icon"><FiFileText /></div>
                    <div className="fep-cert-item__body">
                      <input
                        className="fcp-input"
                        value={certification.value}
                        onChange={(event) => updateNewCertificateName(index, event.target.value)}
                        aria-label={`Tên chứng chỉ mới ${index + 1}`}
                      />
                      <div className="fep-cert-item__meta">
                        <span>
                          {certification.file.name} · {(certification.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="fep-cert-remove"
                      onClick={() => removeNewCertificate(index)}
                      title="Bỏ file mới"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="fcp-error fep-error">
            <FiAlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="fep-actions">
          <button type="button" className="fcp-nav__back" onClick={backToProduct} disabled={saving}>
            <FiArrowLeft /> Hủy
          </button>

          <button type="submit" className="fcp-nav__submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang lưu...
              </>
            ) : (
              <>
                <FiSave /> Lưu thay đổi
              </>
            )}
          </button>
        </div>
        </form>
      </section>
    </div>
  );
}
