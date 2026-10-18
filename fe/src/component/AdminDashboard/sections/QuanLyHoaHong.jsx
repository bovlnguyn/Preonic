import { useCallback, useEffect, useState } from "react";
import adminService from "../../../services/admin.service";
import { formatMoney } from "../../../hooks/useApiData";
import { useToast } from "../../../contexts/ToastContext";

const ENTRY_LABELS = { buyer_transaction_fee: "Phí doanh nghiệp", seller_transaction_fee: "Phí nông dân", payment: "Thanh toán phí", discount: "Giảm phí", waiver: "Miễn phí", adjustment: "Điều chỉnh", refund: "Hoàn phí" };
const STATUS_META = { pending: ["Chờ ghi nhận", "yellow"], posted: ["Đã ghi sổ", "green"], voided: ["Đã hủy", "gray"] };

export default function QuanLyHoaHong() {
  const toast = useToast();
  const [fees, setFees] = useState([]); const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({}); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(""); const [status, setStatus] = useState("");
  const load = useCallback(async (page = 1) => { setLoading(true); try { const response = await adminService.getFees({ page, limit: 20, search: search || undefined, status: status || undefined }); setFees(response?.data || []); setPagination(response?.pagination || {}); setStats(response?.stats || {}); } catch { toast.error("Không thể tải sổ phí dịch vụ"); } finally { setLoading(false); } }, [search, status, toast]);
  useEffect(() => { load(1); }, [load]);
  return <>
    <div className="adm-page-header"><div><h1 className="adm-page-title">Quản lý phí dịch vụ</h1><p className="adm-page-subtitle">Sổ phí tách biệt với tiền hàng; PreOnic không giữ tiền thanh toán hợp đồng</p></div></div>
    <div className="adm-kpis">{[["billed", "Phí đã ghi nhận", "#1d4ed8"], ["collected", "Phí đã thanh toán", "#16a34a"], ["outstanding", "Phí còn phải thu", "#d97706"], ["pending", "Phí chờ ghi sổ", "#0891b2"]].map(([key, label, color]) => <div className="adm-kpi" key={key} style={{ "--kpi-color": color }}><div className="adm-kpi-icon" style={{ background: `${color}22`, color }}>PH</div><div className="adm-kpi-body"><span className="adm-kpi-val money">{formatMoney(stats[key] || 0)}</span><span className="adm-kpi-label">{label}</span></div></div>)}</div>
    <div className="adm-card"><div className="adm-filters"><input className="adm-search" placeholder="Tìm người dùng, mã hợp đồng, mô tả..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load(1)} /><select className="adm-select" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="pending">Chờ ghi nhận</option><option value="posted">Đã ghi sổ</option><option value="voided">Đã hủy</option></select><button className="adm-btn adm-btn-primary" onClick={() => load(1)}>Tìm kiếm</button></div>
      {loading ? <div className="adm-loading">Đang tải...</div> : fees.length === 0 ? <div className="adm-empty"><p>Chưa có khoản phí nào</p></div> : <><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Loại phí</th><th>Người dùng</th><th>Hợp đồng</th><th>Tỷ lệ</th><th>Số tiền</th><th>Chiều ghi sổ</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>{fees.map(fee => { const meta = STATUS_META[fee.status] || [fee.status, "gray"]; return <tr key={fee.id}><td>{ENTRY_LABELS[fee.entryType] || fee.entryType}</td><td><strong>{fee.user?.fullName || "—"}</strong><div style={{ fontSize: 11, color: "#94a3b8" }}>{fee.user?.email}</div></td><td>{fee.contract?.contractCode || "—"}</td><td>{fee.feeRate == null ? "—" : `${fee.feeRate}%`}</td><td><strong>{formatMoney(fee.amount)}</strong></td><td>{fee.direction === "debit" ? "Phát sinh" : "Khấu trừ"}</td><td><span className={`adm-badge adm-badge-${meta[1]}`}>{meta[0]}</span></td><td>{new Date(fee.createdAt).toLocaleDateString("vi-VN")}</td></tr>; })}</tbody></table></div><div className="adm-pagination"><span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} bút toán</span><div className="adm-pagination-btns"><button className="adm-pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Trước</button><button className="adm-pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Tiếp →</button></div></div></>}
    </div>
  </>;
}
