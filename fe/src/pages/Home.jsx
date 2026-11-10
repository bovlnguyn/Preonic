import Header from "../component/Common/Header";
import Footer from "../component/Common/Footer";

import RegionalMarketplace from "../component/HomeSections/RegionalMarketplace/RegionalMarketplace";
import HomeStats from "../component/HomeSections/HomeStats/HomeStats";
import HomeIntro from "../component/HomeSections/HomeIntro/HomeIntro";

import "./Home.css";

function Home() {
  return (
    <div className="preonic-home">
      <Header />

      <main>
        <RegionalMarketplace />
        <HomeStats />
        <HomeIntro />
      </main>

      <Footer />
    </div>
  );
}

export default Home;
