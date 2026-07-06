import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft, FiEdit2, FiMapPin, FiPackage,
  FiStar, FiCalendar, FiCheckCircle, FiAward,
  FiImage, FiFileText
} from 'react-icons/fi';
import productService from '../../services/product.service';
import { useAuth } from '../../contexts/AuthContext';
import './ProductDetail.css';

const CATEGORY_LABEL = {
  rice: 'Lúa gạo', vegetable: 'Rau củ', fruit: 'Trái cây',
  coffee: 'Cà phê', spice: 'Hồ tiêu / Gia vị', tea: 'Trà',
  grain: 'Ngũ cốc', other: 'Khác',
};

const REGION_LABEL = {
  north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam',
};

const TYPE_LABEL = {
  fresh: 'Tươi', dried: 'Khô', processed: 'Đã sơ chế',
};

const formatMoney = (value) =>
  value ? Number(value).toLocaleString('vi-VN') + ' ₫' : '';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '';

const TABS = ['Thông tin', 'Chứng chỉ', 'Cam kết'];

export default function ProductDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [product,     setProduct]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [activeTab,   setActiveTab]   = useState('Thông tin');
  const [activeImage, setActiveImage] = useState(0);

  const isFarmerOwner =
    user?.role === 'farmer' && product?.createdBy === user?.id;

  useEffect(() => {
    setLoading(true);
    productService.getProductById(id)
      .then(data => {
        const p = data?.data?.product || data?.data || data;
        setProduct(p);
      })
      .catch(() => setError('Không thể tải thông tin sản phẩm.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-success" role="status" />
    </div>
  );

  if (error || !product) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#dc2626' }}>{error || 'Không tìm thấy sản phẩm.'}</p>
      <button onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <FiArrowLeft /> Quay lại
      </button>
    </div>
  );

  // Parse images
  let images = [];
  try {
    images = product.images ? JSON.parse(product.images) : [];
  } catch {
    images = [];
  }
  if (images.length === 0 && product.image) images = [product.image];

  return (
    <div className="pd-page">
      {/* ── Header ── */}
      <div className="pd-header">
        <button className="pd-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Quay lại
        </button>
        <h1 className="pd-title">{product.name}</h1>
        {isFarmerOwner && (
          <button
            className="pd-edit-btn"
            onClick={() => navigate(`/farmer/edit-product/${id}`)}
          >
            <FiEdit2 /> Chỉnh sửa
          </button>
        )}
      </div>

      <div className="pd-container">
        {/* ── Left: Gallery ── */}
        <div className="pd-gallery">
          <div className="pd-main-image">
            {images.length > 0 ? (
              <img
                src={'http://localhost:8080' + images[activeImage]}
                alt={product.name}
              />
            ) : (
              <div className="pd-no-image">
                <FiImage size={48} color="#9ca3af" />
                <p>Chưa có ảnh</p>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="pd-thumbnails">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={'http://localhost:8080' + img}
                  alt={'ảnh ' + (i + 1)}
                  className={activeImage === i ? 'active' : ''}
                  onClick={() => setActiveImage(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Info ── */}
        <div className="pd-info">
          {/* Status + tags */}
          <div className="pd-status-row">
            <span className={'pd-badge ' + (product.isActive ? 'active' : 'inactive')}>
              {product.isActive ? '● Đang bán' : '● Đã ẩn'}
            </span>
            {product.badge && (
              <span className="pd-badge special">{product.badge}</span>
            )}
          </div>

          <div className="pd-tags">
            <span className="pd-tag">{CATEGORY_LABEL[product.category] || product.category}</span>
            <span className="pd-tag">{REGION_LABEL[product.region]   || product.region}</span>
            <span className="pd-tag">{TYPE_LABEL[product.type]       || product.type}</span>
          </div>

          {/* Key info */}
          <div className="pd-key-info">
            <div className="pd-info-row">
              <span><FiPackage /> Số lượng</span>
              <strong>
                {product.totalQuantity
                  ? Number(product.totalQuantity).toLocaleString('vi-VN') + ' ' + product.unit
                  : 'Chưa cập nhật'}
              </strong>
            </div>
            <div className="pd-info-row">
              <span>💰 Giá bán</span>
              <strong>
                {product.priceMin && product.priceMax
                  ? formatMoney(product.priceMin) + ' – ' + formatMoney(product.priceMax) + ' / ' + product.unit
                  : product.priceMin
                  ? formatMoney(product.priceMin) + ' / ' + product.unit
                  : 'Chưa cập nhật'}
              </strong>
            </div>
            <div className="pd-info-row">
              <span><FiMapPin /> Khu vực</span>
              <strong>{product.location || 'Chưa cập nhật'}</strong>
            </div>
            {product.farm && (
              <div className="pd-info-row">
                <span>🌾 Nông trại</span>
                <strong>{product.farm}</strong>
              </div>
            )}
            <div className="pd-info-row">
              <span><FiCalendar /> Thu hoạch dự kiến</span>
              <strong>{product.expectedDate ? formatDate(product.expectedDate) : 'Chưa cập nhật'}</strong>
            </div>
            <div className="pd-info-row">
              <span><FiStar /> Đánh giá</span>
              <strong>
                {product.rating > 0
                  ? product.rating + ' ⭐ (' + product.reviewCount + ' đánh giá)'
                  : 'Chưa có đánh giá'}
              </strong>
            </div>
            {product.sellerName && (
              <div className="pd-info-row">
                <span>👤 Người bán</span>
                <strong>{product.sellerName}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="pd-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            className={'pd-tab ' + (activeTab === tab ? 'active' : '')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="pd-tab-content">
        {/* Thông tin */}
        {activeTab === 'Thông tin' && (
          <div>
            {product.description ? (
              <>
                <h4>Mô tả sản phẩm</h4>
                <p className="pd-text">{product.description}</p>
              </>
            ) : (
              <p className="pd-empty">Chưa có mô tả.</p>
            )}
            {product.nutritionInfo && (
              <>
                <h4 style={{ marginTop: 20 }}>Thông tin dinh dưỡng</h4>
                <p className="pd-text">{product.nutritionInfo}</p>
              </>
            )}
            {product.note && (
              <>
                <h4 style={{ marginTop: 20 }}>Ghi chú</h4>
                <p className="pd-text">{product.note}</p>
              </>
            )}
          </div>
        )}

        {/* Chứng chỉ */}
        {activeTab === 'Chứng chỉ' && (
          <div>
            {product.certifications?.length > 0 ? (
              <div className="pd-cert-list">
                {product.certifications.map((cert, i) => (
                  <div key={i} className="pd-cert-item">
                    <FiAward color="#16a34a" size={20} />
                    <div>
                      <strong>{cert.value}</strong>
                     {cert.fileUrl && (
  
                     <a href={'http://localhost:8080' + cert.fileUrl}
                     target="_blank"
                     rel="noreferrer"
                    className="fpd-cert-link"
                     >
                    <FiFileText /> Xem file minh chứng
                </a>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pd-empty">Chưa có chứng chỉ nào.</p>
            )}
          </div>
        )}

        {/* Cam kết */}
        {activeTab === 'Cam kết' && (
          <div>
            {product.commitments?.length > 0 ? (
              <ul className="pd-commit-list">
                {product.commitments.map((c, i) => (
                  <li key={i} className="pd-commit-item">
                    <FiCheckCircle color="#16a34a" size={16} />
                    <span>{c.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pd-empty">Chưa có cam kết nào.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}