import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { ROUTES } from "../../../constants";
import bgImage from "../../../assets/home/BG2.jpg";
import "./HomeIntro.css";

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
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.62,
      ease: "easeOut",
    },
  },
};

const introPoints = [
  "Quản lý nông sản và mùa vụ",
  "Kết nối cung cầu theo khu vực",
  "Hợp đồng và thanh toán rõ ràng",
];

function HomeIntro() {
  return (
    <section className="home-section home-intro">
      <div className="home-container home-intro__grid">
        <motion.div
          className="home-intro__image"
          initial={{
            opacity: 0,
            x: -42,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
          }}
          viewport={{
            once: true,
            amount: 0.25,
          }}
          transition={{
            duration: 0.65,
            ease: "easeOut",
          }}
        >
          <img src={bgImage} alt="Đồng lúa Việt Nam" />
        </motion.div>

        <motion.div
          className="home-intro__content"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.25,
          }}
        >
          <motion.span className="home-section__eyebrow" variants={fadeUp}>
            Về Farmora
          </motion.span>

          <motion.h2 className="home-title" variants={fadeUp}>
            Một hệ sinh thái số cho nông dân, doanh nghiệp và chuỗi cung ứng.
          </motion.h2>

          <motion.p className="home-desc" variants={fadeUp}>
            Farmora kết nối nông dân với doanh nghiệp trong một không gian thống
            nhất, từ cập nhật mùa vụ và tìm nguồn cung đến hợp đồng, giao nhận và
            theo dõi giao dịch minh bạch.
          </motion.p>

          <motion.div className="home-intro__list" variants={fadeUp}>
            {introPoints.map((item) => (
              <div key={item}>
                <FaCheckCircle />
                {item}
              </div>
            ))}
          </motion.div>

          <motion.div className="home-intro__actions" variants={fadeUp}>
            <Link to={ROUTES.REGISTER} className="home-btn home-btn--primary">
              Đăng ký ngay <FaArrowRight />
            </Link>
            <Link to={ROUTES.CONTACT} className="home-btn home-btn--secondary">
              Liên hệ tư vấn
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default HomeIntro;
