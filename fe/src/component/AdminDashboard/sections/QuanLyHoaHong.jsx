import { useEffect, useState, useCallback } from "react";
import adminService from "../../../services/admin.service";
import { formatMoney } from "../../../hooks/useApiData";
import { useToast } from "../../../contexts/ToastContext";
import { getContractStatusMeta } from "../../../constants";

const STATUS_OPTIONS = [
  { val: "", label: "Tất cả trạng thái" },
  { val: "pending", label: "Chờ duyệt" },
  { val: "approved", label: "Đã phê duyệt" },
  { val: "active", label: "Đang chạy" },
  { val: "completed", label: "Hoàn thành" },
  { val: "cancelled", label: "Đã hủy" },
  { val: "disputed", label: "Tranh chấp" },
];

export default function QuanLyHoaHong() {
  const toast = useToast();
  const [commissions, setCommissions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ collected: 0, expected: 0, lost: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await adminService.getCommissions(params);
      setCommissions(res?.data || []);
      if (res?.pagination) setPagination(res.pagination);
      if (res?.stats) setStats(res.stats);
    } catch {
      toast.error("Không thể tải danh sách hoa hồng");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, toast]);

  useEffect(() => { load(1); }, [load]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  const summaryCards = [
    { key: "collected", label: "Hoa hồng đã thu", abbr: "ĐT", color: "#16a34a" },
    { key: "expected",  label: "Hoa hồng dự kiến", abbr: "DK", color: "#1d4ed8" },
    { key: "lost",      label: "Hoa hồng mất (hủy HĐ)", abbr: "MT", color: "#dc2626" },
  ];

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Quản lý Hoa hồng</h1>
          <p className="adm-page-subtitle">Hoa hồng PreOnic thu trên từng hợp đồng</p>
        </div>
      </div>

      <div className="adm-kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {summaryCards.map(c => (
          <div className="adm-kpi" key={c.key} style={{ "--kpi-color": c.color }}>
            <div className="adm-kpi-icon" style={{ background: c.color + "22", color: c.color, fontSize: 12, fontWeight: 700 }}>{c.abbr}</div>
            <div className="adm-kpi-body">
              <span className="adm-kpi-val money">{formatMoney(stats[c.key] || 0)}</span>
              <span className="adm-kpi-label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-filters">
          <input
            className="adm-search"
            type="text"
            placeholder="Tìm mã hợp đồng, tên nông dân, doanh nghiệp..."
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
        ) : commissions.length === 0 ? (
          <div className="adm-empty"><p>Không có hoa hồng nào</p></div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Mã HĐ</th>
                    <th>Nông dân</th>
                    <th>Doanh nghiệp</th>
                    <th>Giá trị HĐ</th>
                    <th>Tỷ lệ</th>
                    <th>Hoa hồng</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => {
                    const meta = getContractStatusMeta(c.status);
                    return (
                      <tr key={c.id}>
                        <td><span style={{ fontWeight: 700, color: "#4f46e5", fontSize: 12 }}>{c.contractCode}</span></td>
                        <td style={{ color: "#334155" }}>{c.farmerName}</td>
                        <td style={{ color: "#334155" }}>{c.enterpriseName}</td>
                        <td style={{ color: "#64748b" }}>{formatMoney(c.totalValue)}</td>
                        <td style={{ color: "#64748b" }}>{c.commissionRate}%</td>
                        <td><span style={{ fontWeight: 700, fontSize: 14, color: "#16a34a" }}>{formatMoney(c.commission)}</span></td>
                        <td>
                          <span className="adm-badge" style={{ background: meta.color + "22", color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>{fmtDate(c.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="adm-pagination">
              <span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} hợp đồng</span>
              <div className="adm-pagination-btns">
                <button className="adm-pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Trước</button>
                <button className="adm-pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Tiếp →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}