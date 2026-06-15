import { motion } from "framer-motion";
import { homeStats } from "../homeData";
import "./HomeStats.css";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 26,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut",
    },
  },
};

function HomeStats() {
  return (
    <motion.section
      className="home-stats"
      initial="hidden"
      whileInView="visible"
      viewport={{
        once: true,
        amount: 0.25,
      }}
    >
      <div className="home-container home-stats__grid">
        {homeStats.map((item, index) => (
          <motion.div
            className="home-stats__item"
            key={item.label}
            variants={fadeUp}
            transition={{
              delay: index * 0.08,
            }}
          >
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

export default HomeStats;