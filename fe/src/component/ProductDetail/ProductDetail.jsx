import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiAward,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiExternalLink,
  FiFileText,
  FiMapPin,
  FiMessageSquare,
  FiShield,
  FiStar,
  FiTag,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import Header from "../Common/Header";
import Footer from "../Common/Footer";
import fallbackProductImage from "../../assets/home/PD1.jpg";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { useMessagingWidget } from "../../contexts/MessagingWidgetContext";
import { ROUTES, TOAST_DURATION, REGIONS } from "../../constants";
import productService, { resolveImageUrl } from "../../services/product.service";
import contractService from "../../services/contract.service";
import "./ProductDetail.css";

const ROLE = { FARMER: "farmer", ENTERPRISE: "enterprise" };

const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatPrice = (value) =>
  asNumber(value) > 0 ? `${asNumber(value).toLocaleString("vi-VN")} ₫` : "Liên hệ";

const formatPriceRange = (min, max) => {
  const minValue = asNumber(min);
  const maxValue = asNumber(max);

  if (!minValue && !maxValue) return "Liên hệ";
  if (minValue && maxValue && minValue !== maxValue) {
    return `${formatPrice(minValue)} – ${formatPrice(maxValue)}`;
  }
  return formatPrice(minValue || maxValue);
};

const formatDisplayDate = (value) => {
  if (!value || value === "Quanh năm") return "Quanh năm";

  const date = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(value)
    : (() => {
        const [day, month, year] = String(value).split("/");
        return new Date(year, asNumber(month) - 1, day);
      })();

  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
};

const normalizeIdentity = (value) => value?._id || value?.id || value || null;

const toUiProductDetail = (product) => ({
  id: product._id || product.id,
  createdBy: normalizeIdentity(product.createdBy),
  name: product.name || "Sản phẩm nông sản",
  location: product.location || "Việt Nam",
  farm: product.farm || "Trang trại chưa cập nhật",
  category: product.category || "Nông sản",
  region: String(product.region || "south").toLowerCase(),
  priceMin: asNumber(product.priceMin),
  priceMax: asNumber(product.priceMax || product.priceMin),
  unit: product.priceUnit || product.unit || "kg",
  progress: asNumber(product.progress),
  remaining: asNumber(product.remaining ?? product.totalQuantity),
  totalQuantity: asNumber(product.totalQuantity),
  rating: asNumber(product.rating, 0),
  reviewCount: asNumber(product.reviewCount),
  image: resolveImageUrl(product.image) || fallbackProductImage,
  badge: product.badge || null,
  expectedDate: product.expectedDate || "Quanh năm",
  certifications: (product.certifications || []).map((certification) =>
    typeof certification === "string"
      ? { value: certification, fileUrl: null }
      : {
          value: certification.value || certification.name || "Chứng nhận",
          fileUrl: resolveImageUrl(certification.fileUrl),
        }
  ),
  description:
    product.description ||
    "Sản phẩm nông sản chất lượng cao, được theo dõi minh bạch từ vùng trồng đến quá trình giao nhận.",
  nutritionInfo:
    product.nutritionInfo || "Thông tin dinh dưỡng đang được nhà cung cấp cập nhật.",
  commitments: product.commitments?.length
    ? product.commitments.map((commitment) =>
        typeof commitment === "string" ? commitment : commitment.value
      )
    : [
        "Đảm bảo chất lượng đúng với thông tin đã công bố",
        "Giao hàng theo tiến độ được thống nhất trong hợp đồng",
        "Hỗ trợ xử lý phát sinh trong suốt quá trình giao dịch",
      ],
  seller: {
    userId: normalizeIdentity(product.sellerUserId),
    name: product.sellerName || "Nông dân PreOnic",
    rating: asNumber(product.sellerRating, 0),
    totalContracts: asNumber(product.sellerTotalContracts),
    avatar: product.sellerName?.trim()?.charAt(0)?.toUpperCase() || "ND",
  },
});

