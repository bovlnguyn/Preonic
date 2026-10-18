import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPercent,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants";
import "../Common/DashboardResponsive.css";
import TongQuanContent from "./sections/TongQuanContent";
import QuanLyNguoiDung from "./sections/QuanLyNguoiDung";
import QuanLyHopDong from "./sections/QuanLyHopDong";
import QuanLyKhieuNai from "./sections/QuanLyKhieuNai";
import QuanLyGiaoDich from "./sections/QuanLyGiaoDich";
import QuanLyHoaHong from "./sections/QuanLyHoaHong";
import QuanLyNhatKy from "./sections/QuanLyNhatKy";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { key: "tongquan", label: "Tổng quan", icon: FiGrid },
  { key: "nguoidung", label: "Quản lý người dùng", icon: FiUsers },
  { key: "hopdong", label: "Quản lý hợp đồng", icon: FiFileText },
  { key: "khieunai", label: "Quản lý khiếu nại", icon: FiAlertTriangle },
  { key: "giaodich", label: "Quản lý giao dịch", icon: FiCreditCard },
  { key: "phidichvu", label: "Quản lý phí dịch vụ", icon: FiPercent },
  { key: "nhatky", label: "Nhật ký hệ thống", icon: FiActivity },
];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("tongquan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  const go = (nav) => { setActiveNav(nav); setSidebarOpen(false); };

  return (
    <div className="ad-layout">
      {sidebarOpen && <div className="dash-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      {/* SIDEBAR */}
      <aside className={`ad-sidebar dash-drawer ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="ad-logo" onClick={() => navigate(ROUTES.HOME)} aria-label="Về trang chủ">
          <div className="ad-logo-icon">
            <FiShield />
          </div>
          <div className="ad-logo-text">
            <h1>PreOnic</h1>
            <p>Bảng quản trị</p>
          </div>
        </button>

        <nav className="ad-nav" role="tablist" aria-label="Điều hướng quản trị">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeNav === key}
              className={`ad-nav-btn ${activeNav === key ? "active" : ""}`}
              onClick={() => go(key)}
            >
              <span className="ad-nav-icon" aria-hidden="true"><Icon /></span>
              <span className="ad-nav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-footer">
          <button className="ad-logout-btn" onClick={handleLogout}>
            <FiLogOut aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ad-main">
        <header className="ad-header">
          <div className="ad-header-left">
            <button
              className="dash-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu điều hướng"
            >
              <FiMenu size={20} />
            </button>
            <span className="ad-admin-badge">Admin</span>
            <span className="ad-header-title">
              {NAV_ITEMS.find(n => n.key === activeNav)?.label || "Tổng quan"}
            </span>
          </div>
          <div className="ad-header-right">
            <div className="ad-user-info">
              <div className="ad-user-avatar">{(user?.fullName || "AD").slice(0, 2).toUpperCase()}</div>
              <div className="ad-user-text">
                <span className="ad-user-name">{user?.fullName || "Admin"}</span>
                <span className="ad-user-role">Quản trị viên</span>
              </div>
            </div>
          </div>
        </header>

        <div className="ad-content">
          {activeNav === "tongquan"   && <TongQuanContent onNavigate={setActiveNav} />}
          {activeNav === "nguoidung"  && <QuanLyNguoiDung />}
          {activeNav === "hopdong"    && <QuanLyHopDong />}
          {activeNav === "khieunai"  && <QuanLyKhieuNai />}
          {activeNav === "giaodich"  && <QuanLyGiaoDich />}
          {activeNav === "phidichvu" && <QuanLyHoaHong />}
          {activeNav === "nhatky"    && <QuanLyNhatKy />}
        </div>
      </main>
    </div>
  );
}
