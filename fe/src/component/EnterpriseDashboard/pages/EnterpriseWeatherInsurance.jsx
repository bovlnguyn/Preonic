import React from 'react';
import { FiCloudRain, FiDroplet, FiShield, FiThermometer, FiWind } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import { enterpriseWeatherCards, enterpriseInsurancePlans } from '../data/enterpriseMockData';

function EnterpriseWeatherInsurance() {
  return (
    <div className="ent-stack">

      <section className="ent-weather-hero">
        <span className="ent-eyebrow ent-eyebrow--light">Thời tiết & Bảo hiểm</span>
        <h2>Theo dõi rủi ro khí hậu tại các vùng nguyên liệu đang hợp tác.</h2>
        <p>
          Dữ liệu hiện là mô phỏng frontend. Khi nối backend, phần này lấy từ weather API
          theo tọa độ GPS từng hợp đồng và cảnh báo trực tiếp tới nông dân.
        </p>
      </section>

      <section className="ent-weather-grid">
        {enterpriseWeatherCards.map((w) => (
          <article className="ent-weather-card" key={w.province}>
            <div className="ent-weather-card__top">
              <div>
                <span>{w.condition}</span>
                <h3>{w.province}</h3>
              </div>
              <FiCloudRain />
            </div>
            <div className="ent-weather-card__metrics">
              <p><FiThermometer /> {w.temp}°C</p>
              <p><FiDroplet /> {w.humidity}%</p>
              <p><FiWind /> {w.wind} km/h</p>
            </div>
            <strong>Rủi ro: {w.risk}</strong>
            <p>{w.advice}</p>
          </article>
        ))}
      </section>

      <section className="ent-card">
        <SectionHeader
          eyebrow="Bảo hiểm đề xuất"
          title="Gói bảo vệ nông sản và hợp đồng"
          desc="Gợi ý các gói bảo hiểm phù hợp cho từng loại rủi ro theo mùa vụ và khu vực."
        />
        <div className="ent-insurance-grid">
          {enterpriseInsurancePlans.map((plan) => (
            <article className="ent-insurance-card" key={plan.id}>
              <FiShield />
              <span>{plan.provider}</span>
              <h3>{plan.name}</h3>
              <p>{plan.coverages.join(' • ')}</p>
              <strong>Hotline: {plan.hotline}</strong>
              <small>{plan.note}</small>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}

export default EnterpriseWeatherInsurance;