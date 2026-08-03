import { useEffect, useState, useCallback } from "react";
import adminService from "../../../services/admin.service";
import { resolveImageUrl } from "../../../services/product.service";
import { formatMoney } from "../../../hooks/useApiData";
import { useToast } from "../../../contexts/ToastContext";

const DISPUTE_STATUS_META = {
  open:                { label: "Mới mở",       cls: "adm-badge-red",    color: "#dc2626" },
  under_review:        { label: "Đang xem xét", cls: "adm-badge-yellow", color: "#d97706" },
  resolved_farmer:     { label: "Giải quyết → Nông dân",     cls: "adm-badge-green", color: "#16a34a" },
  resolved_enterprise: { label: "Giải quyết → Doanh nghiệp", cls: "adm-badge-blue",  color: "#2563eb" },
  closed:              { label: "Đã đóng",      cls: "adm-badge-gray",   color: "#94a3b8" },
};

const STATUS_OPTIONS = [
  { val: "", label: "Tất cả trạng thái" },
  { val: "open", label: "Mới mở" },
  { val: "under_review", label: "Đang xem xét" },
  { val: "resolved_farmer", label: "Giải quyết (Farmer)" },
  { val: "resolved_enterprise", label: "Giải quyết (Enterprise)" },
  { val: "closed", label: "Đã đóng" },
];

const DISPUTE_KPIS = [
  { key: "open", label: "Mới mở", abbr: "MO", color: "#dc2626", bg: "#fee2e2" },
  { key: "under_review", label: "Đang xem xét", abbr: "XX", color: "#d97706", bg: "#fef3c7" },
  { key: "resolved", label: "Đã giải quyết", abbr: "GQ", color: "#16a34a", bg: "#dcfce7" },
  { key: "closed", label: "Đã đóng", abbr: "DD", color: "#64748b", bg: "#f1f5f9" },
  { key: "total", label: "Tổng khiếu nại", abbr: "TC", color: "#4f46e5", bg: "#ede9fe" },
];

