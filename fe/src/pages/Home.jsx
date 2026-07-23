import Header from "../component/Common/Header";
import Footer from "../component/Common/Footer";

import HomeHero from "../component/HomeSections/HomeHero/HomeHero";
import HomeStats from "../component/HomeSections/HomeStats/HomeStats";
import HomeIntro from "../component/HomeSections/HomeIntro/HomeIntro";
import HomeSolutions from "../component/HomeSections/HomeSolutions/HomeSolutions";
import HomeProductsPreview from "../component/HomeSections/HomeProductsPreview/HomeProductsPreview";
import HomeProcess from "../component/HomeSections/HomeProcess/HomeProcess";
import HomeCTA from "../component/HomeSections/HomeCTA/HomeCTA";

import "./Home.css";

function Home() {
  return (
    <div className="preonic-home">
      <Header />

      <main>
        <HomeHero />
        <HomeStats />
        <HomeIntro />
        <HomeSolutions />
        <HomeProductsPreview />
        <HomeProcess />
        <HomeCTA />
      </main>

      <Footer />
    </div>
  );
}

export default Home;