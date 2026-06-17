import React from 'react';
import { FiCloudRain, FiDroplet, FiShield, FiThermometer, FiWind } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import { insurancePlans, weatherCards } from '../data/farmerMockData';

function FarmerWeatherInsurance() {
  return (
    <div className="farmer-stack">
      <section className="farmer-weather-hero">
        <span className="farmer-eyebrow farmer-eyebrow--light">Thời tiết & Bảo hiểm</span>
        <h2>Theo dõi rủi ro khí hậu trước khi thu hoạch và giao hàng.</h2>
        <p>
          Dữ liệu hiện là mô phỏng frontend. Khi nối backend, phần này có thể lấy từ weather API, cảnh báo thời tiết và gói bảo hiểm thật.
        </p>
      </section>

      <section className="farmer-grid farmer-grid--3">
        {weatherCards.map((item) => (
          <article className="farmer-weather-card" key={item.province}>
            <div className="farmer-weather-card__top">
              <div>
                <span>{item.condition}</span>
                <h3>{item.province}</h3>
              </div>
              <FiCloudRain />
            </div>
            <div className="farmer-weather-card__metrics">
              <p><FiThermometer /> {item.temp}°C</p>
              <p><FiDroplet /> {item.humidity}%</p>
              <p><FiWind /> {item.wind} km/h</p>
            </div>
            <strong>Rủi ro: {item.risk}</strong>
            <p>{item.advice}</p>
          </article>
        ))}
      </section>

      <section className="farmer-card">
        <SectionHeader
          eyebrow="Bảo hiểm đề xuất"
          title="Gói bảo vệ mùa vụ"
          desc="Gợi ý các gói bảo hiểm phù hợp cho nông sản, hợp đồng và kho lưu trữ."
        />
        <div className="farmer-insurance-grid">
          {insurancePlans.map((item) => (
            <article className="farmer-insurance-card" key={item.id}>
              <FiShield />
              <span>{item.provider}</span>
              <h3>{item.name}</h3>
              <p>{item.cover}</p>
              <strong>{item.price}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FarmerWeatherInsurance;
