import { useCallback, useEffect, useState } from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import adminService from "../../../services/admin.service";
import { formatMoney } from "../../../hooks/useApiData";

const USER_ROLE_META = {
  farmer: { label: "Nông dân", badge: "adm-badge-green", background: "#dcfce7", color: "#16a34a" },
  enterprise: { label: "Doanh nghiệp", badge: "adm-badge-blue", background: "#dbeafe", color: "#1d4ed8" },
  admin: { label: "Quản trị viên", badge: "adm-badge-teal", background: "#ccfbf1", color: "#0f766e" },
};

export default function TongQuanContent({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await adminService.getDashboard();
      setData(response?.data || null);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Không thể tải dữ liệu quản trị. Hệ thống sẽ tự thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard({ initial: true });
    // Dashboard may be open while a local database is being recreated. Polling
    // prevents a valid zero snapshot or a temporary 503 from remaining on
    // screen after schema/seed initialization has completed.
    const timer = window.setInterval(() => loadDashboard(), 15_000);
    const handleFocus = () => loadDashboard();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDashboard]);

  if (loading) return <div className="adm-loading">Đang tải dữ liệu...</div>;

  if (error && !data) {
    return (
      <div className="adm-card adm-empty" role="alert">
        <FiAlertCircle size={28} />
        <p>{error}</p>
        <button className="adm-btn adm-btn-primary" type="button" onClick={() => loadDashboard({ initial: true })}>
          <FiRefreshCw /> Thử lại
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const monthlyData = data?.monthlyUserData || [];
  const recentUsers = data?.recentUsers || [];
  const recentContracts = data?.recentContracts || [];

  const kpis = [
    { label: "Tổng người dùng", val: stats.totalUsers || 0, abbr: "ND", color: "#2563eb", bg: "#dbeafe" },
    { label: "Nông dân", val: stats.totalFarmers || 0, abbr: "NN", color: "#16a34a", bg: "#dcfce7" },
    { label: "Doanh nghiệp", val: stats.totalEnterprises || 0, abbr: "DN", color: "#0ea5e9", bg: "#e0f2fe" },
    { label: "Hợp đồng", val: stats.totalContracts || 0, abbr: "HD", color: "#d97706", bg: "#fef3c7" },
    { label: "Đang hoạt động", val: stats.activeContracts || 0, abbr: "HĐ", color: "#1d4ed8", bg: "#dbeafe" },
    { label: "Khiếu nại mở", val: stats.openDisputes || 0, abbr: "KN", color: "#dc2626", bg: "#fee2e2" },
    { label: "Tổng giao dịch", val: stats.totalTransactions || 0, abbr: "GD", color: "#0891b2", bg: "#cffafe" },
    { label: "Phí đã thu", val: null, money: stats.totalFeeCollected || 0, abbr: "PT", color: "#059669", bg: "#d1fae5" },
  ];

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Tổng quan hệ thống</h1>
          <p className="adm-page-subtitle">Theo dõi hoạt động toàn bộ nền tảng PreOnic</p>
        </div>
        <button className="adm-btn adm-btn-outline" type="button" onClick={() => loadDashboard()} disabled={refreshing}>
          <FiRefreshCw className={refreshing ? "adm-spin" : ""} />
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {error && <div className="adm-inline-error" role="status"><FiAlertCircle /> {error}</div>}

      {/* KPI Cards */}
      <div className="adm-kpis">
        {kpis.map(k => (
          <div className="adm-kpi" key={k.label} style={{ "--kpi-color": k.color }}>
            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color, fontSize: 12, fontWeight: 700 }}>{k.abbr}</div>
            <div className="adm-kpi-body">
              <span className={`adm-kpi-val${k.money !== undefined ? " money" : ""}`}>
                {k.money !== undefined ? formatMoney(k.money) : k.val}
              </span>
              <span className="adm-kpi-label">{k.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-grid-2">
        {/* Monthly new users chart */}
        <div className="adm-card">
          <div className="adm-card-hd">
            <h3>Người dùng mới theo tháng</h3>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>6 tháng gần nhất</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f1" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Người dùng mới" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="adm-empty"><p>Chưa có dữ liệu</p></div>
          )}
        </div>

        {/* Contract status breakdown */}
        <div className="adm-card">
          <div className="adm-card-hd"><h3>Phân bổ hợp đồng</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Đang chạy", val: stats.activeContracts || 0, total: stats.totalContracts || 1, color: "#1d4ed8" },
              { label: "Hoàn thành", val: stats.completedContracts || 0, total: stats.totalContracts || 1, color: "#16a34a" },
              { label: "Đã hủy", val: stats.cancelledContracts || 0, total: stats.totalContracts || 1, color: "#ef4444" },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                  <span>{item.label}</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.val}</span>
                </div>
                <div style={{ background: "#f1f5f9", borderRadius: 20, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (item.val / item.total) * 100)}%`, background: item.color, height: "100%", borderRadius: 20, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent users & contracts */}
      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-hd">
            <h3>Người dùng mới nhất</h3>
            {onNavigate && (
              <button className="adm-btn adm-btn-outline" onClick={() => onNavigate("nguoidung")}>Xem tất cả →</button>
            )}
          </div>
          {recentUsers.length === 0 ? (
            <div className="adm-empty"><p>Chưa có người dùng</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentUsers.map(u => {
                const roleMeta = USER_ROLE_META[u.role] || USER_ROLE_META.enterprise;
                return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: roleMeta.background, color: roleMeta.color, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(u.fullName || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fullName}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{u.email}</div>
                  </div>
                  <span className={`adm-badge ${roleMeta.badge}`}>
                    {roleMeta.label}
                  </span>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-hd">
            <h3>Hợp đồng gần nhất</h3>
            {onNavigate && (
              <button className="adm-btn adm-btn-outline" onClick={() => onNavigate("hopdong")}>Xem tất cả →</button>
            )}
          </div>
          {recentContracts.length === 0 ? (
            <div className="adm-empty"><p>Chưa có hợp đồng</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentContracts.map(c => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>{c.contractCode}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{formatMoney(c.totalValue || 0)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {c.farmerName} ↔ {c.enterpriseName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