const getNavigationConfig = (context) => {
  if (context === "enterprise-site") {
    return {
      homeRoute: "/enterprise-home",
      homeLabel: "Trang chủ",
      listRoute: "/enterprise-products",
      listLabel: "Sản phẩm",
      detailRoute: (id) => `/enterprise-products/${id}`,
      backLabel: "Quay lại danh sách sản phẩm",
      embedded: false,
    };
  }

  if (context === ROLE.ENTERPRISE) {
    return {
      homeRoute: "/enterprise",
      homeLabel: "Dashboard",
      listRoute: "/enterprise/products",
      listLabel: "Danh sách sản phẩm",
      detailRoute: (id) => `/enterprise/products/${id}`,
      backLabel: "Quay lại danh sách sản phẩm",
      embedded: true,
    };
  }

  if (context === ROLE.FARMER) {
    return {
      homeRoute: "/farmer",
      homeLabel: "Dashboard",
      listRoute: "/farmer/crops",
      listLabel: "Mùa vụ của tôi",
      detailRoute: (id) => `/farmer/crops/${id}`,
      backLabel: "Quay lại mùa vụ của tôi",
      embedded: true,
    };
  }

  return {
    homeRoute: ROUTES.HOME,
    homeLabel: "Trang chủ",
    listRoute: ROUTES.PRODUCTS,
    listLabel: "Sản phẩm",
    detailRoute: (id) => `/products/${id}`,
    backLabel: "Quay lại danh sách sản phẩm",
    embedded: false,
  };
};

