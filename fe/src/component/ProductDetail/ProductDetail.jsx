import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiMapPin, FiPackage,
  FiStar, FiCalendar, FiCheckCircle, FiAward,
  FiImage, FiFileText
} from 'react-icons/fi';
import productService from '../../services/product.service';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CATEGORY_LABEL, REGION_LABEL, TYPE_LABEL } from '../../constants/product';
import './ProductDetail.css';

const IMAGE_HOST = 'http://localhost:8080';
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#dcfce7"/><text x="50%" y="56%" text-anchor="middle" font-size="18" fill="#166534" font-family="sans-serif">👤</text></svg>'
  );

const formatMoney = (value) =>
  value ? Number(value).toLocaleString('vi-VN') + ' ₫' : '';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '';

const TABS = ['Thông tin', 'Chứng chỉ', 'Cam kết', 'Đánh giá'];

export default function ProductDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const toast        = useToast();

  const [product,       setProduct]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [activeTab,     setActiveTab]     = useState('Thông tin');
  const [activeImage,   setActiveImage]   = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [reviews,       setReviews]       = useState([]);

  const isFarmerOwner =
    user?.role === 'farmer' && product?.createdBy === user?.id;
  const isEnterpriseViewer = user?.role === 'enterprise';

  useEffect(() => {
    setLoading(true);
    productService.getProductById(id)
      .then(data => {
        const p = data?.data?.product || data?.data || data;
        setProduct(p);
      })
      .catch(() => setError('Không thể tải thông tin sản phẩm.'))
      .finally(() => setLoading(false));

    productService.getReviews(id)
      .then(data => setReviews(data?.data || []))
      .catch(() => setReviews([]));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productService.deleteProduct(id);
      toast.success('Đã xóa sản phẩm');
      navigate('/farmer/crops');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa sản phẩm thất bại, vui lòng thử lại.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

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
        <button
          className="pd-back-btn"
          onClick={() => (isFarmerOwner ? navigate('/farmer/crops') : navigate(-1))}
        >
          <FiArrowLeft /> Quay lại
        </button>
        <h1 className="pd-title">{product.name}</h1>
        {isFarmerOwner && (
          <div className="pd-owner-actions">
            <button
              className="pd-edit-btn"
              onClick={() => navigate(`/farmer/edit-product/${id}`)}
            >
              <FiEdit2 /> Chỉnh sửa
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                className="pd-delete-btn"
                onClick={() => setConfirmDelete(true)}
              >
                <FiTrash2 /> Xóa
              </button>
            ) : (
              <div className="pd-delete-confirm">
                <span>Xác nhận xóa?</span>
                <button type="button" className="pd-delete-btn" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
                <button type="button" className="pd-back-btn" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Hủy
                </button>
              </div>
            )}
          </div>
        )}
        {isEnterpriseViewer && (
          <div className="pd-owner-actions">
            <button
              className="pd-edit-btn"
              onClick={() => navigate(`/enterprise/contracts/create?product=${id}`)}
            >
              <FiFileText /> Tạo hợp đồng
            </button>
          </div>
        )}
      </div>

      <div className="pd-container">
        {/* ── Left: Gallery ── */}
        <div className="pd-gallery">
          <div className="pd-main-image">
            {images.length > 0 ? (
              <img
                src={IMAGE_HOST + images[activeImage]}
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
                  src={IMAGE_HOST + img}
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
                {(() => {
                  const priceUnit = product.priceUnit || product.unit;
                  return product.priceMin && product.priceMax
                    ? formatMoney(product.priceMin) + ' – ' + formatMoney(product.priceMax) + ' / ' + priceUnit
                    : product.priceMin
                    ? formatMoney(product.priceMin) + ' / ' + priceUnit
                    : 'Chưa cập nhật';
                })()}
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
            {product.variety && (
              <div className="pd-info-row">
                <span>🌱 Giống / Phân loại</span>
                <strong>{product.variety}</strong>
              </div>
            )}
            {product.area && (
              <div className="pd-info-row">
                <span>📐 Diện tích canh tác</span>
                <strong>{Number(product.area).toLocaleString('vi-VN')} ha</strong>
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
          </div>

          {product.sellerName && (
            <div className="pd-seller">
              <img
                className="pd-seller__avatar"
                src={product.sellerAvatar ? IMAGE_HOST + product.sellerAvatar : DEFAULT_AVATAR}
                alt={product.sellerName}
              />
              <div className="pd-seller__info">
                <strong>{product.sellerName}</strong>
                <div className="pd-seller__meta">
                  {product.sellerRating > 0 && (
                    <span><FiStar /> {product.sellerRating}</span>
                  )}
                  {product.sellerTotalContracts > 0 && (
                    <span>{product.sellerTotalContracts} hợp đồng đã thực hiện</span>
                  )}
                </div>
              </div>
            </div>
          )}
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
  
                     <a href={IMAGE_HOST + cert.fileUrl}
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

        {/* Đánh giá */}
        {activeTab === 'Đánh giá' && (
          <div>
            {reviews.length > 0 ? (
              <div className="pd-review-list">
                {reviews.map((r) => (
                  <div key={r.id} className="pd-review-item">
                    <div className="pd-review-item__head">
                      <strong>{r.reviewerName || 'Ẩn danh'}</strong>
                      <span className="pd-review-item__stars">
                        {'⭐'.repeat(r.rating)} <span className="pd-review-item__rating-num">{r.rating}/5</span>
                      </span>
                    </div>
                    {r.text && <p className="pd-text">{r.text}</p>}
                    <span className="pd-review-item__date">{formatDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pd-empty">Chưa có đánh giá nào.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}