import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiCloud,
  FiDroplet,
  FiInfo,
  FiMap,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiShield,
  FiWind,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { VN_DISTRICTS, matchProvince, getDistricts } from "../../data/vn-locations";
import weatherService from "../../services/weather.service";
import { INSURANCE_PROGRAMS } from "../../constants";
import WeatherVisual, { getWeatherScene } from "./WeatherVisual";
import "./WeatherInsurance.css";

const KNOWN_PROVINCE_LABELS = {
  "Ha Noi": "Hà Nội", "Ho Chi Minh": "TP. Hồ Chí Minh", "Da Nang": "Đà Nẵng",
  "Hai Phong": "Hải Phòng", "Can Tho": "Cần Thơ", "Binh Duong": "Bình Dương",
  "Dong Nai": "Đồng Nai", "Lam Dong": "Lâm Đồng", "Dak Lak": "Đắk Lắk",
  "Gia Lai": "Gia Lai", "Long An": "Long An", "Tien Giang": "Tiền Giang",
  "Ben Tre": "Bến Tre", "An Giang": "An Giang", "Binh Thuan": "Bình Thuận",
  "Khanh Hoa": "Khánh Hòa", "Tay Ninh": "Tây Ninh", "Thai Nguyen": "Thái Nguyên",
  "Bac Giang": "Bắc Giang", "Thanh Hoa": "Thanh Hóa", "Nghe An": "Nghệ An",
  "Ha Tinh": "Hà Tĩnh", "Quang Binh": "Quảng Bình", "Thua Thien Hue": "Thừa Thiên Huế",
  "Hue": "Thừa Thiên Huế", "Quang Nam": "Quảng Nam", "Quang Ngai": "Quảng Ngãi",
  "Binh Dinh": "Bình Định", "Phu Yen": "Phú Yên", "Kien Giang": "Kiên Giang",
  "Kon Tum": "Kon Tum", "Son La": "Sơn La", "Lai Chau": "Lai Châu", "Ha Giang": "Hà Giang",
  "Phu Tho": "Phú Thọ", "Lang Son": "Lạng Sơn", "Quang Ninh": "Quảng Ninh",
};

const VIETNAM_PROVINCES = Object.keys(VN_DISTRICTS || {}).map((value) => ({
  value,
  label: KNOWN_PROVINCE_LABELS[value] || value,
}));

const VIETNAM_CENTER_COORDS = { lat: 16, lng: 107 };
const WINDY_ZOOM_DISTRICT = 10;
const WINDY_ZOOM_PROVINCE = 8;

const ALERT_TYPE_LABEL = {
  extreme_heat: "Nắng nóng",
  extreme_cold: "Rét đậm",
  heavy_rain: "Mưa lớn",
  strong_wind: "Gió mạnh",
  drought: "Hạn hán",
};

const ROLE_CONTENT = {
  farmer: {
    eyebrow: "FARMER WEATHER CENTER",
    subtitle: "Theo dõi thời tiết và quản lý rủi ro bảo hiểm cho vùng canh tác.",
  },
  enterprise: {
    eyebrow: "THỜI TIẾT & BẢO HIỂM",
    subtitle: "Theo dõi rủi ro khí hậu tại các vùng nguyên liệu đang hợp tác.",
  },
};

const readMessage = (reason) =>
  reason?.message || reason?.data?.message || reason?.response?.data?.message || "Không thể kết nối dịch vụ thời tiết.";

