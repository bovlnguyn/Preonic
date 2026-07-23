import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiFilter,
  FiPackage,
  FiPlusCircle,
  FiSearch,
  FiShield,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";

import Header from "../Common/Header";
import Footer from "../Common/Footer";
import farmerService from "../../services/farmer.service";
import "./FarmerProducts.css";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getProductName = (item) => item?.name || item?.productName || item?.title || "Nông sản chưa đặt tên";
const getRegion = (item) => item?.region || item?.province || item?.location || item?.address || "Chưa cập nhật vùng trồng";
const getHarvest = (item) => item?.harvestDate || item?.expectedHarvestDate || item?.harvestTime || "Đang cập nhật";

const getQuantity = (item) => {
  const quantity = Number(item?.quantity || item?.expectedQuantity || item?.stockQuantity || 0);
  const unit = item?.unit || item?.quantityUnit || "tấn";
  return quantity ? `${quantity.toLocaleString("vi-VN")} ${unit}` : "Đang cập nhật";
};

const getStatusMeta = (item) => {
  const status = String(item?.status || item?.approvalStatus || "active").toLowerCase();

  if (["pending", "waiting", "draft"].includes(status)) {
    return { label: "Chờ duyệt", className: "pending" };
  }

  if (["sold", "completed", "closed"].includes(status)) {
    return { label: "Đã hoàn tất", className: "done" };
  }

  if (["rejected", "inactive", "cancelled"].includes(status)) {
    return { label: "Cần chỉnh sửa", className: "danger" };
  }

  return { label: "Đang hiển thị", className: "active" };
};

