import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight, FaSeedling } from "react-icons/fa";
import { ROUTES } from "../../../constants";
import { featuredProducts } from "../homeData";
import "./HomeProductsPreview.css";

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
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
      ease: "easeOut",
    },
  },
};

function HomeProductsPreview() {
  return (
    <section className="home-section home-products-preview">
      <div className="home-container">
        <motion.div
          className="home-section__heading"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.25,
          }}
        >
          <motion.span className="home-section__eyebrow" variants={fadeUp}>
            Sản phẩm tiêu biểu
          </motion.span>

          <motion.h2 variants={fadeUp}>
            Nông sản thân thuộc với người Việt, được quản lý theo hướng minh bạch.
          </motion.h2>

          <motion.p variants={fadeUp}>
            Các nhóm sản phẩm nổi bật được thiết kế để phù hợp với quy trình thu mua,
            kiểm tra và giao dịch giữa nông dân và doanh nghiệp.
          </motion.p>
        </motion.div>

        <motion.div
          className="home-products-preview__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.2,
          }}
        >
          {featuredProducts.map((product) => (
            <motion.article
              className="home-product-card"
              key={product.title}
              variants={fadeUp}
              whileHover={{
                y: -8,
              }}
              transition={{
                duration: 0.25,
              }}
            >
              <div className="home-product-card__image">
                <img src={product.image} alt={product.title} />
              </div>

              <div className="home-product-card__body">
                <span>
                  <FaSeedling />
                  {product.category}
                </span>

                <h3>{product.title}</h3>

                <p>{product.description}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          className="home-products-preview__action"
          initial={{
            opacity: 0,
            y: 22,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.55,
            ease: "easeOut",
          }}
        >
          <Link to={ROUTES.PRODUCTS} className="home-btn home-btn--primary">
            Xem tất cả sản phẩm
            <FaArrowRight />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default HomeProductsPreview;