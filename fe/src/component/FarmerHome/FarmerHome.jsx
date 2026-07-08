import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiCloudRain,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiPackage,
  FiPlusCircle,
  FiShield,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";

import Header from "../Common/Header";
import { useAuth } from "../../contexts/AuthContext";
import farmerService from "../../services/farmer.service";
import { COMPANY, ROUTES } from "../../constants";
import "./FarmerHome.css";

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

const getCropQuantity = (crop) => {
  const quantity = Number(crop?.quantity || crop?.expectedQuantity || crop?.stockQuantity || 0);
  const unit = crop?.unit || crop?.quantityUnit || "tấn";
  return quantity ? `${quantity.toLocaleString("vi-VN")} ${unit}` : "Đang cập nhật";
};

function FarmerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);

  useEffect(() => {
    let mounted = true;

    farmerService
      .getMyCrops()
      .then((data) => {
        if (mounted) setCrops(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setCrops([]);
      })
      .finally(() => {
        if (mounted) setLoadingCrops(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const dashboardStats = useMemo(() => {
    const totalCrops = crops.length;
    const activeCrops = crops.filter((item) => {
      const status = String(item?.status || item?.approvalStatus || "").toLowerCase();
      return !status || ["active", "approved", "available", "published"].includes(status);
    }).length;

    const totalQuantity = crops.reduce((sum, item) => {
      return sum + Number(item?.quantity || item?.expectedQuantity || item?.stockQuantity || 0);
    }, 0);

    return [
      {
        label: "Mùa vụ đã đăng",
        value: loadingCrops ? "--" : totalCrops,
        note: `${activeCrops || 0} mùa vụ đang hiển thị`,
        icon: FiPackage,
      },
      {
        label: "Sản lượng dự kiến",
        value: loadingCrops ? "--" : `${totalQuantity || 0}`,
        note: "Tổng sản lượng từ sản phẩm của bạn",
        icon: FiTrendingUp,
      },
      {
        label: "Bảo vệ giao dịch",
        value: `${COMPANY.COMMISSION_RATE}%`,
        note: "Phí trung gian khi ký hợp đồng",
        icon: FiShield,
      },
      {
        label: "Hồ sơ uy tín",
        value: user?.reputationScore ? Number(user.reputationScore).toFixed(1) : "Mới",
        note: "Cập nhật chứng nhận để tăng niềm tin",
        icon: FiStar,
      },
    ];
  }, [crops, loadingCrops, user]);

  const quickActions = [
    {
      title: "Vào dashboard",
      desc: "Theo dõi tổng quan mùa vụ, hợp đồng và ví.",
      icon: FiBarChart2,
      action: () => navigate(ROUTES.FARMER),
      primary: true,
    },
    {
      title: "Đăng bán nông sản",
      desc: "Tạo mùa vụ mới, thêm ảnh và chứng chỉ.",
      icon: FiPlusCircle,
      action: () => navigate("/farmer/create-product"),
    },
    {
      title: "Quản lý mùa vụ",
      desc: "Xem, cập nhật và theo dõi sản phẩm đã đăng.",
      icon: FiPackage,
      action: () => navigate("/farmer/crops"),
    },
    {
      title: "Ví & thanh toán",
      desc: "Kiểm tra giao dịch, đặt cọc và thanh toán.",
      icon: FiCreditCard,
      action: () => navigate("/farmer/wallet"),
    },
  ];

  const supportCards = [
    {
      title: "Chuẩn hóa hồ sơ mùa vụ",
      desc: "Gợi ý thông tin cần có: sản lượng, thời gian thu hoạch, chứng nhận, hình ảnh và cam kết chất lượng.",
      icon: FiCheckCircle,
    },
    {
      title: "Hợp đồng bao tiêu minh bạch",
      desc: "Doanh nghiệp gửi đề xuất, hai bên thống nhất điều khoản và hệ thống giữ cọc qua escrow.",
      icon: FiFileText,
    },
    {
      title: "Thời tiết & bảo hiểm",
      desc: "Theo dõi rủi ro mùa vụ, chương trình bảo hiểm và cảnh báo thời tiết trong dashboard.",
      icon: FiCloudRain,
    },
    {
      title: "Nâng điểm uy tín",
      desc: "Hoàn thiện hồ sơ, giao hàng đúng cam kết và nhận đánh giá tốt từ doanh nghiệp.",
      icon: FiAward,
    },
  ];

  const process = [
    "Đăng mùa vụ với thông tin rõ ràng",
    "Doanh nghiệp tìm kiếm và gửi đề xuất",
    "Thống nhất hợp đồng, đặt cọc an toàn",
    "Giao hàng, nghiệm thu và nhận thanh toán",
  ];

  return (
    <div className="farmer-role-home">
      <Header />

      <main>
        <section className="frh-hero">
          <div className="frh-orb frh-orb-one" />
          <div className="frh-orb frh-orb-two" />

          <div className="frh-container frh-hero-grid">
            <motion.div
              className="frh-hero-copy"
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              <motion.span className="frh-eyebrow" variants={fadeUp}>
                <FiHome /> Trang chủ dành cho nông dân
              </motion.span>

              <motion.h1 variants={fadeUp}>
                Xin chào {user?.fullName || user?.name || "nhà nông"}, hãy biến mùa vụ thành hợp đồng an toàn.
              </motion.h1>

              <motion.p variants={fadeUp}>
                Đây là trang thông tin nhanh cho farmer trên {COMPANY.NAME}: nắm quy trình, xem chỉ số mùa vụ,
                truy cập dashboard và chuẩn bị hồ sơ nông sản chuyên nghiệp hơn trước khi giao dịch với doanh nghiệp.
              </motion.p>

              <motion.div className="frh-hero-actions" variants={fadeUp}>
                <button type="button" className="frh-btn frh-btn-primary" onClick={() => navigate(ROUTES.FARMER)}>
                  Vào dashboard <FiArrowRight />
                </button>
                <button type="button" className="frh-btn frh-btn-ghost" onClick={() => navigate("/farmer/create-product")}>
                  Đăng nông sản <FiPlusCircle />
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              className="frh-hero-panel"
              initial={{ opacity: 0, x: 34, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.68, ease: "easeOut", delay: 0.15 }}
            >
              <div className="frh-panel-top">
                <span>PreOnic Farmer Workspace</span>
                <strong>Mùa vụ hôm nay</strong>
              </div>

              <div className="frh-growth-card">
                <div>
                  <small>Trạng thái hồ sơ</small>
                  <h3>{crops.length > 0 ? "Đang hoạt động" : "Sẵn sàng khởi tạo"}</h3>
                </div>
                <div className="frh-growth-ring">
                  <span>{crops.length > 0 ? "85%" : "40%"}</span>
                </div>
              </div>

              <div className="frh-panel-list">
                <span><FiCheckCircle /> Hồ sơ mùa vụ rõ ràng</span>
                <span><FiShield /> Đặt cọc qua trung gian</span>
                <span><FiStar /> Đánh giá đối tác sau giao dịch</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="frh-section frh-stats-section">
          <div className="frh-container">
            <motion.div
              className="frh-stats-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
            >
              {dashboardStats.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="frh-stat-card" key={item.label} variants={fadeUp}>
                    <span className="frh-stat-icon"><Icon /></span>
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                    <small>{item.note}</small>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="frh-section">
          <div className="frh-container">
            <div className="frh-section-heading frh-section-heading-left">
              <span>Thao tác nhanh</span>
              <h2>Làm việc nhanh hơn từ trang chủ farmer</h2>
              <p>Những lối tắt quan trọng nhất để bạn quay lại đúng màn hình trong dashboard chỉ với một lần bấm.</p>
            </div>

            <motion.div
              className="frh-actions-grid"
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
                    className={`frh-action-card ${item.primary ? "is-primary" : ""}`}
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

        <section className="frh-section frh-soft-section">
          <div className="frh-container frh-two-col">
            <motion.div
              className="frh-section-heading frh-section-heading-left"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={stagger}
            >
              <motion.span variants={fadeUp}>Quy trình giao dịch</motion.span>
              <motion.h2 variants={fadeUp}>Từ mùa vụ đến hợp đồng bao tiêu</motion.h2>
              <motion.p variants={fadeUp}>
                Farmer không chỉ đăng sản phẩm. Bạn đang xây dựng một hồ sơ cung ứng đáng tin cậy để doanh nghiệp có thể đặt cọc,
                ký hợp đồng và theo dõi đơn hàng minh bạch.
              </motion.p>
              <motion.button type="button" className="frh-btn frh-btn-primary" onClick={() => navigate("/farmer/contracts")} variants={fadeUp}>
                Xem hợp đồng <FiArrowRight />
              </motion.button>
            </motion.div>

            <motion.div
              className="frh-process-list"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
            >
              {process.map((text, index) => (
                <motion.div className="frh-process-item" key={text} variants={fadeUp}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="frh-section">
          <div className="frh-container">
            <div className="frh-section-heading">
              <span>Công cụ hỗ trợ</span>
              <h2>Trang thông tin giúp farmer bán hàng chuyên nghiệp hơn</h2>
              <p>Thiết kế đồng bộ với dashboard, tập trung vào sự rõ ràng, tin cậy và khả năng điều hướng nhanh.</p>
            </div>

            <motion.div
              className="frh-support-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
            >
              {supportCards.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="frh-support-card" key={item.title} variants={fadeUp}>
                    <span><Icon /></span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="frh-section frh-crops-section">
          <div className="frh-container">
            <div className="frh-section-heading frh-section-heading-left">
              <span>Mùa vụ gần đây</span>
              <h2>Theo dõi nhanh sản phẩm đã đăng</h2>
              <p>Nếu chưa có dữ liệu, bạn có thể bắt đầu bằng nút đăng bán nông sản ngay bên dưới.</p>
            </div>

            {crops.length > 0 ? (
              <motion.div
                className="frh-crop-grid"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={stagger}
              >
                {crops.slice(0, 3).map((crop, index) => (
                  <motion.article className="frh-crop-card" key={crop?.id || crop?._id || index} variants={fadeUp}>
                    <div className="frh-crop-thumb">
                      <FiPackage />
                    </div>
                    <div>
                      <strong>{crop?.name || crop?.productName || "Nông sản chưa đặt tên"}</strong>
                      <p>{getCropQuantity(crop)}</p>
                      <small>{crop?.region || crop?.location || crop?.province || "Khu vực đang cập nhật"}</small>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="frh-empty-crops"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <FiPackage />
                <h3>{loadingCrops ? "Đang tải mùa vụ..." : "Bạn chưa có mùa vụ nào"}</h3>
                <p>Đăng sản phẩm đầu tiên để doanh nghiệp có thể tìm thấy nguồn cung của bạn.</p>
                <button type="button" className="frh-btn frh-btn-primary" onClick={() => navigate("/farmer/create-product")}>
                  Đăng mùa vụ đầu tiên <FiArrowRight />
                </button>
              </motion.div>
            )}
          </div>
        </section>

        <section className="frh-cta">
          <div className="frh-container frh-cta-inner">
            <div>
              <span>Farmer workspace</span>
              <h2>Sẵn sàng quản lý mùa vụ trong dashboard?</h2>
              <p>Quay lại dashboard để tiếp tục cập nhật sản phẩm, theo dõi hợp đồng và quản lý thanh toán.</p>
            </div>
            <button type="button" className="frh-btn frh-btn-light" onClick={() => navigate(ROUTES.FARMER)}>
              Quay về dashboard <FiArrowRight />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FarmerHome;
