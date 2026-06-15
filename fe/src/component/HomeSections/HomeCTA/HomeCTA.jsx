import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight, FaQuoteLeft } from "react-icons/fa";
import { ROUTES } from "../../../constants";
import "./HomeCTA.css";

function HomeCTA() {
  return (
    <section className="home-section home-cta">
      <div className="home-container home-cta__box">
        <motion.div
          className="home-cta__content"
          initial={{
            opacity: 0,
            y: 34,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
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
          <span className="home-section__eyebrow">Bắt đầu cùng PreOnic</span>

          <h2 className="home-title">
            Sẵn sàng đưa nông sản Việt đến thị trường minh bạch hơn?
          </h2>

          <p className="home-desc">
            Tạo tài khoản để bắt đầu đăng bán nông sản, tìm nguồn cung hoặc quản lý
            giao dịch trên nền tảng.
          </p>

          <div className="home-cta__actions">
            <Link to={ROUTES.REGISTER} className="home-btn home-btn--primary">
              Đăng ký ngay
              <FaArrowRight />
            </Link>

            <Link to={ROUTES.CONTACT} className="home-btn home-btn--secondary">
              Liên hệ tư vấn
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="home-cta__quote"
          initial={{
            opacity: 0,
            scale: 0.94,
          }}
          whileInView={{
            opacity: 1,
            scale: 1,
          }}
          viewport={{
            once: true,
            amount: 0.25,
          }}
          transition={{
            duration: 0.65,
            ease: "easeOut",
            delay: 0.1,
          }}
        >
          <FaQuoteLeft />

          <p>
            “Mục tiêu của PreOnic là giúp giao dịch nông sản bớt phụ thuộc vào may
            rủi, tăng tính minh bạch và tạo niềm tin giữa các bên.”
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default HomeCTA;