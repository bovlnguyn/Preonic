import React, { useState, useRef } from 'react';
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
    user?.farmName?.trim()
  );

// ── Dữ liệu tĩnh ─────────────────────────────────────────
const REGIONS = ['Miền Bắc', 'Miền Trung', 'Miền Nam'];
const UNITS = ['kg', 'Tạ', 'Tấn'];
const COVERAGE_PRESETS = [25, 50, 75, 100];

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
  '📸 Ảnh rõ nét, chụp thực tế tăng 3x tỉ lệ quan tâm',
  '✅ Chứng nhận VietGAP thu hút DN lớn',
  '💲 Giá hợp lý so thị trường → nhiều đề xuất hơn',
  '📅 Ghi đúng ngày thu hoạch để DN chủ động kế hoạch',
];

const initialForm = {
  // Bước 1
  name: '', category: '', type: '', variety: '', area: '', region: 'Miền Trung',
  // Bước 2
  plantDate: '', harvestDate: '', quantity: '', unit: 'tấn',
  // Bước 3
  priceUnit: 'kg', price: '', coverageRate: 50,
  // Bước 4
  images: [], certFile: null,
};

// ── Helper ────────────────────────────────────────────────
const fmt = (n) => Number(n).toLocaleString('vi-VN');

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
  const totalKg = form.unit === 'tấn'
    ? Number(form.quantity || 0) * 1000
    : form.unit === 'tạ'
    ? Number(form.quantity || 0) * 100
    : Number(form.quantity || 0);

  const priceNum = Number(form.price || 0);
  const highPrice = Math.round(priceNum * 1.15);
  const totalValue = form.priceUnit === 'kg'
    ? totalKg * priceNum
    : form.priceUnit === 'tạ'
    ? (totalKg / 100) * priceNum
    : (totalKg / 1000) * priceNum;

  return (
    <div className="fcp-preview">
      <div className="fcp-preview__header">
        <span>👁 XEM TRƯỚC SẢN PHẨM</span>
      </div>
      <div className="fcp-preview__thumb">
        {form.images.length > 0
          ? <img src={URL.createObjectURL(form.images[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
          : <><FiCheckCircle size={28} color="#86efac" /><span>Ảnh sẽ hiện thị ở đây</span></>
        }
      </div>
      <div className="fcp-preview__name">{form.name || '—'}</div>
      <div className="fcp-preview__location">
        <FiMapPin size={13} /> {form.region || 'Địa điểm của bạn'}
      </div>
      {priceNum > 0 && (
        <div className="fcp-preview__price">
          {fmt(priceNum)}đ – {fmt(highPrice)}đ/{form.priceUnit}
        </div>
      )}
      <div className="fcp-preview__tags">
        {form.region && <span className="fcp-tag">{form.region}</span>}
        {totalKg > 0 && <span className="fcp-tag">⚖ {fmt(totalKg)} kg</span>}
      </div>
      {totalValue > 0 && (
        <div className="fcp-preview__value">
          <div className="fcp-preview__value-label">💲 Tổng giá trị ước tính</div>
          <div className="fcp-preview__value-num">{(totalValue / 1e6).toFixed(1)} triệu VNĐ</div>
        </div>
      )}
      <div className="fcp-preview__tips">
        <div className="fcp-preview__tips-title">💡 Mẹo tăng tỉ lệ bao tiêu</div>
        {TIPS.map((t, i) => <div key={i} className="fcp-preview__tip">{t}</div>)}
      </div>
    </div>
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

      {/* Loại nông sản — bắt buộc, backend cần dto.category */}
      <div className="fcp-field fcp-field--full">
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
          <span className="fcp-hint">Vui lòng chọn loại nông sản phù hợp</span>
        )}
      </div>

      {/* Hình thức — bắt buộc, backend cần dto.type */}
      <div className="fcp-field fcp-field--full">
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

      <div className="fcp-row">
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

      <div className="fcp-field fcp-field--full">
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
  );
}

