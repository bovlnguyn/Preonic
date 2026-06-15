import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaChartLine,
  FaCheckCircle,
  FaCloudSun,
  FaLeaf,
} from "react-icons/fa";
import { ROUTES } from "../../../constants";
import { homeTrustPoints } from "../homeData";
import "./HomeHero.css";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 34,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: "easeOut",
    },
  },
};

function HomeHero() {
  return (
    <section className="home-hero">
      <div className="home-hero__overlay" />
      <div className="home-hero__sun" />
      <div className="home-hero__grain home-hero__grain--left" />
      <div className="home-hero__grain home-hero__grain--right" />

      <div className="home-container home-hero__grid">
        <motion.div
          className="home-hero__content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="home-hero__badge" variants={fadeUp}>
            <FaLeaf />
            Nền tảng kết nối nông nghiệp bền vững
          </motion.div>

          <motion.h1 variants={fadeUp}>
            Kết nối mùa vụ Việt với doanh nghiệp bằng dữ liệu minh bạch.
          </motion.h1>

          <motion.p variants={fadeUp}>
            PreOnic giúp nông dân quản lý nông sản, doanh nghiệp tìm nguồn cung
            đáng tin cậy và toàn bộ quá trình giao dịch được theo dõi rõ ràng từ
            đồng ruộng đến thị trường.
          </motion.p>

          <motion.div className="home-hero__actions" variants={fadeUp}>
            <Link to={ROUTES.PRODUCTS} className="home-btn home-btn--primary">
              Khám phá sản phẩm
              <FaArrowRight />
            </Link>

            <Link to={ROUTES.SOLUTIONS} className="home-btn home-hero__btn-light">
              Xem giải pháp
            </Link>
          </motion.div>

          <motion.div className="home-hero__trust" variants={fadeUp}>
            {homeTrustPoints.map((item) => (
              <span key={item}>
                <FaCheckCircle />
                {item}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="home-hero__visual"
          initial={{ opacity: 0, x: 48, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: 0.15,
          }}
        >
          <div className="home-field-card">
            <div className="home-field-card__image">
              <img src="/farmerDasB.jpg" alt="Nông dân trên đồng ruộng" />
            </div>

            <motion.div
              className="home-field-card__floating home-field-card__floating--top"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <FaCloudSun />

              <div>
                <strong>Thời tiết</strong>
                <span>Theo dõi mùa vụ</span>
              </div>
            </motion.div>

            <motion.div
              className="home-field-card__floating home-field-card__floating--bottom"
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <FaChartLine />

              <div>
                <strong>+32%</strong>
                <span>Tối ưu đầu ra</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HomeHero;