import React, { useEffect, useState, useRef } from 'react';
import { toLocalDateInputValue } from '../../../utils/date';
import './FarmerCreateProduct.css';
import { useNavigate } from 'react-router-dom';
import {
  FiCheckCircle, FiArrowLeft, FiArrowRight,
  FiCamera, FiFileText, FiX, FiMapPin, FiAlertTriangle,
} from 'react-icons/fi';
import productService from '../../../services/product.service';
import { useAuth } from '../../../contexts/AuthContext';

// Phải khớp với User.isProfileComplete() ở backend (be/src/models/User.entity.ts)
const isFarmerProfileComplete = (user) =>
  Boolean(
    user?.firstName?.trim() &&
    user?.lastName?.trim() &&
    user?.phone?.trim() &&
    user?.province?.trim() &&
    user?.district?.trim() &&
    user?.address?.trim() &&
    user?.farmName?.trim()
  );

// ── Dữ liệu tĩnh ─────────────────────────────────────────
const REGIONS = ['Miền Bắc', 'Miền Trung', 'Miền Nam'];
const UNITS = ['kg', 'Tạ', 'Tấn'];
const COVERAGE_PRESETS = [25, 50, 75, 100];
const MAX_IMAGES = 10;
const MIN_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CERT_FILES = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_CERT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

// Map region hiển thị (tiếng Việt) sang giá trị enum backend yêu cầu
const REGION_MAP = {
  'Miền Bắc': 'north',
  'Miền Trung': 'central',
  'Miền Nam': 'south',
};

// Loại nông sản (bắt buộc — backend yêu cầu dto.category)
const CATEGORIES = [
  { value: 'rice', label: 'Lúa gạo' },
  { value: 'fruit', label: 'Trái cây' },
  { value: 'vegetable', label: 'Rau củ' },
  { value: 'coffee', label: 'Cà phê' },
  { value: 'tea', label: 'Chè' },
  { value: 'spice', label: 'Gia vị' },
  { value: 'grain', label: 'Ngũ cốc' },
  { value: 'other', label: 'Khác' },
];

// Hình thức sản phẩm (bắt buộc — backend yêu cầu dto.type)
const TYPES = [
  { value: 'fresh', label: 'Tươi' },
  { value: 'dried', label: 'Khô' },
  { value: 'processed', label: 'Đã sơ chế' },
];

const STEPS = [
  { key: 'product',  label: 'Sản phẩm',      sub: 'Tên và loại cây trồng',     icon: '🌿' },
  { key: 'season',   label: 'Mùa vụ',         sub: 'Thời vụ và sản lượng',      icon: '📅' },
  { key: 'pricing',  label: 'Giá & Bao tiêu', sub: 'Mức giá và điều kiện',      icon: '💲' },
  { key: 'media',    label: 'Chứng chỉ & Ảnh', sub: 'Giấy tờ và hình ảnh',     icon: '📷' },
];

const TIPS = [
  '📸 Dùng ảnh rõ nét, chụp trực tiếp tại vùng trồng',
  '✅ Bổ sung chứng nhận giúp hồ sơ sản phẩm đáng tin cậy hơn',
  '💲 Đặt mức giá phù hợp để doanh nghiệp dễ đánh giá đề xuất',
  '📅 Ghi đúng ngày thu hoạch để đối tác chủ động kế hoạch',
];

const initialForm = {
  // Bước 1
  name: '', category: '', type: '', variety: '', area: '', region: 'Miền Trung',
  // Bước 2
  plantDate: '', harvestDate: '', quantity: '', unit: 'tấn',
  // Bước 3
  priceUnit: 'kg', price: '', coverageRate: 50,
  // Bước 4
  images: [], certFiles: [],
};

// ── Helper ────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

const toKg = (quantity, unit) => {
  const value = Number(quantity || 0);
  if (unit === 'tấn') return value * 1000;
  if (unit === 'tạ') return value * 100;
  return value;
};

const estimateTotalValue = (totalKg, price, priceUnit) => {
  const priceNum = Number(price || 0);
  if (!totalKg || !priceNum) return 0;

  if (priceUnit === 'tấn') return (totalKg / 1000) * priceNum;
  if (priceUnit === 'tạ') return (totalKg / 100) * priceNum;
  return totalKg * priceNum;
};