function FarmerProducts() {
  const navigate = useNavigate();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("all");

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
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = crops.filter((item) => getStatusMeta(item).className === "active").length;
    const pending = crops.filter((item) => getStatusMeta(item).className === "pending").length;
    const quantity = crops.reduce((sum, item) => sum + Number(item?.quantity || item?.expectedQuantity || item?.stockQuantity || 0), 0);

    return [
      { label: "Tổng sản phẩm", value: loading ? "--" : crops.length, icon: FiPackage },
      { label: "Đang hiển thị", value: loading ? "--" : active, icon: FiEye },
      { label: "Chờ hoàn thiện", value: loading ? "--" : pending, icon: FiEdit3 },
      { label: "Sản lượng dự kiến", value: loading ? "--" : quantity.toLocaleString("vi-VN"), icon: FiTrendingUp },
    ];
  }, [crops, loading]);

  const filteredCrops = useMemo(() => {
    const text = normalizeText(keyword);

    return crops.filter((item) => {
      const status = getStatusMeta(item).className;
      const matchesFilter = filter === "all" || status === filter;
      const haystack = normalizeText(`${getProductName(item)} ${getRegion(item)} ${item?.category || ""}`);
      return matchesFilter && haystack.includes(text);
    });
  }, [crops, keyword, filter]);

  const guidance = [
    "Tên sản phẩm rõ ràng, đúng loại nông sản và vùng trồng.",
    "Có sản lượng, đơn vị, thời gian thu hoạch và giá mong muốn.",
    "Tải ảnh thật của vườn, quy cách đóng gói và chứng nhận nếu có.",
    "Nêu rõ cam kết chất lượng để tăng niềm tin với doanh nghiệp.",
  ];

  return (
    <div className="farmer-products-page">
      <Header />

      <main>
        <section className="fprod-hero">
          <div className="fprod-hero-glow" />
          <div className="fprod-container fprod-hero-grid">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.span className="fprod-eyebrow" variants={fadeUp}>
                <FiPackage /> Khu vực sản phẩm của nông dân
              </motion.span>
              <motion.h1 variants={fadeUp}>Quản lý nông sản đẹp hơn, dễ được doanh nghiệp tin hơn.</motion.h1>
              <motion.p variants={fadeUp}>
                Trang này gom nhanh các thông tin cần thiết về sản phẩm/mùa vụ của bạn: tình trạng hiển thị,
                cách chuẩn hóa hồ sơ và đường dẫn nhanh đến dashboard để đăng bán hoặc chỉnh sửa.
              </motion.p>
              <motion.div className="fprod-actions" variants={fadeUp}>
                <button type="button" className="fprod-btn primary" onClick={() => navigate("/farmer/create-product")}>
                  Đăng sản phẩm mới <FiPlusCircle />
                </button>
                <button type="button" className="fprod-btn ghost" onClick={() => navigate("/farmer/crops")}>
                  Mở dashboard sản phẩm <FiArrowRight />
                </button>
              </motion.div>
            </motion.div>

            <motion.aside
              className="fprod-quality-card"
              initial={{ opacity: 0, x: 34, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.12 }}
            >
              <span className="fprod-card-label">Checklist hồ sơ tốt</span>
              {guidance.map((item) => (
                <div className="fprod-check" key={item}>
                  <FiCheckCircle />
                  <span>{item}</span>
                </div>
              ))}
            </motion.aside>
          </div>
        </section>

        <section className="fprod-section">
          <div className="fprod-container">
            <motion.div className="fprod-stats" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div className="fprod-stat" key={item.label} variants={fadeUp}>
                    <span><Icon /></span>
                    <div>
                      <strong>{item.value}</strong>
                      <small>{item.label}</small>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="fprod-section fprod-list-section">
          <div className="fprod-container">
            <div className="fprod-section-head">
              <div>
                <span className="fprod-kicker">Sản phẩm của tôi</span>
                <h2>Mùa vụ đang gắn với tài khoản farmer</h2>
              </div>
              <button type="button" onClick={() => navigate("/farmer/crops")}>Xem trong dashboard <FiArrowRight /></button>
            </div>

            <div className="fprod-toolbar">
              <label className="fprod-search">
                <FiSearch />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm theo tên nông sản, vùng trồng..."
                />
              </label>

              <label className="fprod-filter">
                <FiFilter />
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hiển thị</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="done">Đã hoàn tất</option>
                  <option value="danger">Cần chỉnh sửa</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="fprod-empty">Đang tải sản phẩm của bạn...</div>
            ) : filteredCrops.length > 0 ? (
              <motion.div className="fprod-grid" initial="hidden" animate="show" variants={stagger}>
                {filteredCrops.slice(0, 6).map((item, index) => {
                  const status = getStatusMeta(item);
                  return (
                    <motion.article className="fprod-card" key={item?.id || index} variants={fadeUp}>
                      <div className="fprod-card-top">
                        <span className={`fprod-status ${status.className}`}>{status.label}</span>
                        <span className="fprod-index">#{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <h3>{getProductName(item)}</h3>
                      <p>{item?.description || "Nên bổ sung mô tả ngắn về chất lượng, quy cách và điều kiện giao hàng."}</p>
                      <div className="fprod-meta">
                        <span><FiTrendingUp /> {getQuantity(item)}</span>
                        <span><FiCalendar /> {getHarvest(item)}</span>
                      </div>
                      <div className="fprod-location">{getRegion(item)}</div>
                      <button type="button" onClick={() => navigate("/farmer/crops")}>
                        Quản lý sản phẩm <FiArrowRight />
                      </button>
                    </motion.article>
                  );
                })}
              </motion.div>
            ) : (
              <div className="fprod-empty strong">
                <FiPackage />
                <h3>Chưa có sản phẩm phù hợp</h3>
                <p>Bạn có thể đăng sản phẩm đầu tiên để doanh nghiệp tìm thấy nguồn cung của mình.</p>
                <button type="button" onClick={() => navigate("/farmer/create-product")}>Đăng sản phẩm ngay</button>
              </div>
            )}
          </div>
        </section>

        <section className="fprod-section fprod-trust-section">
          <div className="fprod-container fprod-trust-grid">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.span className="fprod-kicker" variants={fadeUp}>Gợi ý tối ưu</motion.span>
              <motion.h2 variants={fadeUp}>Muốn sản phẩm dễ được chốt hợp đồng hơn?</motion.h2>
              <motion.p variants={fadeUp}>
                Hãy ưu tiên ảnh thật, chứng nhận chất lượng và thông tin thu hoạch càng cụ thể càng tốt.
                Doanh nghiệp thường chọn nguồn cung có dữ liệu rõ, hồ sơ minh bạch và lịch sử giao dịch tốt.
              </motion.p>
            </motion.div>

            <motion.div className="fprod-trust-cards" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp}><FiShield /><strong>Minh bạch</strong><span>Giảm rủi ro tranh chấp khi ký hợp đồng.</span></motion.div>
              <motion.div variants={fadeUp}><FiStar /><strong>Uy tín</strong><span>Hồ sơ tốt giúp farmer nổi bật hơn.</span></motion.div>
              <motion.div variants={fadeUp}><FiCheckCircle /><strong>Dễ duyệt</strong><span>Thông tin đầy đủ giúp sản phẩm hiển thị tốt.</span></motion.div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default FarmerProducts;