// ── Bước 2: Mùa vụ ────────────────────────────────────────
function Step2({ form, set }) {
  const totalKg = form.unit === 'tấn'
    ? Number(form.quantity || 0) * 1000
    : form.unit === 'tạ'
    ? Number(form.quantity || 0) * 100
    : Number(form.quantity || 0);

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
          <label>Ngày bắt đầu gieo / trồng</label>
          <input className="fcp-input" type="date" value={form.plantDate} onChange={(e) => set('plantDate', e.target.value)} />
        </div>
        <div className="fcp-field">
          <label>Ngày thu hoạch dự kiến <span className="fcp-required">*</span></label>
          <input className="fcp-input" type="date" value={form.harvestDate} onChange={(e) => set('harvestDate', e.target.value)} />
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
        <span className="fcp-hint">Nhập sản lượng dự kiến, đơn vị tính bằng tấn</span>
      </div>
    </div>
  );
}

// ── Bước 3: Giá & Bao tiêu ────────────────────────────────
function Step3({ form, set }) {
  const priceNum = Number(form.price || 0);
  const highPrice = Math.round(priceNum * 1.15);
  const totalKg = form.unit === 'tấn'
    ? Number(form.quantity || 0) * 1000
    : form.unit === 'tạ'
    ? Number(form.quantity || 0) * 100
    : Number(form.quantity || 0);
  const totalValue = totalKg * priceNum;

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
        <label>Tỉ lệ bao tiêu tối thiểu chấp nhận (%)</label>
        <input
          className="fcp-input"
          type="number"
          min="0"
          max="100"
          value={form.coverageRate}
          onChange={(e) => set('coverageRate', Number(e.target.value))}
        />
        <div className="fcp-btn-group" style={{ marginTop: 8 }}>
          {COVERAGE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`fcp-btn-region ${form.coverageRate === p ? 'fcp-btn-region--active' : ''}`}
              onClick={() => set('coverageRate', p)}
            >{p}%</button>
          ))}
        </div>
        <span className="fcp-hint">Tỉ lệ tối thiểu sản lượng bạn muốn được bao tiêu</span>
      </div>
    </div>
  );
}

