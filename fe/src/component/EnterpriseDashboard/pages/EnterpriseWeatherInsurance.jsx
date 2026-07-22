import React, { useEffect, useState } from 'react';
import { FiCloudRain, FiDroplet, FiShield, FiThermometer, FiWind, FiSearch } from 'react-icons/fi';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SectionHeader from '../components/SectionHeader';
import api from '../../../services/api';

function EnterpriseWeatherInsurance() {
  const [weatherCards, setWeatherCards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedForecast, setSelectedForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provinceInput, setProvinceInput] = useState('Ha Noi');

  const loadWeather = async (provinceValue) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/weather/forecast', {
        params: { provinces: provinceValue },
      });
      const cards = res.data?.data?.weatherCards || [];
      setWeatherCards(cards);
      if (cards.length > 0) {
        const first = cards[0];
        setSelectedProvince(first.province);
        setSelectedForecast(first.dailyForecast || []);
      }
    } catch (err) {
      setError('Không thể tải dữ liệu thời tiết từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather('Ha Noi,Da Nang,Đắk Lắk');
  }, []);

  useEffect(() => {
    if (!weatherCards.length) return;
    const target = weatherCards.find((item) => item.province === selectedProvince) || weatherCards[0];
    setSelectedProvince(target.province);
    setSelectedForecast(target.dailyForecast || []);
  }, [weatherCards, selectedProvince]);

  const handleSearch = (event) => {
    event.preventDefault();
    const value = provinceInput.trim();
    if (value) {
      loadWeather(value);
    }
  };

  const chartData = selectedForecast.map((day) => ({
    label: day.date.slice(5),
    maxTemp: day.maxTemp,
    minTemp: day.minTemp,
  }));

  return (
    <div className="ent-stack">
      <section className="ent-weather-hero">
        <span className="ent-eyebrow ent-eyebrow--light">Thời tiết & Bảo hiểm</span>
        <h2>Theo dõi rủi ro khí hậu tại các vùng nguyên liệu đang hợp tác.</h2>
        <p>
          Nhập tên tỉnh/thành để xem dự báo 7 ngày và biểu đồ nhiệt độ theo từng ngày.
        </p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          <input
            value={provinceInput}
            onChange={(event) => setProvinceInput(event.target.value)}
            placeholder="Ví dụ: Hà Nội, Đà Nẵng"
            style={{ minWidth: '240px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2dc' }}
          />
          <button type="submit" style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#2f855a', color: 'white', cursor: 'pointer' }}>
            <FiSearch style={{ marginRight: '6px' }} /> Tìm kiếm
          </button>
        </form>
      </section>

      {loading ? (
        <p>Đang tải dữ liệu thời tiết...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <>
          <section className="ent-weather-grid">
            {weatherCards.map((w) => (
              <article
                className={`ent-weather-card ${selectedProvince === w.province ? 'is-active' : ''}`}
                key={w.province}
                onClick={() => setSelectedProvince(w.province)}
                style={{ cursor: 'pointer' }}
              >
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
              eyebrow="Dự báo 7 ngày"
              title={`Thời tiết 7 ngày tại ${selectedProvince || 'địa điểm'}`}
              desc="Dữ liệu được cập nhật từ API thời tiết thực tế cho tuần tới."
            />
            <div style={{ height: '260px', marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="maxTemp" stroke="#ff7b54" strokeWidth={2} />
                  <Line type="monotone" dataKey="minTemp" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {selectedForecast.map((day) => (
                <article key={day.date} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#f8fafc' }}>
                  <strong>{day.date}</strong>
                  <p style={{ margin: '6px 0' }}>{day.condition}</p>
                  <p>Max {day.maxTemp}°C</p>
                  <p>Min {day.minTemp}°C</p>
                  <p>Precip {day.precipitation} mm</p>
                  <small>Rủi ro: {day.risk}</small>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="ent-card">
        <SectionHeader
          eyebrow="Bảo hiểm đề xuất"
          title="Gói bảo vệ nông sản và hợp đồng"
          desc="Gợi ý các gói bảo hiểm phù hợp cho từng loại rủi ro theo mùa vụ và khu vực."
        />
        <div className="ent-insurance-grid">
          <article className="ent-insurance-card">
            <FiShield />
            <span>PreOnic Protect</span>
            <h3>Bảo hiểm mùa vụ nâng cao</h3>
            <p>Mưa bão, hạn hán, ngập úng, giảm năng suất.</p>
            <strong>Hotline: 1900 6688</strong>
            <small>Phù hợp cho doanh nghiệp có nhiều vùng nguyên liệu.</small>
          </article>
        </div>
      </section>
    </div>
  );
}

export default EnterpriseWeatherInsurance;