import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiFilter,
  FiMapPin,
  FiPackage,
  FiSearch,
  FiShield,
  FiStar,
  FiTruck,
} from "react-icons/fi";
import Header from "../Common/Header";
import Footer from "../Common/Footer";
import "./EnterpriseProducts.css";

const supplies = [
  {
    id: 1,
    name: "Sầu riêng Ri6 loại 1",
    farmer: "HTX Nông sản Krông Pắk",
    region: "Đắk Lắk",
    category: "Trái cây",
    harvest: "Tháng 8 - 9",
    volume: "35 tấn",
    price: 72000,
    unit: "kg",
    certificate: "VietGAP",
    rating: 4.9,
    delivery: "7 ngày",
    match: 96,
    status: "Sẵn sàng ký HĐ",
  },
  {
    id: 2,
    name: "Xoài cát Hòa Lộc",
    farmer: "Vườn Minh Tâm",
    region: "Đồng Tháp",
    category: "Trái cây",
    harvest: "Tháng 6 - 7",
    volume: "18 tấn",
    price: 38000,
    unit: "kg",
    certificate: "GlobalG.A.P",
    rating: 4.8,
    delivery: "5 ngày",
    match: 88,
    status: "Đang nhận đặt cọc",
  },
  {
    id: 3,
    name: "Cà phê Robusta nhân xanh",
    farmer: "Trang trại Lâm Hà",
    region: "Lâm Đồng",
    category: "Công nghiệp",
    harvest: "Tháng 11 - 12",
    volume: "50 tấn",
    price: 62500,
    unit: "kg",
    certificate: "Organic",
    rating: 4.7,
    delivery: "10 ngày",
    match: 91,
    status: "Ưu tiên doanh nghiệp",
  },
  {
    id: 4,
    name: "Gạo ST25 vụ Hè Thu",
    farmer: "HTX Đồng Xanh",
    region: "Sóc Trăng",
    category: "Lúa gạo",
    harvest: "Tháng 7 - 8",
    volume: "120 tấn",
    price: 18500,
    unit: "kg",
    certificate: "OCOP 4 sao",
    rating: 4.85,
    delivery: "12 ngày",
    match: 94,
    status: "Có thể bao tiêu",
  },
  {
    id: 5,
    name: "Thanh long ruột đỏ",
    farmer: "Nông hộ Phước An",
    region: "Bình Thuận",
    category: "Trái cây",
    harvest: "Quanh năm",
    volume: "26 tấn",
    price: 21000,
    unit: "kg",
    certificate: "VietGAP",
    rating: 4.6,
    delivery: "4 ngày",
    match: 84,
    status: "Cần xác nhận lịch giao",
  },
  {
    id: 6,
    name: "Rau thủy canh hỗn hợp",
    farmer: "Farm Green House",
    region: "Đà Lạt",
    category: "Rau củ",
    harvest: "Hàng tuần",
    volume: "8 tấn",
    price: 27000,
    unit: "kg",
    certificate: "An toàn sinh học",
    rating: 4.75,
    delivery: "48 giờ",
    match: 89,
    status: "Giao nhanh nội vùng",
  },
];

const categories = ["Tất cả", "Trái cây", "Lúa gạo", "Rau củ", "Công nghiệp"];
const regions = ["Tất cả", "Đắk Lắk", "Đồng Tháp", "Lâm Đồng", "Sóc Trăng", "Bình Thuận", "Đà Lạt"];

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function EnterpriseProducts() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [region, setRegion] = useState("Tất cả");

  const filteredSupplies = useMemo(() => {
    return supplies.filter((item) => {
      const matchesKeyword = `${item.name} ${item.farmer} ${item.region}`.toLowerCase().includes(keyword.toLowerCase());
      const matchesCategory = category === "Tất cả" || item.category === category;
      const matchesRegion = region === "Tất cả" || item.region === region;
      return matchesKeyword && matchesCategory && matchesRegion;
    });
  }, [keyword, category, region]);

  return (
    <div className="enterprise-products-page">
      <Header />

      <main>
        <section className="ep-hero">
          <div className="ep-container ep-hero__grid">
            <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="ep-eyebrow"><FiPackage /> Enterprise supply marketplace</span>
              <h1>Tìm nguồn cung nông sản phù hợp để thu mua và ký hợp đồng.</h1>
              <p>
                Trang này mô phỏng danh sách nguồn cung dành cho doanh nghiệp. Sau này backend có thể nối vào API sản phẩm để lọc theo mùa vụ, vùng miền, chứng chỉ và sản lượng thực tế.
              </p>
            </motion.div>

            <motion.div className="ep-hero__panel" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.12 }}>
              <strong>{filteredSupplies.length}</strong>
              <span>nguồn cung đang khớp bộ lọc</span>
              <div className="ep-hero__badges">
                <em><FiShield /> Escrow ready</em>
                <em><FiCheckCircle /> Verified profile</em>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="ep-container ep-filter-card">
          <div className="ep-search-box">
            <FiSearch />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên nông sản, farmer hoặc khu vực..."
            />
          </div>

          <div className="ep-select-group">
            <label>
              <FiFilter /> Danh mục
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <FiMapPin /> Khu vực
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                {regions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="ep-container ep-content-grid">
          <div className="ep-list">
            {filteredSupplies.map((item, index) => (
              <motion.article
                className="ep-product-card"
                key={item.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <div className="ep-product-card__image">
                  <FiPackage />
                  <span>{item.category}</span>
                </div>

                <div className="ep-product-card__body">
                  <div className="ep-product-card__top">
                    <div>
                      <h3>{item.name}</h3>
                      <p><FiMapPin /> {item.region} · {item.farmer}</p>
                    </div>
                    <strong>{formatPrice(item.price)}đ/{item.unit}</strong>
                  </div>

                  <div className="ep-meta-grid">
                    <span>Sản lượng <b>{item.volume}</b></span>
                    <span>Mùa vụ <b>{item.harvest}</b></span>
                    <span>Chứng chỉ <b>{item.certificate}</b></span>
                    <span>Giao hàng <b>{item.delivery}</b></span>
                  </div>

                  <div className="ep-product-card__bottom">
                    <div className="ep-rating"><FiStar /> {item.rating} · {item.status}</div>
                    <div className="ep-match">
                      <span>Độ phù hợp {item.match}%</span>
                      <div><i style={{ width: `${item.match}%` }} /></div>
                    </div>
                  </div>

                  <div className="ep-actions">
                    <button type="button" onClick={() => navigate("/enterprise/contracts")}>Gửi đề xuất hợp đồng</button>
                    <button type="button" className="ghost" onClick={() => navigate("/enterprise/suppliers")}>Xem nhà cung cấp <FiArrowRight /></button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <aside className="ep-side-panel">
            <h2>Gợi ý thu mua</h2>
            <div className="ep-insight">
              <FiTruck />
              <div>
                <strong>Ưu tiên nguồn gần kho</strong>
                <span>Giảm chi phí vận chuyển và rủi ro giao trễ.</span>
              </div>
            </div>
            <div className="ep-insight">
              <FiShield />
              <div>
                <strong>Chọn hợp đồng có escrow</strong>
                <span>Tăng minh bạch khi đặt cọc mùa vụ.</span>
              </div>
            </div>
            <div className="ep-insight">
              <FiStar />
              <div>
                <strong>Kiểm tra rating farmer</strong>
                <span>Ưu tiên đối tác có lịch sử giao hàng ổn định.</span>
              </div>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default EnterpriseProducts;
