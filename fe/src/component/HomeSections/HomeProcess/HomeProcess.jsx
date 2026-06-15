import { motion } from "framer-motion";
import { processSteps } from "../homeData";
import "./HomeProcess.css";

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

function HomeProcess() {
  return (
    <section className="home-section home-process-flow">
      <div className="home-container home-process-flow__grid">
        <motion.div
          className="home-process-flow__content"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.25,
          }}
        >
          <motion.span className="home-section__eyebrow" variants={fadeUp}>
            Quy trình hoạt động
          </motion.span>

          <motion.h2 className="home-title" variants={fadeUp}>
            Từ mùa vụ ngoài đồng đến hợp đồng tiêu thụ chỉ trong một luồng xử lý.
          </motion.h2>

          <motion.p className="home-desc" variants={fadeUp}>
            Quy trình được thiết kế đơn giản để nông dân dễ sử dụng, đồng thời
            đủ rõ ràng cho doanh nghiệp kiểm tra thông tin và ra quyết định.
          </motion.p>
        </motion.div>

        <motion.div
          className="home-process-flow__steps"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.25,
          }}
        >
          {processSteps.map((step, index) => (
            <motion.article
              className="home-process-step"
              key={step.title}
              variants={fadeUp}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>

              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default HomeProcess;