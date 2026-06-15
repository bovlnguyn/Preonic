import { motion } from "framer-motion";
import { FaHandshake, FaSeedling, FaShieldAlt } from "react-icons/fa";
import { solutionCards } from "../homeData";
import "./HomeSolutions.css";

const iconMap = {
  seedling: <FaSeedling />,
  handshake: <FaHandshake />,
  shield: <FaShieldAlt />,
};

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

function HomeSolutions() {
  return (
    <section className="home-section home-solutions">
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
            Giải pháp trọng tâm
          </motion.span>

          <motion.h2 variants={fadeUp}>
            PreOnic giải quyết điểm nghẽn của giao dịch nông sản.
          </motion.h2>

          <motion.p variants={fadeUp}>
            Không chỉ là nơi đăng bán sản phẩm, hệ thống còn hỗ trợ niềm tin giữa
            nông dân và doanh nghiệp thông qua dữ liệu, hợp đồng và đánh giá.
          </motion.p>
        </motion.div>

        <motion.div
          className="home-solutions__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.25,
          }}
        >
          {solutionCards.map((item) => (
            <motion.article
              className="home-solution-card"
              key={item.title}
              variants={fadeUp}
              whileHover={{
                y: -8,
              }}
              transition={{
                duration: 0.25,
              }}
            >
              <div className="home-solution-card__icon">{iconMap[item.icon]}</div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default HomeSolutions;