import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiAlertTriangle } from 'react-icons/fi';
import productService from '../../../services/product.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { CATEGORY_OPTIONS, REGION_OPTIONS, TYPE_OPTIONS } from '../../../constants/product';
import logo from '../../../assets/branding/preonic-logo-main.png';
import './FarmerCreateProduct.css';
import './FarmerEditProduct.css';

const UNITS = ['kg', 'Tạ', 'Tấn'];

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
  plantDate: product?.plantDate ? product.plantDate.slice(0, 10) : '',
  expectedDate: product?.expectedDate ? product.expectedDate.slice(0, 10) : '',
  description: product?.description || '',
  nutritionInfo: product?.nutritionInfo || '',
  note: product?.note || '',
});

export default function FarmerEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(buildForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    productService.getProductById(id)
      .then((data) => {
        const p = data?.data?.product || data?.data || data;
        setProduct(p);
        setForm(buildForm(p));
      })
      .catch(() => setError('Không thể tải thông tin sản phẩm.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const today = new Date().toISOString().split('T')[0];
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

    setSaving(true);
    try {
      await productService.updateProduct(id, {
        name: form.name.trim(),
        category: form.category,
        region: form.region,
        type: form.type,
        variety: form.variety.trim() || undefined,
        area: form.area === '' ? undefined : Number(form.area),
        priceMin: form.priceMin === '' ? undefined : Number(form.priceMin),
        priceMax: form.priceMax === '' ? undefined : Number(form.priceMax),
        unit: form.unit,
        priceUnit: form.priceUnit,
        totalQuantity: form.totalQuantity === '' ? undefined : Number(form.totalQuantity),
        plantDate: form.plantDate || undefined,
        expectedDate: form.expectedDate || undefined,
        description: form.description.trim() || undefined,
        nutritionInfo: form.nutritionInfo.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      toast.success('Cập nhật sản phẩm thành công');
      navigate(`/farmer/crops/${id}`);
    } catch (err) {
      const message = err.response?.data?.message || 'Cập nhật sản phẩm thất bại, vui lòng thử lại.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const Topbar = () => (
    <header className="fep-topbar">
      <div className="fep-topbar__brand" onClick={() => navigate('/farmer')}>
        <img src={logo} alt="PreOnic" />
        <span>PreOnic</span>
      </div>
      <button type="button" className="fep-topbar__close" onClick={() => navigate(`/farmer/crops/${id}`)}>
        <FiArrowLeft size={14} /> Quay lại sản phẩm
      </button>
    </header>
  );

  if (loading) {
    return (
      <div className="fep-shell">
        <Topbar />
        <div className="fcp-page fep-content fep-content--center">
          <div className="spinner-border text-success" role="status" />
        </div>
      </div>
    );
  }

  if (!product || (user && product.createdBy !== user.id)) {
    return (
      <div className="fep-shell">
        <Topbar />
        <div className="fcp-page fep-content fep-content--center">
          <div className="fcp-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span className="fcp-card__icon" style={{ fontSize: 40 }}>⚠️</span>
            <div className="fcp-card__title">Không thể chỉnh sửa sản phẩm này</div>
            <div className="fcp-card__sub">Sản phẩm không tồn tại hoặc không thuộc về bạn.</div>
            <button type="button" className="fcp-nav__submit" onClick={() => navigate('/farmer/crops')}>
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fep-shell">
      <Topbar />
      <div className="fcp-page fep-content">
      <div className="fcp-breadcrumb">
        <span onClick={() => navigate('/farmer/crops')} style={{ cursor: 'pointer' }}>Mùa vụ của tôi</span>
        <span> › </span>
        <span>Chỉnh sửa sản phẩm</span>
      </div>

      <div className="fcp-heading">
        <h1>Chỉnh sửa sản phẩm</h1>
        <p>Cập nhật thông tin nông sản đã đăng bán.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="fcp-card">
          <div className="fcp-card__head">
            <span className="fcp-card__icon">🌿</span>
            <div>
              <div className="fcp-card__title">Thông tin cơ bản</div>
              <div className="fcp-card__sub">Tên, loại nông sản và giống</div>
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Tên / Loại nông sản <span className="fcp-required">*</span></label>
            <input
              className="fcp-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Loại nông sản <span className="fcp-required">*</span></label>
            <div className="fcp-btn-group">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`fcp-btn-region ${form.category === c.value ? 'fcp-btn-region--active' : ''}`}
                  onClick={() => set('category', c.value)}
                >{c.label}</button>
              ))}
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Vùng miền <span className="fcp-required">*</span></label>
            <div className="fcp-btn-group">
              {REGION_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`fcp-btn-region ${form.region === r.value ? 'fcp-btn-region--active' : ''}`}
                  onClick={() => set('region', r.value)}
                >{r.label}</button>
              ))}
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Hình thức <span className="fcp-required">*</span></label>
            <div className="fcp-btn-group">
              {TYPE_OPTIONS.map((t) => (
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
                placeholder="VD: ST25..."
              />
            </div>
            <div className="fcp-field">
              <label>Diện tích canh tác (ha)</label>
              <div className="fcp-input-suffix">
                <input
                  className="fcp-input"
                  type="number" min="0" step="0.1"
                  value={form.area}
                  onChange={(e) => set('area', e.target.value)}
                />
                <span>ha</span>
              </div>
            </div>
          </div>
        </div>

        <div className="fcp-card" style={{ marginTop: 20 }}>
          <div className="fcp-card__head">
            <span className="fcp-card__icon">💲</span>
            <div>
              <div className="fcp-card__title">Sản lượng và giá</div>
              <div className="fcp-card__sub">Số lượng, giá bán và ngày thu hoạch</div>
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Sản lượng ước tính</label>
            <div className="fcp-input-suffix">
              <input
                className="fcp-input"
                type="number" min="0"
                value={form.totalQuantity}
                onChange={(e) => set('totalQuantity', e.target.value)}
              />
              <select className="fcp-select-inline" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u.toLowerCase()}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
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
            <span className="fcp-hint">Có thể khác với đơn vị sản lượng ở trên</span>
          </div>

          <div className="fcp-row">
            <div className="fcp-field">
              <label>Giá tối thiểu</label>
              <div className="fcp-input-suffix">
                <input
                  className="fcp-input"
                  type="number" min="0"
                  value={form.priceMin}
                  onChange={(e) => set('priceMin', e.target.value)}
                />
                <span>VNĐ/{form.priceUnit}</span>
              </div>
            </div>
            <div className="fcp-field">
              <label>Giá tối đa</label>
              <div className="fcp-input-suffix">
                <input
                  className="fcp-input"
                  type="number" min="0"
                  value={form.priceMax}
                  onChange={(e) => set('priceMax', e.target.value)}
                />
                <span>VNĐ/{form.priceUnit}</span>
              </div>
            </div>
          </div>

          <div className="fcp-row">
            <div className="fcp-field">
              <label>Ngày bắt đầu gieo / trồng</label>
              <input
                className="fcp-input"
                type="date"
                value={form.plantDate}
                onChange={(e) => set('plantDate', e.target.value)}
              />
            </div>
            <div className="fcp-field">
              <label>Ngày thu hoạch dự kiến</label>
              <input
                className="fcp-input"
                type="date"
                value={form.expectedDate}
                onChange={(e) => set('expectedDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="fcp-card" style={{ marginTop: 20 }}>
          <div className="fcp-card__head">
            <span className="fcp-card__icon">📝</span>
            <div>
              <div className="fcp-card__title">Mô tả chi tiết</div>
              <div className="fcp-card__sub">Mô tả, thông tin dinh dưỡng và ghi chú thêm</div>
            </div>
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Mô tả sản phẩm</label>
            <textarea
              className="fcp-input"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Thông tin dinh dưỡng</label>
            <textarea
              className="fcp-input"
              rows={3}
              value={form.nutritionInfo}
              onChange={(e) => set('nutritionInfo', e.target.value)}
            />
          </div>

          <div className="fcp-field fcp-field--full">
            <label>Ghi chú</label>
            <textarea
              className="fcp-input"
              rows={2}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>
        </div>

        {error && <div className="fcp-error"><FiAlertTriangle size={14} /> {error}</div>}

        <div className="fcp-nav">
          <button
            type="button"
            className="fcp-nav__back"
            onClick={() => navigate(`/farmer/crops/${id}`)}
          >
            <FiArrowLeft size={14} /> Hủy
          </button>

          <button type="submit" className="fcp-nav__submit" disabled={saving}>
            {saving ? 'Đang lưu...' : <><FiSave size={14} /> Lưu thay đổi</>}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
