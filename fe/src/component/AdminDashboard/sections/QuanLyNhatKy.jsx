import { useEffect, useState, useCallback } from "react";
import adminService from "../../../services/admin.service";
import { useToast } from "../../../contexts/ToastContext";

const CATEGORY_META = {
  auth:     { label: "Đăng nhập",  cls: "adm-badge-blue" },
  contract: { label: "Hợp đồng",   cls: "adm-badge-purple" },
  escrow:   { label: "Ký quỹ",     cls: "adm-badge-green" },
  dispute:  { label: "Tranh chấp", cls: "adm-badge-yellow" },
  payment:  { label: "Thanh toán", cls: "adm-badge-blue" },
  cron:     { label: "Cron job",   cls: "adm-badge-gray" },
  api:      { label: "API",        cls: "adm-badge-red" },
};

const LEVEL_META = {
  info:  { label: "Thông tin",  cls: "adm-badge-green",  color: "#16a34a" },
  warn:  { label: "Cảnh báo",   cls: "adm-badge-yellow", color: "#d97706" },
  error: { label: "Lỗi",        cls: "adm-badge-red",    color: "#dc2626" },
};

const CATEGORY_OPTIONS = [
  { val: "", label: "Tất cả danh mục" },
  { val: "auth", label: "Đăng nhập" },
  { val: "contract", label: "Hợp đồng" },
  { val: "escrow", label: "Ký quỹ" },
  { val: "dispute", label: "Tranh chấp" },
  { val: "payment", label: "Thanh toán" },
  { val: "cron", label: "Cron job" },
  { val: "api", label: "API" },
];

const LEVEL_OPTIONS = [
  { val: "", label: "Tất cả cấp độ" },
  { val: "info", label: "Hoạt động (info)" },
  { val: "warn", label: "Cảnh báo (warn)" },
  { val: "error", label: "Lỗi (error)" },
];

