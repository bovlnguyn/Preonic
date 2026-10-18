import { useCallback, useEffect, useState } from "react";
import adminService from "../../../services/admin.service";
import { formatMoney } from "../../../hooks/useApiData";
import { useToast } from "../../../contexts/ToastContext";

const TYPE_META = {
  goods_payment: { label: "Thanh toán hàng hóa", cls: "adm-badge-blue" },
  fee_payment: { label: "Thanh toán phí dịch vụ", cls: "adm-badge-purple" },
};
const STATUS_META = {
  planned: ["Đã lên lịch", "gray"], payable: ["Có thể thanh toán", "blue"],
  awaiting_payment: ["Chờ chuyển khoản", "yellow"], awaiting_confirmation: ["Chờ xác nhận", "yellow"],
  confirmed: ["Đã xác nhận", "green"], pending: ["Đang chờ", "yellow"],
  processing: ["Đang xử lý", "blue"], paid: ["Đã thanh toán", "green"],
  failed: ["Thất bại", "red"], expired: ["Hết hạn", "gray"], cancelled: ["Đã hủy", "gray"],
  disputed: ["Tranh chấp", "red"], amount_mismatch: ["Sai số tiền", "red"],
};

export default function QuanLyGiaoDich() {
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminService.getTransactions({ page, limit: 20, type: type || undefined, status: status || undefined });
      setTransactions(response?.data || []); setPagination(response?.pagination || {}); setStats(response?.stats || {});
    } catch { toast.error("Không thể tải danh sách giao dịch"); } finally { setLoading(false); }
  }, [status, toast, type]);
  useEffect(() => { load(1); }, [load]);
  const person = value => value ? <div><strong>{value.fullName}</strong><div style={{ fontSize: 11, color: "#94a3b8" }}>{value.email}</div></div> : "—";

  return <>
    <div className="adm-page-header"><div><h1 className="adm-page-title">Quản lý giao dịch</h1><p className="adm-page-subtitle">Theo dõi chuyển khoản hàng hóa giữa hai bên và khoản phí trả riêng cho PreOnic</p></div></div>
    <div className="adm-kpis">{[
      ["goods_payment", "Hàng hóa đã xác nhận", "#1d4ed8"], ["fee_payment", "Phí dịch vụ đã thu", "#0891b2"],
    ].map(([key, label, color]) => <div className="adm-kpi" key={key} style={{ "--kpi-color": color }}><div className="adm-kpi-icon" style={{ background: `${color}22`, color }}>TT</div><div className="adm-kpi-body"><span className="adm-kpi-val money">{formatMoney(stats[key]?.totalAmount || 0)}</span><span className="adm-kpi-label">{label}</span><small>{stats[key]?.count || 0} giao dịch</small></div></div>)}</div>
    <div className="adm-card">
      <div className="adm-filters"><select className="adm-select" value={type} onChange={e => setType(e.target.value)}><option value="">Tất cả loại</option><option value="goods_payment">Thanh toán hàng hóa</option><option value="fee_payment">Thanh toán phí dịch vụ</option></select><select className="adm-select" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta[0]}</option>)}</select></div>
      {loading ? <div className="adm-loading">Đang tải...</div> : transactions.length === 0 ? <div className="adm-empty"><p>Không có giao dịch nào</p></div> : <>
        <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Loại</th><th>Người trả</th><th>Người nhận</th><th>Số tiền</th><th>Nội dung chuyển khoản</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>{transactions.map(t => { const tm = TYPE_META[t.type] || { label: t.type, cls: "adm-badge-gray" }; const sm = STATUS_META[t.status] || [t.status, "gray"]; return <tr key={`${t.type}-${t.id}`}><td><span className={`adm-badge ${tm.cls}`}>{tm.label}</span></td><td>{person(t.payer)}</td><td>{person(t.payee)}</td><td><strong>{formatMoney(t.amount)}</strong></td><td style={{ fontFamily: "monospace" }}>{t.transferContent || "—"}</td><td><span className={`adm-badge adm-badge-${sm[1]}`}>{sm[0]}</span></td><td>{new Date(t.createdAt).toLocaleString("vi-VN")}</td></tr>; })}</tbody></table></div>
        <div className="adm-pagination"><span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} giao dịch</span><div className="adm-pagination-btns"><button className="adm-pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Trước</button><button className="adm-pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Tiếp →</button></div></div>
      </>}
    </div>
  </>;
}