const ProductDetail = ({ context = "public" }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { openChatWith } = useMessagingWidget();
  const navigation = useMemo(() => getNavigationConfig(context), [context]);

  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [quantity, setQuantity] = useState(1000);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [reviews, setReviews] = useState([]);
  const [myRating, setMyRating] = useState(5);
  const [myReviewText, setMyReviewText] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [certPreview, setCertPreview] = useState(null);
  const [checkingContract, setCheckingContract] = useState(false);

  const role = user?.role === ROLE.ENTERPRISE ? ROLE.ENTERPRISE : ROLE.FARMER;
  const isEnterprise = role === ROLE.ENTERPRISE;
  const isFarmer = role === ROLE.FARMER;
  const currentUserId = normalizeIdentity(user);
  const isOwner = Boolean(isFarmer && product?.createdBy && currentUserId === product.createdBy);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast.warning("Vui lòng đăng nhập để xem chi tiết sản phẩm", TOAST_DURATION.DEFAULT);
      navigate(ROUTES.AUTH, { replace: true });
      return;
    }

    let active = true;

    const loadProduct = async () => {
      setLoadingProduct(true);
      try {
        const response = await productService.getById(id);
        const rawProduct = response?.data?.product;

        if (!rawProduct) throw new Error("PRODUCT_NOT_FOUND");

        const nextProduct = toUiProductDetail(rawProduct);
        if (!active) return;

        setProduct(nextProduct);
        const availableQuantity = nextProduct.remaining || nextProduct.totalQuantity;
        setQuantity(Math.max(1, Math.min(1000, availableQuantity || 1000)));
        window.scrollTo({ top: 0, behavior: "smooth" });

        try {
          const similarResponse = await productService.getSimilar(id);
          if (active && Array.isArray(similarResponse?.data)) {
            setSimilar(
              similarResponse.data
                .map(toUiProductDetail)
                .filter((item) => item.id && item.id !== nextProduct.id)
                .slice(0, 4)
            );
          }
        } catch {
          if (active) setSimilar([]);
        }
      } catch {
        toast.error("Không tìm thấy sản phẩm", TOAST_DURATION.DEFAULT);
        navigate(navigation.listRoute, { replace: true });
      } finally {
        if (active) setLoadingProduct(false);
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [authLoading, id, navigate, navigation.listRoute, toast, user]);

  useEffect(() => {
    if (!product?.expectedDate || product.expectedDate === "Quanh năm") return undefined;

    const target = /^\d{4}-\d{2}-\d{2}/.test(product.expectedDate)
      ? new Date(product.expectedDate)
      : (() => {
          const [day, month, year] = String(product.expectedDate).split("/");
          return new Date(year, asNumber(month) - 1, day);
        })();

    if (Number.isNaN(target.getTime())) return undefined;

    const updateCountdown = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [product]);

  useEffect(() => {
    if (!id || !user) return;

    let active = true;
    productService
      .getReviews(id)
      .then((response) => {
        if (active && Array.isArray(response?.data)) setReviews(response.data);
      })
      .catch(() => {
        if (active) setReviews([]);
      });

    return () => {
      active = false;
    };
  }, [id, user]);

  const committedPct = product?.totalQuantity
    ? Math.min(
        100,
        Math.max(0, ((product.totalQuantity - product.remaining) / product.totalQuantity) * 100)
      )
    : Math.min(100, Math.max(0, product?.progress || 0));

  const remainPct = Math.max(0, 100 - committedPct);
  const region = product
    ? REGIONS[product.region.toUpperCase()] || REGIONS.SOUTH
    : REGIONS.SOUTH;

  const reviewAverage = reviews.length
    ? reviews.reduce((total, review) => total + asNumber(review.rating), 0) / reviews.length
    : product?.rating || 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((review) => asNumber(review.rating) === star).length;
    return {
      star,
      count,
      percent: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    };
  });

  const alreadyReviewed = reviews.some(
    (review) => normalizeIdentity(review.reviewerId) === currentUserId
  );

  const handleSubmitReview = async () => {
    if (!myReviewText.trim()) {
      toast.warning("Vui lòng nhập nội dung đánh giá.");
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await productService.addReview(product.id, {
        rating: myRating,
        text: myReviewText.trim(),
      });

      if (response?.data?.review) {
        setReviews((current) => [response.data.review, ...current]);
        setMyReviewText("");
        setMyRating(5);
        toast.success("Đánh giá của bạn đã được ghi nhận!");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleGoContract = () => {
    navigate(`${ROUTES.ENTERPRISE}/contracts/create?product=${product.id}`);
  };

  const handleViewContract = async () => {
    setCheckingContract(true);
    try {
      const response = await contractService.list(undefined, { limit: 100 });
      const contracts = response?.data?.contracts || [];
      const existing = contracts.find(
        (contract) => normalizeIdentity(contract.product) === product.id
      );

      if (existing) {
        navigate(`${ROUTES.ENTERPRISE}/contracts/${existing.id || existing._id}`);
      } else {
        toast.warning("Bạn chưa ký kết hợp đồng với sản phẩm này", TOAST_DURATION.DEFAULT);
      }
    } catch (error) {
      toast.error(error?.message || "Không thể kiểm tra hợp đồng. Vui lòng thử lại.");
    } finally {
      setCheckingContract(false);
    }
  };

  const handleEditProduct = () => navigate(`/farmer/edit-product/${product.id}`);

  const handleDeleteProduct = async () => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await productService.deleteProduct(product.id);
      toast.success("Đã xóa sản phẩm thành công.");
      navigate("/farmer/crops", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể xóa sản phẩm. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenMessaging = () => {
    if (!product?.seller?.userId || isOwner) return;
    openChatWith(product.seller.userId, product.seller.name);
  };

  const renderStars = (rating, clickable = false) =>
    [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`pd-star ${star <= Math.round(rating) ? "is-filled" : ""} ${
          clickable ? "is-clickable" : ""
        }`}
        onClick={clickable ? () => setMyRating(star) : undefined}
        aria-label={clickable ? `Chọn ${star} sao` : undefined}
        tabIndex={clickable ? 0 : -1}
      >
        ★
      </button>
    ));

  const roleClass = isEnterprise ? "product-detail-page--enterprise" : "product-detail-page--farmer";
  const embeddedClass = navigation.embedded ? "product-detail-page--embedded" : "";

  const pageContent = (
    <motion.main
      className={`product-detail-page ${roleClass} ${embeddedClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="pd-container">
        <div className="pd-page-nav">
          <button
            type="button"
            className="pd-back-button"
            onClick={() => navigate(navigation.listRoute)}
          >
            <FiArrowLeft />
            <span>{navigation.backLabel}</span>
          </button>

          <nav className="pd-breadcrumb" aria-label="Điều hướng trang chi tiết sản phẩm">
            <button type="button" onClick={() => navigate(navigation.homeRoute)}>
              {navigation.homeLabel}
            </button>
            <span>/</span>
            <button type="button" onClick={() => navigate(navigation.listRoute)}>
              {navigation.listLabel}
            </button>
            {product && (
              <>
                <span>/</span>
                <strong>{product.name}</strong>
              </>
            )}
          </nav>
        </div>

        {loadingProduct || !product ? (
          <section className="pd-loading-card" aria-live="polite">
            <span className="pd-loading-spinner" />
            <div>
              <strong>Đang tải thông tin sản phẩm</strong>
              <p>PreOnic đang đồng bộ dữ liệu vùng trồng, sản lượng và nhà cung cấp.</p>
            </div>
          </section>
        ) : (
          <>
            <section className="pd-hero-grid">
              <motion.div
                className="pd-media-card"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="pd-image-wrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackProductImage;
                    }}
                  />
                  <div className="pd-image-overlay" />
                  <div className="pd-image-tags">
                    {product.badge && <span className="pd-chip pd-chip--accent">{product.badge}</span>}
                    <span className="pd-chip" style={{ "--pd-region-color": region.color }}>
                      <FiMapPin /> {region.label}
                    </span>
                  </div>
                  <div className="pd-image-caption">
                    <span>Vùng cung ứng</span>
                    <strong>{product.location}</strong>
                  </div>
                </div>

                <div className="pd-summary-strip">
                  <div>
                    <FiTag />
                    <span>Danh mục</span>
                    <strong>{product.category}</strong>
                  </div>
                  <div>
                    <FiBox />
                    <span>Tổng sản lượng</span>
                    <strong>{product.totalQuantity.toLocaleString("vi-VN")} {product.unit}</strong>
                  </div>
                  <div>
                    <FiCalendar />
                    <span>Thu hoạch</span>
                    <strong>{formatDisplayDate(product.expectedDate)}</strong>
                  </div>
                </div>
              </motion.div>

              <motion.aside
                className="pd-purchase-card"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 }}
              >
                <div className="pd-title-row">
                  <div>
                    {isOwner && <span className="pd-owner-badge">Sản phẩm của bạn</span>}
                    <h1>{product.name}</h1>
                    <p><FiMapPin /> {product.location} · {product.farm}</p>
                  </div>
                </div>

                <div className="pd-rating-row">
                  <div className="pd-stars" aria-label={`${reviewAverage.toFixed(1)} trên 5 sao`}>
                    {renderStars(reviewAverage)}
                  </div>
                  <strong>{reviewAverage ? reviewAverage.toFixed(1) : "Chưa có"}</strong>
                  <span>{reviews.length || product.reviewCount} đánh giá</span>
                </div>

                <div className="pd-price-block">
                  <span>Giá chào bán</span>
                  <div>
                    <strong>{formatPriceRange(product.priceMin, product.priceMax)}</strong>
                    <small>/ {product.unit}</small>
                  </div>
                </div>

                <div className="pd-availability-card">
                  <div className="pd-progress-heading">
                    <span>Tiến độ đã cam kết</span>
                    <strong>{committedPct.toFixed(1)}%</strong>
                  </div>
                  <div className="pd-progress-track" aria-label="Tiến độ sản lượng đã cam kết">
                    <span style={{ width: `${committedPct}%` }} />
                  </div>
                  <div className="pd-availability-grid">
                    <div>
                      <span>Còn có thể giao dịch</span>
                      <strong>{product.remaining.toLocaleString("vi-VN")} {product.unit}</strong>
                    </div>
                    <div>
                      <span>Tỷ lệ còn trống</span>
                      <strong>{remainPct.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>

                {product.expectedDate !== "Quanh năm" && (
                  <div className="pd-countdown-card">
                    <div className="pd-countdown-heading">
                      <FiCalendar />
                      <span>Thu hoạch dự kiến {formatDisplayDate(product.expectedDate)}</span>
                    </div>
                    <div className="pd-countdown-grid">
                      {[
                        [countdown.days, "Ngày"],
                        [countdown.hours, "Giờ"],
                        [countdown.mins, "Phút"],
                        [countdown.secs, "Giây"],
                      ].map(([value, label]) => (
                        <div key={label}>
                          <strong>{value}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isEnterprise && (
                  <div className="pd-enterprise-actions">
                    <label htmlFor="pd-quantity">Số lượng dự kiến ({product.unit})</label>
                    <div className="pd-quantity-control">
                      <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 500))}
                      >
                        −
                      </button>
                      <input
                        id="pd-quantity"
                        type="number"
                        min="1"
                        max={product.remaining || undefined}
                        value={quantity}
                        onChange={(event) => {
                          const nextValue = Math.max(1, asNumber(event.target.value, 1));
                          setQuantity(product.remaining ? Math.min(product.remaining, nextValue) : nextValue);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            product.remaining
                              ? Math.min(product.remaining, current + 500)
                              : current + 500
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <p className="pd-estimate">
                      Giá trị dự kiến: <strong>{formatPrice(quantity * product.priceMin)}</strong>
                      {product.priceMax !== product.priceMin && (
                        <> – <strong>{formatPrice(quantity * product.priceMax)}</strong></>
                      )}
                    </p>

                    <div className="pd-seller-card">
                      <div className="pd-seller-avatar">{product.seller.avatar}</div>
                      <div>
                        <span>Nhà cung cấp</span>
                        <strong>{product.seller.name}</strong>
                        <small>
                          <FiStar /> {product.seller.rating || "Mới"} · {product.seller.totalContracts} hợp đồng
                        </small>
                      </div>
                      <button
                        type="button"
                        className="pd-icon-action"
                        onClick={handleOpenMessaging}
                        disabled={!product.seller.userId}
                        title="Nhắn tin với nhà cung cấp"
                      >
                        <FiMessageSquare />
                      </button>
                    </div>

                    <button type="button" className="pd-primary-button" onClick={handleGoContract}>
                      <FiUsers /> Tạo đề xuất hợp đồng
                    </button>
                    <button
                      type="button"
                      className="pd-secondary-button"
                      onClick={handleViewContract}
                      disabled={checkingContract}
                    >
                      <FiFileText />
                      {checkingContract ? "Đang kiểm tra..." : "Xem hợp đồng liên quan"}
                    </button>
                  </div>
                )}

                {isFarmer && isOwner && (
                  <div className="pd-owner-actions">
                    <p>
                      Đây là sản phẩm bạn đã đăng. Bạn có thể cập nhật thông tin mùa vụ hoặc xóa sản phẩm khi chưa còn nhu cầu chào bán.
                    </p>
                    <div>
                      <button type="button" className="pd-secondary-button" onClick={handleEditProduct}>
                        <FiEdit3 /> Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="pd-danger-button"
                        onClick={handleDeleteProduct}
                        disabled={deleting}
                      >
                        <FiTrash2 /> {deleting ? "Đang xóa..." : "Xóa sản phẩm"}
                      </button>
                    </div>
                  </div>
                )}

                {isFarmer && !isOwner && (
                  <div className="pd-seller-card pd-seller-card--farmer">
                    <div className="pd-seller-avatar">{product.seller.avatar}</div>
                    <div>
                      <span>Người đăng sản phẩm</span>
                      <strong>{product.seller.name}</strong>
                      <small><FiStar /> {product.seller.rating || "Mới"}</small>
                    </div>
                  </div>
                )}
              </motion.aside>
            </section>

            <section className="pd-content-grid">
              <article className="pd-section-card pd-section-card--description">
                <div className="pd-section-heading">
                  <span><FiFileText /></span>
                  <div>
                    <small>Thông tin sản phẩm</small>
                    <h2>Mô tả và đặc điểm</h2>
                  </div>
                </div>
                <div className="pd-copy-block">
                  <h3>Mô tả sản phẩm</h3>
                  <p>{product.description}</p>
                </div>
                <div className="pd-copy-block">
                  <h3>Thông tin dinh dưỡng</h3>
                  <p>{product.nutritionInfo}</p>
                </div>
                <div className="pd-copy-block">
                  <h3>Chứng nhận chất lượng</h3>
                  <div className="pd-cert-list">
                    {product.certifications.length ? (
                      product.certifications.map((certification, index) =>
                        certification.fileUrl ? (
                          <button
                            key={`${certification.value}-${index}`}
                            type="button"
                            onClick={() => setCertPreview(certification)}
                          >
                            <FiAward /> {certification.value} <FiExternalLink />
                          </button>
                        ) : (
                          <span key={`${certification.value}-${index}`}>
                            <FiAward /> {certification.value}
                          </span>
                        )
                      )
                    ) : (
                      <p className="pd-muted-text">Nhà cung cấp chưa tải lên chứng nhận.</p>
                    )}
                  </div>
                </div>
              </article>

              <article className="pd-section-card pd-section-card--commitments">
                <div className="pd-section-heading">
                  <span><FiShield /></span>
                  <div>
                    <small>Cam kết giao dịch</small>
                    <h2>Minh bạch và an toàn</h2>
                  </div>
                </div>
                <div className="pd-commitment-list">
                  {product.commitments.map((commitment, index) => (
                    <motion.div
                      key={`${commitment}-${index}`}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <FiCheckCircle />
                      <p>{commitment}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="pd-guarantee-card">
                  <FiAward />
                  <div>
                    <strong>Bảo đảm bởi PreOnic</strong>
                    <p>
                      Hợp đồng và thanh toán được quản lý qua hệ thống ký quỹ, giúp hai bên theo dõi rõ nghĩa vụ và tiến độ thực hiện.
                    </p>
                  </div>
                </div>
              </article>
            </section>

            <section className="pd-section-card pd-review-section">
              <div className="pd-section-heading pd-section-heading--between">
                <div className="pd-section-heading__title">
                  <span><FiStar /></span>
                  <div>
                    <small>Phản hồi từ đối tác</small>
                    <h2>Đánh giá sản phẩm</h2>
                  </div>
                </div>
                <strong className="pd-review-count">{reviews.length} đánh giá</strong>
              </div>

              <div className="pd-rating-overview">
                <div className="pd-rating-score">
                  <strong>{reviewAverage ? reviewAverage.toFixed(1) : "—"}</strong>
                  <div className="pd-stars">{renderStars(reviewAverage)}</div>
                  <span>{reviews.length ? "Điểm trung bình" : "Chưa có đánh giá"}</span>
                </div>
                <div className="pd-rating-bars">
                  {distribution.map((item) => (
                    <div key={item.star}>
                      <span>{item.star} sao</span>
                      <div><i style={{ width: `${item.percent}%` }} /></div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {isEnterprise && !alreadyReviewed && (
                <div className="pd-review-form">
                  <div>
                    <h3>Chia sẻ đánh giá của bạn</h3>
                    <p>Phản hồi thực tế giúp nhà cung cấp cải thiện chất lượng và độ tin cậy.</p>
                  </div>
                  <div className="pd-stars pd-stars--select">{renderStars(myRating, true)}</div>
                  <textarea
                    rows="4"
                    value={myReviewText}
                    maxLength="1000"
                    placeholder="Nhập nội dung đánh giá..."
                    onChange={(event) => setMyReviewText(event.target.value)}
                  />
                  <button
                    type="button"
                    className="pd-primary-button pd-review-submit"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </div>
              )}

              {isEnterprise && alreadyReviewed && (
                <div className="pd-review-notice">
                  <FiCheckCircle /> Bạn đã gửi đánh giá cho sản phẩm này.
                </div>
              )}

              {reviews.length ? (
                <div className="pd-review-list">
                  {reviews.map((review, index) => (
                    <article key={review._id || `${review.reviewerName}-${index}`}>
                      <div className="pd-review-avatar">
                        {review.reviewerAvatar || review.reviewerName?.charAt(0)?.toUpperCase() || "ĐG"}
                      </div>
                      <div className="pd-review-body">
                        <div className="pd-review-meta">
                          <div>
                            <strong>{review.reviewerName || "Đối tác PreOnic"}</strong>
                            <span>
                              {review.createdAt
                                ? new Date(review.createdAt).toLocaleDateString("vi-VN")
                                : "Gần đây"}
                            </span>
                          </div>
                          <div className="pd-stars">{renderStars(asNumber(review.rating))}</div>
                        </div>
                        <p>{review.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="pd-empty-review">
                  <FiMessageSquare />
                  <strong>Chưa có đánh giá nào</strong>
                  <p>Đánh giá đầu tiên sẽ xuất hiện tại đây sau khi đối tác chia sẻ trải nghiệm.</p>
                </div>
              )}
            </section>

            {similar.length > 0 && (
              <section className="pd-similar-section">
                <div className="pd-section-heading">
                  <span><FiBox /></span>
                  <div>
                    <small>Khám phá thêm</small>
                    <h2>Sản phẩm tương tự</h2>
                  </div>
                </div>
                <div className="pd-similar-grid">
                  {similar.map((item) => (
                    <motion.button
                      type="button"
                      key={item.id}
                      whileHover={{ y: -5 }}
                      onClick={() => navigate(navigation.detailRoute(item.id))}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = fallbackProductImage;
                        }}
                      />
                      <span className="pd-similar-content">
                        <small><FiMapPin /> {item.location}</small>
                        <strong>{item.name}</strong>
                        <span>{formatPriceRange(item.priceMin, item.priceMax)} / {item.unit}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {certPreview && (
        <div className="pd-modal-overlay" onClick={() => setCertPreview(null)}>
          <div className="pd-cert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pd-cert-modal__header">
              <div>
                <small>Chứng nhận sản phẩm</small>
                <h3>{certPreview.value}</h3>
              </div>
              <button type="button" onClick={() => setCertPreview(null)} aria-label="Đóng">
                ×
              </button>
            </div>
            {/\.pdf($|\?)/i.test(certPreview.fileUrl) ? (
              <iframe title={certPreview.value} src={certPreview.fileUrl} />
            ) : (
              <img src={certPreview.fileUrl} alt={certPreview.value} />
            )}
            <a href={certPreview.fileUrl} target="_blank" rel="noopener noreferrer">
              <FiExternalLink /> Mở tài liệu trong tab mới
            </a>
          </div>
        </div>
      )}
    </motion.main>
  );

  if (navigation.embedded) return pageContent;

  return (
    <>
      <Header />
      {pageContent}
      <Footer />
    </>
  );
};

export default ProductDetail;