export default function QuanLyKhieuNai() {
  const toast = useToast();
  const [disputes, setDisputes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolution, setResolution] = useState("farmer");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await adminService.getDisputes(params);
      setDisputes(res?.data || []);
      if (res?.pagination) setPagination(res.pagination);
      if (res?.stats) setStats(res.stats);
    } catch {
      toast.error("Không thể tải danh sách khiếu nại");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  useEffect(() => { load(1); }, [load]);

  const openDetail = async (id) => {
    setSelectedDispute({ id, loading: true });
    try {
      const res = await adminService.getDisputeDetail(id);
      setSelectedDispute(res?.data?.dispute);
    } catch {
      toast.error("Không thể tải chi tiết khiếu nại");
      setSelectedDispute(null);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;
    setResolving(true);
    try {
      await adminService.resolveDispute(selectedDispute.id, resolution, adminNotes);
      toast.success("Đã giải quyết khiếu nại thành công!");
      setResolveModal(false);
      setSelectedDispute(null);
      setAdminNotes("");
      setResolution("farmer");
      load(pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể giải quyết khiếu nại");
    } finally {
      setResolving(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
  const canResolve = (status) => status === "open" || status === "under_review";

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Quản lý Khiếu nại</h1>
          <p className="adm-page-subtitle">Xem xét và giải quyết các tranh chấp giữa Nông dân và Doanh nghiệp</p>
        </div>
      </div>

      {stats && (
        <div className="adm-kpis">
          {DISPUTE_KPIS.map(k => {
            const val = k.key === "resolved"
              ? (stats.resolved_farmer || 0) + (stats.resolved_enterprise || 0)
              : (stats[k.key] || 0);
            return (
              <div className="adm-kpi" key={k.key} style={{ "--kpi-color": k.color }}>
                <div className="adm-kpi-icon" style={{ background: k.bg, color: k.color, fontSize: 12, fontWeight: 700 }}>{k.abbr}</div>
                <div className="adm-kpi-body">
                  <span className="adm-kpi-val">{val}</span>
                  <span className="adm-kpi-label">{k.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="adm-card">
        <div className="adm-filters">
          <input
            className="adm-search"
            type="text"
            placeholder="Tìm mã hợp đồng, người khiếu nại, lý do..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1)}
          />
          <select className="adm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <button className="adm-btn adm-btn-primary" onClick={() => load(1)}>Tìm kiếm</button>
        </div>

        {loading ? (
          <div className="adm-loading">Đang tải...</div>
        ) : disputes.length === 0 ? (
          <div className="adm-empty">
            <p>{statusFilter || search ? "Không tìm thấy khiếu nại phù hợp" : "Không có khiếu nại nào"}</p>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Mã hợp đồng</th>
                    <th>Người khiếu nại</th>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map(d => {
                    const meta = DISPUTE_STATUS_META[d.status] || { label: d.status, cls: "adm-badge-gray", color: "#94a3b8" };
                    const contract = d.contractId;
                    return (
                      <tr key={d.id} style={{ borderLeft: `3px solid ${meta.color}` }}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#4f46e5", fontSize: 12 }}>
                            {contract?.contractCode || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {formatMoney(contract?.totalValue || 0)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{d.raisedBy?.fullName || "—"}</div>
                          <span className={`adm-badge ${d.raisedByRole === "farmer" ? "adm-badge-green" : "adm-badge-blue"}`} style={{ marginTop: 2 }}>
                            {d.raisedByRole === "farmer" ? "Nông dân" : "Doanh nghiệp"}
                          </span>
                        </td>
                        <td style={{ color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.reason}
                        </td>
                        <td><span className={`adm-badge ${meta.cls}`}>{meta.label}</span></td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>{fmtDate(d.createdAt)}</td>
                        <td>
                          <button className="adm-btn adm-btn-outline" onClick={() => openDetail(d.id)}>Xem</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="adm-pagination">
              <span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} khiếu nại</span>
              <div className="adm-pagination-btns">
                <button className="adm-pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Trước</button>
                <button className="adm-pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Tiếp →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDispute && !resolveModal && (
        <div className="adm-modal-overlay" onClick={() => setSelectedDispute(null)}>
          <div className="adm-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <h3>Chi tiết Khiếu nại</h3>
              <button className="adm-modal-close" onClick={() => setSelectedDispute(null)}>×</button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>
              {selectedDispute.loading ? (
                <div className="adm-loading">Đang tải...</div>
              ) : (
                <>
                  {/* Status */}
                  {(() => {
                    const m = DISPUTE_STATUS_META[selectedDispute.status] || { label: selectedDispute.status, cls: "adm-badge-gray" };
                    return <div style={{ marginBottom: 16 }}><span className={`adm-badge ${m.cls}`} style={{ fontSize: 13, padding: "5px 14px" }}>{m.label}</span></div>;
                  })()}

                  {/* Contract info */}
                  {selectedDispute.contractId && (
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Hợp đồng liên quan</div>
                      <div style={{ fontWeight: 700, color: "#4f46e5" }}>{selectedDispute.contractId.contractCode}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{selectedDispute.contractId.farmerName} ↔ {selectedDispute.contractId.enterpriseName}</div>
                      <div style={{ fontWeight: 600, color: "#1d4ed8", marginTop: 4 }}>{formatMoney(selectedDispute.contractId.totalValue || 0)}</div>
                    </div>
                  )}

                  <div className="adm-detail-row"><span className="adm-detail-label">Người khiếu nại</span><span className="adm-detail-val">{selectedDispute.raisedBy?.fullName || "—"} ({selectedDispute.raisedByRole === "farmer" ? "Nông dân" : "Doanh nghiệp"})</span></div>
                  <div className="adm-detail-row"><span className="adm-detail-label">Người bị khiếu nại</span><span className="adm-detail-val">{selectedDispute.againstUserId?.fullName || "—"}</span></div>
                  <div className="adm-detail-row"><span className="adm-detail-label">Mốc tranh chấp</span><span className="adm-detail-val">Mốc {selectedDispute.milestoneStep}</span></div>
                  <div className="adm-detail-row"><span className="adm-detail-label">Ngày tạo</span><span className="adm-detail-val">{fmtDate(selectedDispute.createdAt)}</span></div>

                  <div style={{ marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Lý do khiếu nại</div>
                  <div style={{ background: "#fef3c7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                    {selectedDispute.reason}
                  </div>

                  {selectedDispute.evidence?.length > 0 && (
                    <>
                      <div style={{ marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bằng chứng ({selectedDispute.evidence.length})</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {selectedDispute.evidence.map((e, i) => {
                          const url = resolveImageUrl(e);
                          const isImage = /\.(jpe?g|png|gif|webp)$/i.test(e);
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                              {isImage ? (
                                <img src={url} alt={`Bằng chứng ${i + 1}`} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                              ) : (
                                <span style={{ fontSize: 12, color: "#4f46e5", textDecoration: "underline" }}>Tệp đính kèm {i + 1}</span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {selectedDispute.adminNotes && (
                    <>
                      <div style={{ marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ghi chú Admin</div>
                      <div style={{ background: "#ede9fe", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#4c1d95" }}>{selectedDispute.adminNotes}</div>
                    </>
                  )}

                  {selectedDispute.resolvedAt && (
                    <div className="adm-detail-row" style={{ marginTop: 14 }}><span className="adm-detail-label">Thời gian giải quyết</span><span className="adm-detail-val">{fmtDate(selectedDispute.resolvedAt)}</span></div>
                  )}
                </>
              )}
            </div>
            <div className="adm-modal-ft">
              {!selectedDispute.loading && canResolve(selectedDispute.status) && (
                <button className="adm-btn adm-btn-primary" onClick={() => setResolveModal(true)}>
                  Giải quyết khiếu nại
                </button>
              )}
              <button className="adm-btn adm-btn-outline" onClick={() => setSelectedDispute(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {selectedDispute && resolveModal && (
        <div className="adm-modal-overlay" onClick={() => setResolveModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <h3>Giải quyết Khiếu nại</h3>
              <button className="adm-modal-close" onClick={() => setResolveModal(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              <div style={{ background: "#fef3c7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#92400e" }}>
                <strong>Lưu ý:</strong> Quyết định này sẽ <strong>tự động giải ngân</strong> hoặc <strong>hoàn tiền</strong> và không thể hoàn tác.
              </div>

              <div className="adm-form-group">
                <label>Phán quyết</label>
                <select value={resolution} onChange={e => setResolution(e.target.value)}>
                  <option value="farmer">Ủng hộ Nông dân — Giải ngân cho nông dân</option>
                  <option value="enterprise">Ủng hộ Doanh nghiệp — Hoàn tiền cho doanh nghiệp</option>
                </select>
              </div>

              <div className="adm-form-group">
                <label>Ghi chú Admin (tùy chọn)</label>
                <textarea
                  placeholder="Ghi lý do quyết định, bằng chứng tham khảo..."
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div style={{ background: resolution === "farmer" ? "#dcfce7" : "#dbeafe", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: resolution === "farmer" ? "#166534" : "#1e3a5f" }}>
                {resolution === "farmer"
                  ? "Tiền escrow sẽ được giải ngân cho Nông dân."
                  : "Số tiền còn lại trong escrow sẽ hoàn trả cho Doanh nghiệp."}
              </div>
            </div>
            <div className="adm-modal-ft">
              <button
                className="adm-btn adm-btn-primary"
                onClick={handleResolve}
                disabled={resolving}
                style={{ background: resolving ? "#94a3b8" : undefined }}
              >
                {resolving ? "Đang xử lý..." : "Xác nhận giải quyết"}
              </button>
              <button className="adm-btn adm-btn-outline" onClick={() => setResolveModal(false)} disabled={resolving}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
