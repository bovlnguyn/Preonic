import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiFilter,
  FiHome,
  FiPackage,
  FiSearch,
  FiShield,
  FiStar,
  FiTruck,
  FiUsers,
} from "react-icons/fi";

import Header from "../Common/Header";
import { useAuth } from "../../contexts/AuthContext";
import productService from "../../services/product.service";
import { COMPANY, ROUTES } from "../../constants";
import "./EnterpriseHome.css";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const formatMoney = (value = 0) => {
  const number = Number(value) || 0;
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)} tỷ`;
  if (number >= 1_000_000) return `${Math.round(number / 1_000_000)} triệu`;
  return number.toLocaleString("vi-VN");
};

const getProductPrice = (product) => {
  const price = Number(product?.price || product?.unitPrice || product?.expectedPrice || 0);
  const unit = product?.unit || product?.priceUnit || "kg";
  return price ? `${formatMoney(price)}đ/${unit}` : "Liên hệ";
};

function EnterpriseHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let mounted = true;

    productService
      .getProducts({ limit: 8 })
      .then((response) => {
        const data = response?.data?.products || response?.data || response?.products || [];
        if (mounted) setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setProducts([]);
      })
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const regions = new Set(
      products
        .map((item) => item?.region || item?.province || item?.location)
        .filter(Boolean)
    );

    return [
      {
        label: "Nguồn cung đang mở",
        value: loadingProducts ? "--" : products.length,
        note: "Sản phẩm có thể xem và gửi đề xuất",
        icon: FiPackage,
      },
      {
        label: "Vùng cung ứng",
        value: loadingProducts ? "--" : regions.size || "Toàn quốc",
        note: "Lọc theo khu vực, mùa vụ và chứng nhận",
        icon: FiFilter,
      },
      {
        label: "Bảo vệ đặt cọc",
        value: `${COMPANY.COMMISSION_RATE}%`,
        note: "Phí nền tảng khi giao dịch thành công",
        icon: FiShield,
      },
      {
        label: "Vai trò",
        value: "B2B",
        note: "Thu mua nông sản theo hợp đồng",
        icon: FiBriefcase,
      },
    ];
  }, [products, loadingProducts]);

  const quickActions = [
    {
      title: "Vào dashboard",
      desc: "Theo dõi tổng quan thu mua, hợp đồng, đơn hàng.",
      icon: FiBarChart2,
      action: () => navigate(ROUTES.ENTERPRISE),
      primary: true,
    },
    {
      title: "Tìm nông sản",
      desc: "Xem danh sách sản phẩm, lọc vùng miền và mùa vụ.",
      icon: FiSearch,
      action: () => navigate(ROUTES.PRODUCTS),
    },
    {
      title: "Nhà cung cấp",
      desc: "Quản lý farmer tiềm năng và lịch sử hợp tác.",
      icon: FiUsers,
      action: () => navigate("/enterprise/suppliers"),
    },
    {
      title: "Ví doanh nghiệp",
      desc: "Kiểm tra số dư, đặt cọc và lịch sử thanh toán.",
      icon: FiCreditCard,
      action: () => navigate("/enterprise/wallet"),
    },
  ];

  const featureCards = [
    {
      title: "Tìm nguồn cung theo mùa vụ",
      desc: "Doanh nghiệp có thể xem nông sản đang mở bán, sản lượng dự kiến, vùng trồng và thông tin farmer.",
      icon: FiSearch,
    },
    {
      title: "Đề xuất hợp đồng rõ ràng",
      desc: "Tạo đề xuất thu mua với giá, sản lượng, lịch giao hàng, điều khoản đặt cọc và nghiệm thu.",
      icon: FiFileText,
    },
    {
      title: "Escrow bảo vệ hai bên",
      desc: "Khoản cọc được ghi nhận qua hệ thống, giúp tăng niềm tin trước khi bắt đầu giao dịch lớn.",
      icon: FiShield,
    },
    {
      title: "Theo dõi giao hàng",
      desc: "Quản lý trạng thái đơn, nghiệm thu chất lượng và lưu lại lịch sử giao dịch minh bạch.",
      icon: FiTruck,
    },
  ];

  const process = [
    "Tìm sản phẩm phù hợp theo khu vực, chứng nhận và sản lượng",
    "Xem hồ sơ farmer, đánh giá uy tín và thông tin mùa vụ",
    "Gửi đề xuất hợp đồng, thống nhất đặt cọc và lịch giao hàng",
    "Theo dõi đơn, nghiệm thu và hoàn tất thanh toán an toàn",
  ];

  return (
    <div className="enterprise-role-home">
      <Header />

      <main>
        <section className="erh-hero">
          <div className="erh-orb erh-orb-one" />
          <div className="erh-orb erh-orb-two" />

          <div className="erh-container erh-hero-grid">
            <motion.div
              className="erh-hero-copy"
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              <motion.span className="erh-eyebrow" variants={fadeUp}>
                <FiHome /> Trang chủ dành cho doanh nghiệp
              </motion.span>

              <motion.h1 variants={fadeUp}>
                Xin chào {user?.fullName || user?.name || "doanh nghiệp"}, tìm nguồn cung nông sản an toàn hơn.
              </motion.h1>

              <motion.p variants={fadeUp}>
                Trang này giúp enterprise nắm nhanh quy trình thu mua trên {COMPANY.NAME}: tìm nông sản,
                kiểm tra nhà cung cấp, gửi đề xuất hợp đồng và quản lý đặt cọc qua dashboard.
              </motion.p>

              <motion.div className="erh-hero-actions" variants={fadeUp}>
                <button type="button" className="erh-btn erh-btn-primary" onClick={() => navigate(ROUTES.ENTERPRISE)}>
                  Vào dashboard <FiArrowRight />
                </button>
                <button type="button" className="erh-btn erh-btn-ghost" onClick={() => navigate(ROUTES.PRODUCTS)}>
                  Xem nguồn cung <FiPackage />
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              className="erh-hero-panel"
              initial={{ opacity: 0, x: 34, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.68, ease: "easeOut", delay: 0.15 }}
            >
              <div className="erh-panel-top">
                <span>PreOnic Enterprise Workspace</span>
                <strong>Bảng thu mua thông minh</strong>
              </div>

              <div className="erh-sourcing-card">
                <div>
                  <small>Nguồn cung phù hợp</small>
                  <h3>{loadingProducts ? "Đang đồng bộ" : `${products.length || 0} sản phẩm`}</h3>
                </div>
                <div className="erh-sourcing-bars">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="erh-panel-list">
                <span><FiCheckCircle /> Lọc sản phẩm theo vùng miền</span>
                <span><FiShield /> Đặt cọc và hợp đồng minh bạch</span>
                <span><FiStar /> Ưu tiên farmer có hồ sơ uy tín</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="erh-section erh-stats-section">
          <div className="erh-container">
            <motion.div
              className="erh-stats-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
            >
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="erh-stat-card" key={item.label} variants={fadeUp}>
                    <span className="erh-stat-icon"><Icon /></span>
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                    <small>{item.note}</small>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="erh-section">
          <div className="erh-container">
            <div className="erh-section-heading erh-section-heading-left">
              <span>Thao tác nhanh</span>
              <h2>Điều hướng đúng luồng thu mua của doanh nghiệp</h2>
              <p>Từ role home này, doanh nghiệp có thể quay về dashboard hoặc mở nhanh các màn hình quan trọng.</p>
            </div>

            <motion.div
              className="erh-actions-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
            >
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    type="button"
                    key={item.title}
                    className={`erh-action-card ${item.primary ? "is-primary" : ""}`}
                    onClick={item.action}
                    variants={fadeUp}
                  >
                    <span><Icon /></span>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                    <i><FiArrowRight /></i>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="erh-section erh-soft-section">
          <div className="erh-container erh-two-col">
            <motion.div
              className="erh-section-heading erh-section-heading-left"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={stagger}
            >
              <motion.span variants={fadeUp}>Quy trình B2B</motion.span>
              <motion.h2 variants={fadeUp}>Thu mua nông sản theo hợp đồng chỉ trong một luồng</motion.h2>
              <motion.p variants={fadeUp}>
                Thiết kế dành cho doanh nghiệp cần nguồn hàng ổn định, có thông tin mùa vụ rõ ràng và cơ chế bảo vệ giao dịch.
              </motion.p>
              <motion.button type="button" className="erh-btn erh-btn-primary" onClick={() => navigate("/enterprise/contracts")} variants={fadeUp}>
                Quản lý hợp đồng <FiArrowRight />
              </motion.button>
            </motion.div>

            <motion.div
              className="erh-process-list"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
            >
              {process.map((text, index) => (
                <motion.div className="erh-process-item" key={text} variants={fadeUp}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="erh-section">
          <div className="erh-container">
            <div className="erh-section-heading">
              <span>Tính năng nổi bật</span>
              <h2>Tối ưu cho doanh nghiệp thu mua nông sản</h2>
              <p>Giao diện giữ chung tinh thần PreOnic nhưng dùng sắc xanh dương để phân biệt rõ workspace enterprise.</p>
            </div>

            <motion.div
              className="erh-feature-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
            >
              {featureCards.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="erh-feature-card" key={item.title} variants={fadeUp}>
                    <span><Icon /></span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="erh-section erh-products-section">
          <div className="erh-container">
            <div className="erh-section-heading erh-section-heading-left">
              <span>Nguồn cung gợi ý</span>
              <h2>Một số nông sản đang mở trên nền tảng</h2>
              <p>Dữ liệu lấy từ API sản phẩm công khai. Nếu API chưa có dữ liệu, giao diện vẫn hiển thị trạng thái rỗng đẹp mắt.</p>
            </div>

            {products.length > 0 ? (
              <motion.div
                className="erh-product-grid"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={stagger}
              >
                {products.slice(0, 3).map((product, index) => (
                  <motion.article className="erh-product-card" key={product?.id || product?._id || index} variants={fadeUp}>
                    <div className="erh-product-thumb">
                      <FiPackage />
                    </div>
                    <div>
                      <strong>{product?.name || product?.productName || "Nông sản chưa đặt tên"}</strong>
                      <p>{getProductPrice(product)}</p>
                      <small>{product?.region || product?.province || product?.location || "Khu vực đang cập nhật"}</small>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="erh-empty-products"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <FiPackage />
                <h3>{loadingProducts ? "Đang tải nguồn cung..." : "Chưa có nguồn cung để hiển thị"}</h3>
                <p>Vào trang sản phẩm để tìm kiếm, lọc dữ liệu hoặc kiểm tra backend API.</p>
                <button type="button" className="erh-btn erh-btn-primary" onClick={() => navigate(ROUTES.PRODUCTS)}>
                  Mở danh sách sản phẩm <FiArrowRight />
                </button>
              </motion.div>
            )}
          </div>
        </section>

        <section className="erh-cta">
          <div className="erh-container erh-cta-inner">
            <div>
              <span>Enterprise workspace</span>
              <h2>Sẵn sàng quay lại dashboard thu mua?</h2>
              <p>Tiếp tục quản lý hợp đồng, nhà cung cấp, escrow và đơn hàng trong workspace doanh nghiệp.</p>
            </div>
            <button type="button" className="erh-btn erh-btn-light" onClick={() => navigate(ROUTES.ENTERPRISE)}>
              Quay về dashboard <FiArrowRight />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default EnterpriseHome;