// ── Bước 4: Ảnh & Chứng chỉ ──────────────────────────────
function Step4({ form, set }) {
  const imgRef = useRef();
  const certRef = useRef();

  const addImages = (files) => {
    const arr = Array.from(files).filter((f) => f.size <= 5 * 1024 * 1024);
    set('images', [...form.images, ...arr].slice(0, 10));
  };
  const removeImage = (i) => set('images', form.images.filter((_, idx) => idx !== i));

  return (
    <div className="fcp-card">
      <div className="fcp-card__head">
        <span className="fcp-card__icon">📷</span>
        <div>
          <div className="fcp-card__title">Chứng chỉ và hình ảnh</div>
          <div className="fcp-card__sub">Tải lên ảnh thực tế và giấy tờ chứng nhận</div>
        </div>
      </div>

      {/* Ảnh thực tế */}
      <div className="fcp-field fcp-field--full">
        <label>
          Ảnh thực tế <span className="fcp-required">*</span>
          <span className="fcp-label-note"> · tối thiểu 3 ảnh, tối đa 10</span>
        </label>

        {form.images.length > 0 && (
          <div className="fcp-img-grid">
            {form.images.map((f, i) => (
              <div key={i} className="fcp-img-thumb">
                <img src={URL.createObjectURL(f)} alt="" />
                <button type="button" className="fcp-img-remove" onClick={() => removeImage(i)}>
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="fcp-upload-zone"
          onClick={() => imgRef.current.click()}
          onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <FiCamera size={28} />
          <div>Nhấn để tải ảnh lên</div>
          <div className="fcp-upload-hint">JPG, PNG · tối đa 5MB mỗi ảnh</div>
          <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => addImages(e.target.files)} />
        </div>

        {form.images.length < 3 && (
          <div className="fcp-warning">
            <FiAlertTriangle size={14} /> Cần ít nhất 3 ảnh để tăng độ tin cậy
          </div>
        )}
      </div>

      {/* Chứng nhận */}
      <div className="fcp-field fcp-field--full">
        <label>
          Chứng nhận VietGAP / GlobalGAP / Hữu cơ
          <span className="fcp-label-note"> · không bắt buộc</span>
        </label>

        <div
          className="fcp-upload-zone fcp-upload-zone--cert"
          onClick={() => certRef.current.click()}
        >
          <FiFileText size={22} />
          <div>
            <strong>Tải lên chứng nhận</strong>
            <div className="fcp-upload-hint">PDF, JPG, PNG · tối đa 5MB</div>
          </div>
          <input ref={certRef} type="file" accept=".pdf,image/*" hidden onChange={(e) => set('certFile', e.target.files[0])} />
        </div>
        {form.certFile && (
          <div className="fcp-cert-name">
            <FiCheckCircle color="#16a34a" size={14} /> {form.certFile.name}
          </div>
        )}
      </div>
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
    // Bước 1: bắt buộc tên, loại nông sản (category) và hình thức (type)
    if (step === 0) return form.name.trim() !== '' && form.category !== '' && form.type !== '';
    if (step === 1) return form.harvestDate !== '' && form.quantity !== '';
    if (step === 2) return form.price !== '';
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
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
          unit:          form.unit,
          priceUnit:     form.priceUnit,
          priceMin:      priceNum || undefined,
          priceMax:      priceNum ? Math.round(priceNum * 1.15) : undefined,
          expectedDate:  form.harvestDate || undefined,
          note:          form.plantDate ? `Ngày gieo trồng: ${form.plantDate}` : undefined,
          certificationNames: form.certFile ? [form.certFile.name] : [],
        },
        form.images,
        form.certFile ? [form.certFile] : [],
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
          <span onClick={() => navigate('/farmer')} style={{ cursor: 'pointer' }}>Trang chủ</span>
          <span> › </span>
          <span>Đăng bán nông sản</span>
        </div>

        <div className="fcp-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <span className="fcp-card__icon" style={{ fontSize: 40 }}>⚠️</span>
          <div className="fcp-card__title">Vui lòng hoàn thiện hồ sơ trước khi đăng bán sản phẩm</div>
          <div className="fcp-card__sub">
            Hồ sơ cần có đầy đủ họ tên, số điện thoại, tỉnh/thành phố và tên trang trại
            để doanh nghiệp có thể xác minh nguồn gốc sản phẩm.
          </div>
          <button
            type="button"
            className="fcp-nav__submit"
            onClick={() => navigate('/profile?incomplete=1')}
          >
            Cập nhật hồ sơ ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fcp-page">
      {/* Breadcrumb */}
      <div className="fcp-breadcrumb">
        <span onClick={() => navigate('/farmer')} style={{ cursor: 'pointer' }}>Trang chủ</span>
        <span> › </span>
        <span>Đăng bán nông sản</span>
      </div>

      <div className="fcp-heading">
        <h1>Đăng ký Bán Nông sản Mới</h1>
        <p>Điền thông tin để kết nối với nhà bao tiêu uy tín trên toàn quốc.</p>
      </div>

      {/* Step bar */}
      <StepIndicator current={step} />

      <div className="fcp-body">
        {/* Form */}
        <div className="fcp-main">
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
              disabled={step === 0}
            >
              <FiArrowLeft size={14} /> Quay lại
            </button>

            <div className="fcp-dots">
              {dots.map((d) => (
                <span key={d} className={`fcp-dot ${d === step ? 'fcp-dot--active' : ''}`} />
              ))}
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
                disabled={submitting || form.images.length < 3}
              >
                {submitting ? 'Đang đăng...' : 'Đăng bán ngay'}
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