const stripExtension = (fileName = '') =>
  fileName.replace(/\.[^/.]+$/, '').trim() || 'Chứng chỉ';

function LocalImagePreview({ file, alt = '' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!file) {
      setSrc('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!src) return null;
  return <img src={src} alt={alt} />;
}

function StepIndicator({ current }) {
  return (
    <div className="fcp-steps">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.key}>
            <div className={`fcp-step ${active ? 'fcp-step--active' : ''} ${done ? 'fcp-step--done' : ''}`}>
              <div className="fcp-step__circle">
                {done ? <FiCheckCircle size={16} /> : <span>{s.icon}</span>}
              </div>
              <div className="fcp-step__info">
                <div className="fcp-step__label">{s.label}</div>
                <div className="fcp-step__sub">{s.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`fcp-step__line ${done ? 'fcp-step__line--done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Preview({ form }) {
  const totalKg = toKg(form.quantity, form.unit);
  const priceNum = Number(form.price || 0);
  const highPrice = Math.round(priceNum * 1.15);
  const totalValue = estimateTotalValue(totalKg, priceNum, form.priceUnit);
  const categoryLabel = CATEGORIES.find((item) => item.value === form.category)?.label;
  const typeLabel = TYPES.find((item) => item.value === form.type)?.label;

  const completedFields = [
    form.name,
    form.category,
    form.type,
    form.region,
    form.quantity,
    form.price,
    form.harvestDate,
    form.images.length >= MIN_IMAGES ? 'images' : '',
  ].filter(Boolean).length;
  const completion = Math.round((completedFields / 8) * 100);

  return (
    <aside className="fcp-preview" aria-label="Xem trước sản phẩm">
      <div className="fcp-preview__header">
        <div>
          <span>XEM TRƯỚC</span>
          <strong>Sản phẩm của bạn</strong>
        </div>
        <span className="fcp-preview__completion">{completion}%</span>
      </div>

      <div className="fcp-preview__progress" aria-label={`Mức độ hoàn thiện ${completion}%`}>
        <span style={{ width: `${completion}%` }} />
      </div>

      <div className="fcp-preview__thumb">
        {form.images.length > 0 ? (
          <LocalImagePreview file={form.images[0]} alt={form.name || 'Ảnh sản phẩm'} />
        ) : (
          <div className="fcp-preview__placeholder">
            <FiCamera size={26} />
            <span>Ảnh sản phẩm sẽ hiển thị ở đây</span>
          </div>
        )}
      </div>

      <div className="fcp-preview__content">
        <div className="fcp-preview__name">{form.name || 'Tên nông sản'}</div>

        <div className="fcp-preview__location">
          <FiMapPin size={13} />
          <span>{form.region || 'Khu vực sản xuất'}</span>
        </div>

        {priceNum > 0 ? (
          <div className="fcp-preview__price">
            {fmt(priceNum)}đ – {fmt(highPrice)}đ
            <small>/ {form.priceUnit}</small>
          </div>
        ) : (
          <div className="fcp-preview__price fcp-preview__price--empty">
            Giá bán sẽ hiển thị tại đây
          </div>
        )}

        <div className="fcp-preview__tags">
          {categoryLabel && <span className="fcp-tag">{categoryLabel}</span>}
          {typeLabel && <span className="fcp-tag">{typeLabel}</span>}
          {totalKg > 0 && <span className="fcp-tag">⚖ {fmt(totalKg)} kg</span>}
        </div>

        {totalValue > 0 && (
          <div className="fcp-preview__value">
            <div className="fcp-preview__value-label">Giá trị ước tính</div>
            <div className="fcp-preview__value-num">
              {totalValue >= 1e6
                ? `${(totalValue / 1e6).toFixed(1)} triệu VNĐ`
                : `${fmt(totalValue)} VNĐ`}
            </div>
          </div>
        )}

        <div className="fcp-preview__media-count">
          <span>📷 {form.images.length}/{MAX_IMAGES} ảnh</span>
          <span>📄 {form.certFiles.length}/{MAX_CERT_FILES} chứng chỉ</span>
        </div>
      </div>

      <div className="fcp-preview__tips">
        <div className="fcp-preview__tips-title">Mẹo tăng tỉ lệ bao tiêu</div>
        {TIPS.slice(0, 3).map((tip, index) => (
          <div key={index} className="fcp-preview__tip">{tip}</div>
        ))}
      </div>
    </aside>
  );
}

// ── Bước 1: Thông tin sản phẩm ────────────────────────────
function Step1({ form, set }) {
  return (
    <div className="fcp-card">
      <div className="fcp-card__head">
        <span className="fcp-card__icon">🌿</span>
        <div>
          <div className="fcp-card__title">Thông tin nông sản</div>
          <div className="fcp-card__sub">Nhập tên sản phẩm và thông tin cơ bản</div>
        </div>
      </div>

      <div className="fcp-field fcp-field--full">
        <label>Tên / Loại nông sản <span className="fcp-required">*</span></label>
        <input
          className="fcp-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Nhập tên đầy đủ để doanh nghiệp dễ tìm kiếm"
        />
        <span className="fcp-hint">Nhập tên đầy đủ để doanh nghiệp dễ tìm kiếm</span>
      </div>

      <div className="fcp-step1-split">
        {/* Loại nông sản — bắt buộc, backend cần dto.category */}
        <div className="fcp-field">
          <label>Loại nông sản <span className="fcp-required">*</span></label>
          <div className="fcp-btn-group">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`fcp-btn-region ${form.category === c.value ? 'fcp-btn-region--active' : ''}`}
                onClick={() => set('category', c.value)}
              >{c.label}</button>
            ))}
          </div>
          {!form.category && (
            <span className="fcp-hint">Chọn nhóm phù hợp để doanh nghiệp tìm kiếm nhanh hơn.</span>
          )}
        </div>

        <div className="fcp-field">
          <label>Khu vực sản xuất</label>
          <div className="fcp-btn-group">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`fcp-btn-region ${form.region === r ? 'fcp-btn-region--active' : ''}`}
                onClick={() => set('region', r)}
              >{r}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="fcp-step1-bottom">
        {/* Hình thức — bắt buộc, backend cần dto.type */}
        <div className="fcp-field">
          <label>Hình thức <span className="fcp-required">*</span></label>
          <div className="fcp-btn-group">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`fcp-btn-region ${form.type === t.value ? 'fcp-btn-region--active' : ''}`}
                onClick={() => set('type', t.value)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div className="fcp-field">
          <label>Giống / Phân loại</label>
          <input
            className="fcp-input"
            value={form.variety}
            onChange={(e) => set('variety', e.target.value)}
            placeholder="VD: Cát Hòa Lộc, ST25..."
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
              onChange={(e) => set('area', e.target.value)}
              placeholder="0.0"
            />
            <span>ha</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bước 2: Mùa vụ ────────────────────────────────────────
function Step2({ form, set }) {
  const totalKg = toKg(form.quantity, form.unit);

  const today = toLocalDateInputValue();

  return (
    <div className="fcp-card">
      <div className="fcp-card__head">
        <span className="fcp-card__icon">📅</span>
        <div>
          <div className="fcp-card__title">Thông tin mùa vụ</div>
          <div className="fcp-card__sub">Thời gian canh tác và sản lượng dự kiến</div>
        </div>
      </div>

      <div className="fcp-row">
        <div className="fcp-field">
          <label>Ngày bắt đầu gieo / trồng <span className="fcp-required">*</span></label>
          <input className="fcp-input" type="date" value={form.plantDate} onChange={(e) => set('plantDate', e.target.value)} />
        </div>
        <div className="fcp-field">
          <label>Ngày thu hoạch dự kiến <span className="fcp-required">*</span></label>
          <input
            className="fcp-input"
            type="date"
            min={form.plantDate && form.plantDate > today ? form.plantDate : today}
            value={form.harvestDate}
            onChange={(e) => set('harvestDate', e.target.value)}
          />
        </div>
      </div>

      <div className="fcp-field fcp-field--full">
        <label>Sản lượng ước tính <span className="fcp-required">*</span></label>
        <div className="fcp-input-suffix">
          <input
            className="fcp-input"
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
          <select className="fcp-select-inline" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u.toLowerCase()}>{u}</option>)}
          </select>
        </div>
        {totalKg > 0 && (
          <div className="fcp-convert">⚖ Tương đương <strong>{fmt(totalKg)} kg</strong></div>
        )}
        <span className="fcp-hint">Nhập sản lượng dự kiến và chọn đúng đơn vị đang sử dụng.</span>
      </div>
    </div>
  );
}

// ── Bước 3: Giá & Bao tiêu ────────────────────────────────
function Step3({ form, set }) {
  const priceNum = Number(form.price || 0);
  const highPrice = Math.round(priceNum * 1.15);
  const totalKg = toKg(form.quantity, form.unit);
  const totalValue = estimateTotalValue(totalKg, priceNum, form.priceUnit);

  return (
    <div className="fcp-card">
      <div className="fcp-card__head">
        <span className="fcp-card__icon">💲</span>
        <div>
          <div className="fcp-card__title">Giá và điều kiện bao tiêu</div>
          <div className="fcp-card__sub">Thiết lập mức giá và tỉ lệ bao tiêu mong muốn</div>
        </div>
      </div>

      <div className="fcp-row">
        <div className="fcp-field">
          <label>Đơn vị tính giá</label>
          <div className="fcp-btn-group">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                className={`fcp-btn-region ${form.priceUnit === u.toLowerCase() ? 'fcp-btn-region--active' : ''}`}
                onClick={() => set('priceUnit', u.toLowerCase())}
              >{u}</button>
            ))}
          </div>
        </div>
        <div className="fcp-field">
          <label>Giá mong muốn <span className="fcp-required">*</span></label>
          <div className="fcp-input-suffix">
            <input
              className="fcp-input"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
            />
            <span>VNĐ/{form.priceUnit}</span>
          </div>
        </div>
      </div>

      {priceNum > 0 && (
        <div className="fcp-price-info">
          💲 Ước tính tổng giá trị: <strong>{fmt(totalValue)} VNĐ</strong>
          &nbsp;· Giá niêm yết: <strong>{fmt(priceNum)}đ – {fmt(highPrice)}đ/{form.priceUnit}</strong>
        </div>
      )}

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
            onChange={(e) => set('coverageRate', Number(e.target.value))}
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
    </div>
  );
}

// ── Bước 4: Ảnh & Chứng chỉ ──────────────────────────────
function Step4({ form, set }) {
  const imgRef = useRef();
  const certRef = useRef();
  const [uploadError, setUploadError] = useState('');

  const addImages = (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    const invalidType = selected.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (invalidType) {
      setUploadError('Ảnh sản phẩm chỉ hỗ trợ JPG hoặc PNG.');
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`Ảnh “${oversized.name}” vượt quá giới hạn 5MB.`);
      return;
    }

    const remaining = Math.max(0, MAX_IMAGES - form.images.length);
    if (remaining === 0) {
      setUploadError(`Mỗi sản phẩm chỉ được tải tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    setUploadError('');
    set('images', [...form.images, ...selected.slice(0, remaining)]);

    if (imgRef.current) imgRef.current.value = '';
  };

  const removeImage = (index) => {
    set('images', form.images.filter((_, currentIndex) => currentIndex !== index));
  };

  const addCertificates = (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    const invalidType = selected.find((file) => !ALLOWED_CERT_TYPES.includes(file.type));
    if (invalidType) {
      setUploadError('Chứng chỉ chỉ hỗ trợ PDF, JPG hoặc PNG.');
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`File “${oversized.name}” vượt quá giới hạn 5MB.`);
      return;
    }

    const remaining = Math.max(0, MAX_CERT_FILES - form.certFiles.length);
    if (remaining === 0) {
      setUploadError(`Mỗi sản phẩm chỉ được tải tối đa ${MAX_CERT_FILES} chứng chỉ.`);
      return;
    }

    setUploadError('');
    set('certFiles', [...form.certFiles, ...selected.slice(0, remaining)]);

    if (certRef.current) certRef.current.value = '';
  };

  const removeCertificate = (index) => {
    set('certFiles', form.certFiles.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="fcp-card fcp-card--media">
      <div className="fcp-card__head">
        <span className="fcp-card__icon">📷</span>
        <div>
          <div className="fcp-card__title">Chứng chỉ và hình ảnh</div>
          <div className="fcp-card__sub">
            Hoàn thiện hồ sơ sản phẩm bằng ảnh thực tế và giấy tờ chứng nhận.
          </div>
        </div>
      </div>

      <div className="fcp-media-layout">
        {/* Ảnh thực tế */}
        <div className="fcp-field">
          <div className="fcp-media-title-row">
            <label>
              Ảnh thực tế <span className="fcp-required">*</span>
            </label>
            <span>{form.images.length}/{MAX_IMAGES} ảnh</span>
          </div>

          {form.images.length > 0 && (
            <div className="fcp-img-grid">
              {form.images.map((file, index) => (
                <div key={`${file.name}-${index}`} className="fcp-img-thumb">
                  <LocalImagePreview file={file} alt={`Ảnh sản phẩm ${index + 1}`} />
                  {index === 0 && <span className="fcp-img-cover">Ảnh chính</span>}
                  <button
                    type="button"
                    className="fcp-img-remove"
                    onClick={() => removeImage(index)}
                    aria-label={`Xóa ảnh ${index + 1}`}
                  >
                    <FiX size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className="fcp-upload-zone"
            onClick={() => imgRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault();
              addImages(event.dataTransfer.files);
            }}
            onDragOver={(event) => event.preventDefault()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') imgRef.current?.click();
            }}
          >
            <FiCamera size={28} />
            <strong>Thêm ảnh sản phẩm</strong>
            <span className="fcp-upload-hint">
              Kéo thả hoặc nhấn để chọn · JPG, PNG · tối đa 5MB/ảnh
            </span>
            <input
              ref={imgRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple
              hidden
              onChange={(event) => addImages(event.target.files)}
            />
          </div>

          <div
            className={`fcp-media-status ${
              form.images.length >= MIN_IMAGES ? 'fcp-media-status--success' : ''
            }`}
          >
            {form.images.length >= MIN_IMAGES ? (
              <>
                <FiCheckCircle size={14} />
                Đã đủ số ảnh tối thiểu để đăng bán.
              </>
            ) : (
              <>
                <FiAlertTriangle size={14} />
                Cần thêm {MIN_IMAGES - form.images.length} ảnh để đạt tối thiểu {MIN_IMAGES} ảnh.
              </>
            )}
          </div>
        </div>

        {/* Chứng nhận */}
        <div className="fcp-field">
          <div className="fcp-media-title-row">
            <label>
              Chứng nhận / kiểm định
              <span className="fcp-label-note"> · không bắt buộc</span>
            </label>
            <span>{form.certFiles.length}/{MAX_CERT_FILES} file</span>
          </div>

          <div
            className="fcp-upload-zone fcp-upload-zone--cert"
            onClick={() => certRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') certRef.current?.click();
            }}
          >
            <FiFileText size={24} />
            <div>
              <strong>Thêm chứng chỉ</strong>
              <div className="fcp-upload-hint">
                VietGAP, GlobalGAP, hữu cơ... · PDF, JPG, PNG · tối đa 5MB/file
              </div>
            </div>
            <input
              ref={certRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              hidden
              onChange={(event) => addCertificates(event.target.files)}
            />
          </div>

          {form.certFiles.length > 0 ? (
            <div className="fcp-cert-list">
              {form.certFiles.map((file, index) => (
                <div className="fcp-cert-item" key={`${file.name}-${index}`}>
                  <span className="fcp-cert-item__icon"><FiFileText /></span>
                  <div>
                    <strong>{stripExtension(file.name)}</strong>
                    <small>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertificate(index)}
                    aria-label={`Xóa chứng chỉ ${index + 1}`}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="fcp-cert-empty">
              Chưa có chứng chỉ. Bạn vẫn có thể đăng bán sản phẩm mà không cần tải giấy tờ.
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="fcp-error">
          <FiAlertTriangle size={14} /> {uploadError}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function FarmerCreateProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const canNext = () => {
    if (step === 0) {
      return form.name.trim() !== '' && form.category !== '' && form.type !== '' && form.region !== '';
    }

    if (step === 1) {
      return (
        form.plantDate !== '' &&
        form.harvestDate !== '' &&
        Number(form.quantity || 0) > 0 &&
        form.harvestDate >= form.plantDate
      );
    }

    if (step === 2) {
      return Number(form.price || 0) > 0 && form.coverageRate >= 0 && form.coverageRate <= 100;
    }

    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      return;
    }

    navigate('/farmer/crops');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const priceNum = Number(form.price || 0);

      await productService.createProduct(
        {
          // Bắt buộc theo backend (product.service.ts)
          name:     form.name.trim(),
          category: form.category,
          type:     form.type,
          region:   REGION_MAP[form.region] || form.region,

          // Tùy chọn
          variety:       form.variety?.trim() || undefined,
          area:          form.area ? Number(form.area) : undefined,
          totalQuantity: form.quantity ? Number(form.quantity) : undefined,
          coverageRate:  form.coverageRate,
          unit:          form.unit,
          priceUnit:     form.priceUnit,
          priceMin:      priceNum || undefined,
          priceMax:      priceNum ? Math.round(priceNum * 1.15) : undefined,
          plantDate:     form.plantDate || undefined,
          expectedDate:  form.harvestDate || undefined,
          certificationNames: form.certFiles.map((file) => stripExtension(file.name)),
        },
        form.images,
        form.certFiles,
      );
      navigate('/farmer/crops');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng bán thất bại, vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  const dots = Array.from({ length: STEPS.length }, (_, i) => i);

  if (!isFarmerProfileComplete(user)) {
    return (
      <div className="fcp-page">
        <div className="fcp-breadcrumb">
          <button type="button" onClick={() => navigate('/farmer')}>Trang chủ</button>
          <span>/</span>
          <span>Đăng bán nông sản</span>
        </div>

        <section className="fcp-profile-required">
          <div className="fcp-profile-required__icon">⚠️</div>
          <span className="fcp-profile-required__eyebrow">HOÀN THIỆN HỒ SƠ</span>
          <h2>Vui lòng bổ sung thông tin trước khi đăng bán</h2>
          <p>
            Hồ sơ Farmer cần có đầy đủ họ tên, số điện thoại, tỉnh/thành phố và tên trang trại
            để thông tin nguồn cung được hiển thị rõ ràng cho doanh nghiệp.
          </p>
          <button
            type="button"
            className="fcp-nav__submit"
            onClick={() => navigate('/profile?incomplete=1')}
          >
            Cập nhật hồ sơ ngay
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="fcp-page">
      {/* Breadcrumb */}
      <div className="fcp-breadcrumb">
        <button type="button" onClick={() => navigate('/farmer')}>Trang chủ</button>
        <span>/</span>
        <span>Đăng bán nông sản</span>
      </div>

      <div className="fcp-heading">
        <span className="fcp-heading__eyebrow">MÙA VỤ MỚI</span>
        <h1>Đăng bán nông sản mới</h1>
        <p>Hoàn thiện thông tin mùa vụ theo 4 bước để sản phẩm sẵn sàng tiếp cận doanh nghiệp thu mua.</p>
      </div>

      {/* Step bar */}
      <StepIndicator current={step} />

      <div className="fcp-body">
        {/* Form */}
        <div className="fcp-main fcp-main--wizard">
          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} />}
          {step === 2 && <Step3 form={form} set={set} />}
          {step === 3 && <Step4 form={form} set={set} />}

          {error && <div className="fcp-error"><FiAlertTriangle size={14} /> {error}</div>}

          {/* Navigation */}
          <div className="fcp-nav">
            <button
              type="button"
              className="fcp-nav__back"
              onClick={handleBack}
            >
              <FiArrowLeft size={14} /> {step === 0 ? 'Mùa vụ của tôi' : 'Quay lại'}
            </button>

            <div className="fcp-nav__progress">
              <span>Bước {step + 1}/{STEPS.length}</span>
              <div className="fcp-dots">
                {dots.map((d) => (
                  <span key={d} className={`fcp-dot ${d === step ? 'fcp-dot--active' : ''}`} />
                ))}
              </div>
            </div>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="fcp-nav__next"
                onClick={handleNext}
                disabled={!canNext()}
              >
                Tiếp theo <FiArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="fcp-nav__submit"
                onClick={handleSubmit}
                disabled={submitting || form.images.length < MIN_IMAGES}
              >
                {submitting ? 'Đang đăng...' : <>Đăng bán ngay <FiCheckCircle size={15} /></>}
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <Preview form={form} />
      </div>
    </div>
  );
}