function InsuranceSection({ weather, alerts }) {
  const [expanded, setExpanded] = useState(null);

  const risk = useMemo(() => {
    const critical = alerts.filter((alert) => alert.severity === "critical" && !alert.isRead);
    const warning = alerts.filter((alert) => alert.severity === "warning" && !alert.isRead);
    if (critical.length > 0) return { label: "Cao", key: "high", Icon: FiAlertTriangle };
    if (warning.length > 0) return { label: "Trung bình", key: "medium", Icon: FiAlertTriangle };
    return { label: "Thấp", key: "low", Icon: FiCheckCircle };
  }, [alerts]);

  const activeAlertTypes = useMemo(
    () => [...new Set(alerts.filter((alert) => !alert.isRead).map((alert) => alert.alertType))],
    [alerts]
  );

  return (
    <div className="ins-page">
      <div className={`ins-risk-banner ins-risk-${risk.key}`}>
        <div className="ins-risk-icon-wrap"><risk.Icon size={22} /></div>
        <div className="ins-risk-content">
          <span className="ins-risk-label">Mức rủi ro thời tiết hiện tại</span>
          <strong className="ins-risk-level">{risk.label}</strong>
          <p className="ins-risk-desc">
            {activeAlertTypes.length > 0 ? (
              <>Đang có cảnh báo: <strong>{activeAlertTypes.map((type) => ALERT_TYPE_LABEL[type] || type).join(", ")}</strong>. Khuyến nghị kiểm tra gói bảo hiểm phù hợp.</>
            ) : (
              "Thời tiết đang ổn định. Đây là thời điểm phù hợp để chủ động bảo vệ mùa vụ và chuỗi cung ứng."
            )}
          </p>
          {weather && (
            <div className="ins-weather-chips">
              <span className="ins-chip"><FiDroplet size={12} /> {weather.humidity}% độ ẩm</span>
              <span className="ins-chip"><FiWind size={12} /> {Number(weather.windSpeed || 0).toFixed(1)} km/h</span>
              <span className="ins-chip"><FiCloud size={12} /> {Number(weather.temp || 0).toFixed(1)}°C</span>
            </div>
          )}
        </div>
      </div>

      <div className="ins-section-header">
        <h3 className="ins-section-title">Các gói bảo hiểm nông nghiệp</h3>
        <p className="ins-section-sub">Thông tin tham khảo các chương trình bảo hiểm phổ biến tại Việt Nam</p>
      </div>

      <div className="ins-program-list">
        {INSURANCE_PROGRAMS.map((program) => {
          const isOpen = expanded === program.id;
          return (
            <div key={program.id} className={`ins-program-card ${isOpen ? "open" : ""}`} style={{ "--program-accent": program.accentColor }}>
              <button type="button" className="ins-program-header" onClick={() => setExpanded(isOpen ? null : program.id)} aria-expanded={isOpen}>
                <div className="ins-program-icon"><FiShield size={18} /></div>
                <div className="ins-program-info">
                  <span className="ins-program-name">{program.name}</span>
                  <span className="ins-program-provider">{program.provider}</span>
                </div>
                <div className="ins-program-actions">
                  <a href={`tel:${program.hotline.replace(/\s/g, "")}`} className="ins-hotline-btn" onClick={(event) => event.stopPropagation()}>
                    <FiPhone size={12} /> {program.hotline}
                  </a>
                  <span className={`ins-chevron ${isOpen ? "open" : ""}`}><FiChevronDown size={16} /></span>
                </div>
              </button>

              {isOpen && (
                <div className="ins-program-body">
                  <div className="ins-coverages-grid">
                    <div className="ins-coverages-col">
                      <div className="ins-col-label"><FiCheckCircle size={13} /> Phạm vi bảo hiểm</div>
                      <ul className="ins-coverage-list">{program.coverages.map((coverage) => <li key={coverage}>{coverage}</li>)}</ul>
                    </div>
                    <div className="ins-coverages-col">
                      <div className="ins-col-label"><FiInfo size={13} /> Phù hợp với</div>
                      <ul className="ins-coverage-list">{program.suitable.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  </div>
                  <div className="ins-note-row"><FiInfo size={13} /><span>{program.note}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ins-govt-card">
        <div className="ins-govt-icon"><FiShield size={20} /></div>
        <div>
          <p className="ins-govt-title">Chương trình hỗ trợ phí bảo hiểm Nhà nước</p>
          <p className="ins-govt-desc">
            Theo <strong>Nghị định 58/2018/NĐ-CP</strong>, nông dân nghèo và cận nghèo được hỗ trợ tới <strong>90%</strong> phí bảo hiểm; các đối tượng khác có thể được hỗ trợ theo chính sách hiện hành. Liên hệ cơ quan địa phương để được hướng dẫn.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WeatherInsurancePage({ role }) {
  const { user } = useAuth();
  const requestedRole = String(role || user?.role || "farmer").toLowerCase();
  const resolvedRole = requestedRole === "enterprise" ? "enterprise" : "farmer";
  const content = ROLE_CONTENT[resolvedRole];
  const defaultProvince = matchProvince(user?.province) || "Ha Noi";

  const [selectedProvince, setSelectedProvince] = useState(defaultProvince);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertPagination, setAlertPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingMoreAlerts, setLoadingMoreAlerts] = useState(false);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("weather");
  const [provinceCoords, setProvinceCoords] = useState({});
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    weatherService.getProvinceCoords()
      .then((coords) => { if (!cancelled) setProvinceCoords(coords); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const districtOptions = useMemo(() => getDistricts(selectedProvince), [selectedProvince]);

  const loadData = useCallback(async (province, district = '') => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      weatherService.getCurrentWeather(province, district),
      weatherService.getForecast(province, district),
      weatherService.getAlerts(1, 10, { province, district }),
      weatherService.getThresholds(),
    ]);

    const [weatherResult, forecastResult, alertsResult, thresholdsResult] = results;

    if (weatherResult.status === "fulfilled") setWeather(weatherResult.value?.data || null);
    if (forecastResult.status === "fulfilled") setForecast(Array.isArray(forecastResult.value?.data) ? forecastResult.value.data : []);
    if (alertsResult.status === "fulfilled") {
      setAlerts(Array.isArray(alertsResult.value?.data) ? alertsResult.value.data : []);
      setAlertPagination(alertsResult.value?.pagination || { page: 1, totalPages: 1, total: 0 });
    }
    if (thresholdsResult.status === "fulfilled") setThresholds(thresholdsResult.value?.data || null);

    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length === results.length) {
      setError(readMessage(failed[0]?.reason));
    } else if (weatherResult.status === "rejected") {
      setError("Không lấy được thời tiết hiện tại. Các dữ liệu còn lại vẫn được giữ để bạn tiếp tục theo dõi.");
    }

    if (results.some((result) => result.status === "fulfilled")) setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(selectedProvince, selectedDistrict);
  }, [loadData, selectedProvince, selectedDistrict]);

  const handleProvinceChange = (event) => {
    setSelectedProvince(event.target.value);
    setSelectedDistrict("");
  };

  const markRead = async (id) => {
    if (!id) return;
    try {
      await weatherService.markAlertAsRead(id);
      setAlerts((current) => current.map((alert) => (alert._id === id || alert.id === id ? { ...alert, isRead: true } : alert)));
    } catch {}
  };

  const markAllRead = async () => {
    if (!alerts.some((alert) => !alert.isRead)) return;
    try {
      await weatherService.markAllAlertsAsRead({ province: selectedProvince, district: selectedDistrict });
      setAlerts((current) => current.map((alert) => ({ ...alert, isRead: true })));
    } catch {}
  };

  const loadMoreAlerts = async () => {
    const nextPage = Number(alertPagination?.page || 1) + 1;
    if (loadingMoreAlerts || nextPage > Number(alertPagination?.totalPages || 1)) return;
    setLoadingMoreAlerts(true);
    try {
      const result = await weatherService.getAlerts(nextPage, 10, {
        province: selectedProvince,
        district: selectedDistrict,
      });
      const more = Array.isArray(result?.data) ? result.data : [];
      setAlerts((current) => {
        const existingIds = new Set(current.map((item) => item._id || item.id));
        return [...current, ...more.filter((item) => !existingIds.has(item._id || item.id))];
      });
      setAlertPagination(result?.pagination || alertPagination);
    } catch (reason) {
      setError(readMessage(reason));
    } finally {
      setLoadingMoreAlerts(false);
    }
  };

  const getAlertIconClass = (type) => ({
    extreme_heat: "heat",
    extreme_cold: "cold",
    heavy_rain: "rain",
    strong_wind: "wind",
    drought: "drought",
  })[type] || "rain";

  const formatDateStr = (date) => new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatForecastDate = (dateString) => {
    const date = new Date(dateString);
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return { day: days[date.getDay()], date: `${date.getDate()}/${date.getMonth() + 1}` };
  };

  const provinceLabel = VIETNAM_PROVINCES.find((province) => province.value === selectedProvince)?.label || selectedProvince;
  const displayLocation = selectedDistrict ? `${selectedDistrict}, ${provinceLabel}` : provinceLabel;
  const weatherCoords = Number.isFinite(Number(weather?.latitude)) && Number.isFinite(Number(weather?.longitude))
    ? { lat: Number(weather.latitude), lng: Number(weather.longitude) }
    : null;
  const coords = weatherCoords || provinceCoords[selectedProvince] || VIETNAM_CENTER_COORDS;
  const hasDistrictPrecision = !selectedDistrict || weather?.locationPrecision === "district";
  const windyZoom = selectedDistrict && hasDistrictPrecision ? WINDY_ZOOM_DISTRICT : WINDY_ZOOM_PROVINCE;
  const windyUrl = `https://embed.windy.com/embed2.html?lat=${coords.lat}&lon=${coords.lng}&detailLat=${coords.lat}&detailLon=${coords.lng}&zoom=${windyZoom}&level=surface&overlay=temp&menu=&message=&marker=true&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
  const unreadCount = alerts.filter((alert) => !alert.isRead).length;
  const scene = getWeatherScene(weather?.icon, weather?.description);

  const sectionTabs = [
    { key: "weather", label: "Thời tiết", Icon: FiCloud },
    { key: "map", label: "Bản đồ", Icon: FiMap },
    { key: "alerts", label: "Cảnh báo", Icon: FiBell, badge: unreadCount },
    { key: "thresholds", label: "Ngưỡng", Icon: FiZap },
    { key: "insurance", label: "Bảo hiểm", Icon: FiShield },
  ];

  return (
    <div className={`wi-shell wi-shell--${resolvedRole}`}>
      <div className="wi-breadcrumb"><span>Trang chủ</span><span>/</span><strong>Thời tiết &amp; Bảo hiểm</strong></div>

      <header className="wi-page-header">
        <div>
          <span className="wi-page-eyebrow">{content.eyebrow}</span>
          <h2>Thời tiết &amp; Bảo hiểm</h2>
          <p>{content.subtitle}</p>
        </div>
        <div className="wi-page-role"><FiShield size={15} /> {resolvedRole === "enterprise" ? "Không gian doanh nghiệp" : "Không gian nông dân"}</div>
      </header>

      {error && (
        <div className="wi-error-banner" role="alert">
          <FiAlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => loadData(selectedProvince, selectedDistrict)}>Thử lại</button>
        </div>
      )}

      <section className={`wthr-hero wthr-hero--${scene.kind} ${scene.isNight ? "is-night" : "is-day"}`}>
        <WeatherVisual icon={weather?.icon} description={weather?.description} className="wthr-hero-visual" />
        <div className="wthr-hero__ambient" />
        <div className="wthr-toolbar">
          <div className="wthr-loc-selects">
            <select className="wthr-loc-select" value={selectedProvince} onChange={handleProvinceChange} aria-label="Chọn tỉnh hoặc thành phố">
              {VIETNAM_PROVINCES.map((province) => <option key={province.value} value={province.value}>{province.label}</option>)}
            </select>
            <select className="wthr-loc-select" value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)} disabled={districtOptions.length === 0} aria-label="Chọn quận hoặc huyện">
              <option value="">{districtOptions.length > 0 ? "Tất cả Quận/Huyện" : "— Không có dữ liệu —"}</option>
              {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </div>
          <div className="wthr-toolbar__right">
            {lastUpdated && <span className="wthr-updated"><FiClock size={13} /> {lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button type="button" className="wthr-refresh-btn" onClick={() => loadData(selectedProvince, selectedDistrict)} disabled={loading}>
              <FiRefreshCw size={14} className={loading ? "is-spinning" : ""} /> {loading ? "Đang tải" : "Làm mới"}
            </button>
          </div>
        </div>

        {loading && !weather ? (
          <div className="wthr-hero-loading"><div className="wthr-spinner" /><span>Đang tải dữ liệu thời tiết...</span></div>
        ) : weather ? (
          <div className="wthr-hero-grid">
            <div className="wthr-current-copy">
              <div className="wthr-current-copy__panel">
                <div className="wthr-location-label"><FiMapPin size={14} /> {displayLocation}</div>
                <div className="wthr-temp">{Number(weather.temp || 0).toFixed(1)}°C</div>
                <div className="wthr-desc-text">{weather.description || "Đang cập nhật"}</div>
                <div className="wthr-feels-like">Cảm nhận ngoài trời tại khu vực đã chọn</div>
                {selectedDistrict && !hasDistrictPrecision && (
                  <div className="wthr-location-precision-note">Chưa định vị chính xác quận/huyện; dữ liệu đang dùng tọa độ trung tâm tỉnh/thành.</div>
                )}
              </div>
            </div>

            <div className="wthr-stats-grid">
              <div className="wthr-stat-badge"><span className="stat-emoji"><FiDroplet size={18} /></span><div><div className="stat-lbl">Độ ẩm</div><div className="stat-val">{weather.humidity}%</div></div></div>
              <div className="wthr-stat-badge"><span className="stat-emoji"><FiWind size={18} /></span><div><div className="stat-lbl">Gió</div><div className="stat-val">{Number(weather.windSpeed || 0).toFixed(1)} km/h</div></div></div>
              <div className="wthr-stat-badge"><span className="stat-emoji"><FiCloud size={18} /></span><div><div className="stat-lbl">Mưa 1h</div><div className="stat-val">{Number(weather.rain1h || 0).toFixed(1)} mm</div></div></div>
            </div>
          </div>
        ) : (
          <div className="wthr-empty-state"><FiCloud size={28} /><strong>Chưa có dữ liệu thời tiết</strong><span>Hãy thử làm mới hoặc chọn khu vực khác.</span></div>
        )}
      </section>

      <nav className="weather-section-tabs" aria-label="Các chức năng thời tiết">
        {sectionTabs.map(({ key, label, Icon, badge }) => (
          <button type="button" key={key} className={`ws-tab ${activeSection === key ? "active" : ""}`} onClick={() => setActiveSection(key)}>
            <Icon size={15} /> {label}
            {badge > 0 && <span className="ws-tab-badge">{badge}</span>}
          </button>
        ))}
      </nav>

      {!loading || weather ? (
        <>
          {activeSection === "weather" && (
            <section className="wi-surface wthr-forecast-section">
              <div className="wi-section-heading"><div><span>DỰ BÁO NGẮN HẠN</span><h3>Dự báo 5 ngày</h3></div><FiCloud size={20} /></div>
              <div className="wthr-forecast-strip">
                {forecast.length === 0 ? (
                  <div className="wthr-no-data">Chưa có dữ liệu dự báo</div>
                ) : forecast.map((item, index) => {
                  const label = formatForecastDate(item.date || item.dt_txt || "");
                  return (
                    <article key={`${item.date || item.dt_txt}-${index}`} className={`wthr-day-card ${index === 0 ? "today" : ""}`}>
                      <div className="wthr-day-top"><div><div className="wthr-day-label">{label.day}</div><div className="wthr-day-date">{label.date}</div></div>{index === 0 && <span>Hôm nay</span>}</div>
                      <WeatherVisual icon={item.icon} description={item.description} compact />
                      <div className="wthr-day-temp-max">{item.temp?.toFixed?.(0) ?? item.temp}°C</div>
                      <div className="wthr-day-desc">{item.description}</div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeSection === "map" && (
            <section className="wi-surface wthr-map-section">
              <div className="wi-section-heading"><div><span>BẢN ĐỒ TRỰC QUAN</span><h3>{displayLocation}</h3><p>Dữ liệu Windy.com — lớp nhiệt độ bề mặt</p></div><FiMap size={20} /></div>
              <iframe title="Bản đồ thời tiết Windy" src={windyUrl} frameBorder="0" className="wthr-map-frame" loading="lazy" />
            </section>
          )}

          {activeSection === "alerts" && (
            <section className="wi-surface weather-alerts-section">
              <div className="wa-header"><div><span>CẢNH BÁO KHU VỰC</span><h3>Cảnh báo thời tiết · {displayLocation}</h3></div>{alerts.length > 0 && <button type="button" onClick={markAllRead} className="wa-mark-all">Đánh dấu tất cả đã đọc</button>}</div>
              {alerts.length === 0 ? (
                <div className="wa-empty"><FiBell size={30} />Không có cảnh báo nào</div>
              ) : (
                <>
                <div className="wa-list">
                  {alerts.map((alert) => (
                    <article key={alert._id || alert.id} className={`wa-item ${alert.severity === "critical" ? "weather-critical" : "weather-warning"} ${alert.isRead ? "read" : "unread"}`} onClick={() => !alert.isRead && markRead(alert._id || alert.id)}>
                      <div className="wa-item-icon"><span className={`alert-type-icon ${getAlertIconClass(alert.alertType)}-icon`} /></div>
                      <div className="wa-item-body">
                        <div className="wa-item-header"><span className={`wa-badge ${alert.severity}`}>{alert.severity === "critical" ? "Khẩn cấp" : "Cảnh báo"}</span><span className="wa-type">{ALERT_TYPE_LABEL[alert.alertType] || alert.alertType}</span><span className="wa-date">{formatDateStr(alert.createdAt)}</span></div>
                        <p className="wa-message">{alert.message}</p>
                        {alert.thresholdExceeded && <p className="wa-detail">{alert.thresholdExceeded}</p>}
                        <p className="wa-location">{alert.location?.province}{alert.location?.district ? ` - ${alert.location.district}` : ""}</p>
                      </div>
                      <button type="button" className="wa-read-btn" onClick={(event) => { event.stopPropagation(); if (!alert.isRead) markRead(alert._id || alert.id); }} disabled={alert.isRead}>{alert.isRead ? "Đã đọc" : "Đánh dấu đã đọc"}</button>
                    </article>
                  ))}
                </div>
                {Number(alertPagination?.page || 1) < Number(alertPagination?.totalPages || 1) && (
                  <div className="wa-load-more-wrap">
                    <button type="button" className="wa-load-more" onClick={loadMoreAlerts} disabled={loadingMoreAlerts}>
                      {loadingMoreAlerts ? "Đang tải..." : `Xem thêm (${alerts.length}/${alertPagination.total})`}
                    </button>
                  </div>
                )}
                </>
              )}
            </section>
          )}

          {activeSection === "thresholds" && (
            <section className="wi-surface weather-thresholds-card">
              <div className="wi-section-heading"><div><span>GIÁM SÁT TỰ ĐỘNG</span><h3>Ngưỡng cảnh báo hệ thống</h3><p>Hệ thống phát cảnh báo khi chỉ số vượt các ngưỡng dưới đây.</p></div><FiZap size={20} /></div>
              <div className="wt-grid">
                <div className="wt-item heat"><span className="wt-icon heat-icon" /><div><h4>Nắng nóng</h4><p>Trên {thresholds?.extremeHeatTemp || 38}°C</p></div></div>
                <div className="wt-item cold"><span className="wt-icon cold-icon" /><div><h4>Rét đậm</h4><p>Dưới {thresholds?.extremeColdTemp || 5}°C</p></div></div>
                <div className="wt-item rain"><span className="wt-icon rain-icon" /><div><h4>Mưa lớn</h4><p>Trên {thresholds?.heavyRainMm || 100} mm/ngày</p></div></div>
                <div className="wt-item wind"><span className="wt-icon wind-icon" /><div><h4>Gió mạnh</h4><p>Trên {thresholds?.strongWindKmh || 60} km/h</p></div></div>
                <div className="wt-item drought"><span className="wt-icon drought-icon" /><div><h4>Hạn hán</h4><p>Dưới {thresholds?.droughtMm || 5} mm / {thresholds?.droughtDays || 14} ngày</p></div></div>
              </div>
            </section>
          )}

          {activeSection === "insurance" && <InsuranceSection weather={weather} alerts={alerts} />}
        </>
      ) : null}
    </div>
  );
}