export default function QuanLyNhatKy() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ info: 0, warn: 0, error: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (categoryFilter) params.category = categoryFilter;
      if (levelFilter) params.level = levelFilter;
      if (search) params.search = search;
      const res = await adminService.getSystemLogs(params);
      setLogs(res?.data || []);
      if (res?.pagination) setPagination(res.pagination);
      if (res?.stats) setStats(res.stats);
    } catch {
      toast.error("Không thể tải nhật ký hệ thống");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, levelFilter, search, toast]);

  useEffect(() => { load(1); }, [load]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" }) : "—";

  const kpis = [
    { key: "info", label: "Hoạt động hệ thống", abbr: "IN", color: "#16a34a", bg: "#dcfce7" },
    { key: "warn", label: "Cảnh báo", abbr: "WN", color: "#d97706", bg: "#fef3c7" },
    { key: "error", label: "Lỗi hệ thống", abbr: "ER", color: "#dc2626", bg: "#fee2e2" },
  ];

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Nhật ký hệ thống</h1>
          <p className="adm-page-subtitle">
            Theo dõi hành động quan trọng (đăng nhập, hợp đồng, ký quỹ, tranh chấp), lỗi hệ thống và hoạt động của từng người dùng.
            Log được lưu trong 30 ngày, tự động xóa sau đó.
          </p>
        </div>
      </div>

      <div className="adm-kpis">
        {kpis.map(k => (
          <div className="adm-kpi" key={k.key} style={{ "--kpi-color": k.color }}>
            <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color, fontSize: 12, fontWeight: 700 }}>{k.abbr}</div>
            <div className="adm-kpi-body">
              <span className="adm-kpi-val">{stats[k.key] || 0}</span>
              <span className="adm-kpi-label">{k.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-filters">
          <input
            className="adm-search"
            type="text"
            placeholder="Tìm theo nội dung, hành động..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1)}
          />
          <select className="adm-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {CATEGORY_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <select className="adm-select" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
            {LEVEL_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <button className="adm-btn adm-btn-primary" onClick={() => load(1)}>Tìm kiếm</button>
        </div>

        {loading ? (
          <div className="adm-loading">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="adm-empty">
            <p>{categoryFilter || levelFilter || search ? "Không tìm thấy log phù hợp" : "Chưa có log nào"}</p>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Cấp độ</th>
                    <th>Danh mục</th>
                    <th>Người thực hiện</th>
                    <th>Nội dung</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => {
                    const cm = CATEGORY_META[l.category] || { label: l.category, cls: "adm-badge-gray" };
                    const lm = LEVEL_META[l.level] || { label: l.level, cls: "adm-badge-gray", color: "#94a3b8" };
                    return (
                      <tr key={l.id} style={{ borderLeft: `3px solid ${lm.color}` }}>
                        <td style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                        <td><span className={`adm-badge ${lm.cls}`}>{lm.label}</span></td>
                        <td><span className={`adm-badge ${cm.cls}`}>{cm.label}</span></td>
                        <td>
                          {l.user ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{l.user.fullName}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{l.user.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Hệ thống</span>
                          )}
                        </td>
                        <td style={{ color: "#475569", fontSize: 13, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.message}
                        </td>
                        <td>
                          <button className="adm-btn adm-btn-outline" onClick={() => setSelectedLog(l)}>Xem</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="adm-pagination">
              <span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} log</span>
              <div className="adm-pagination-btns">
                <button className="adm-pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Trước</button>
                <button className="adm-pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Tiếp →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="adm-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="adm-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <h3>Chi tiết Log #{selectedLog.id}</h3>
              <button className="adm-modal-close" onClick={() => setSelectedLog(null)}>×</button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <span className={`adm-badge ${(LEVEL_META[selectedLog.level] || {}).cls || "adm-badge-gray"}`} style={{ fontSize: 13, padding: "5px 14px" }}>
                  {(LEVEL_META[selectedLog.level] || {}).label || selectedLog.level}
                </span>
                <span className={`adm-badge ${(CATEGORY_META[selectedLog.category] || {}).cls || "adm-badge-gray"}`} style={{ fontSize: 13, padding: "5px 14px" }}>
                  {(CATEGORY_META[selectedLog.category] || {}).label || selectedLog.category}
                </span>
              </div>

              <div className="adm-detail-row"><span className="adm-detail-label">Hành động</span><span className="adm-detail-val">{selectedLog.action}</span></div>
              <div className="adm-detail-row"><span className="adm-detail-label">Người thực hiện</span><span className="adm-detail-val">{selectedLog.user ? `${selectedLog.user.fullName} (${selectedLog.user.email})` : "Hệ thống"}</span></div>
              {selectedLog.targetType && (
                <div className="adm-detail-row"><span className="adm-detail-label">Đối tượng</span><span className="adm-detail-val">{selectedLog.targetType} — {selectedLog.targetId}</span></div>
              )}
              <div className="adm-detail-row"><span className="adm-detail-label">Địa chỉ IP</span><span className="adm-detail-val">{selectedLog.ipAddress || "—"}</span></div>
              <div className="adm-detail-row"><span className="adm-detail-label">Thời gian</span><span className="adm-detail-val">{fmtDate(selectedLog.createdAt)}</span></div>

              <div style={{ marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nội dung</div>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                {selectedLog.message}
              </div>

              {selectedLog.metadata && (
                <>
                  <div style={{ marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dữ liệu chi tiết</div>
                  <pre style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 12, overflowX: "auto" }}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </>
              )}

              {selectedLog.stackTrace && (
                <>
                  <div style={{ marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stack trace</div>
                  <pre style={{ background: "#450a0a", color: "#fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    {selectedLog.stackTrace}
                  </pre>
                </>
              )}
            </div>
            <div className="adm-modal-ft">
              <button className="adm-btn adm-btn-outline" onClick={() => setSelectedLog(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
