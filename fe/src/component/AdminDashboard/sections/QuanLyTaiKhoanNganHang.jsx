import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiRefreshCw, FiSearch, FiShield, FiX } from 'react-icons/fi';
import adminService from '../../../services/admin.service';
import { useToast } from '../../../contexts/ToastContext';

const STATUS = {
  pending_admin_review: ['Chờ admin duyệt', 'yellow'],
  awaiting_sepay_link: ['Chờ liên kết SePay', 'blue'],
  verified: ['Đã xác minh', 'green'],
  rejected: ['Đã từ chối', 'red'],
  failed: ['Chưa tìm thấy trên SePay', 'red'],
};

export default function QuanLyTaiKhoanNganHang() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending_admin_review');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminService.getSettlementAccountReviews({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
      });
      setItems(response?.data || []);
      setPagination(response?.pagination || { page, total: 0, totalPages: 1 });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể tải yêu cầu xác minh tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [search, status, toast]);

  useEffect(() => { load(1); }, [load]);

  const review = async (item, decision) => {
    let note = '';
    if (decision === 'reject') {
      note = window.prompt('Nhập lý do từ chối để nông dân biết cách sửa:', '') || '';
      if (!note.trim()) return;
    }
    setProcessingId(item.id);
    try {
      const result = await adminService.reviewSettlementAccount(item.id, decision, note.trim());
      toast.success(result?.message || 'Đã xử lý yêu cầu.');
      await load(pagination.page || 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể xử lý yêu cầu.');
    } finally {
      setProcessingId('');
    }
  };

  const verifyOnSePay = async (item) => {
    setProcessingId(item.id);
    try {
      const result = await adminService.verifySettlementAccountOnSePay(item.id);
      if (result?.data?.verification?.status === 'verified') toast.success(result.message || 'SePay đã xác minh tài khoản.');
      else toast.error(result?.data?.verification?.message || 'SePay chưa tìm thấy tài khoản phù hợp.');
      await load(pagination.page || 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể đối chiếu tài khoản với SePay.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Xác minh tài khoản ngân hàng</h1>
          <p className="adm-page-subtitle">
            Admin duyệt hồ sơ; SePay API mới có quyền xác nhận tài khoản đã liên kết và đang hoạt động.
          </p>
        </div>
        <button className="adm-btn" type="button" onClick={() => load(pagination.page || 1)} disabled={loading}>
          <FiRefreshCw /> Làm mới
        </button>
      </div>

      <div className="adm-card">
        <div className="adm-filters">
          <div className="adm-bank-search">
            <FiSearch />
            <input
              className="adm-search"
              placeholder="Tìm nông dân, email, ngân hàng..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && load(1)}
            />
          </div>
          <select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="pending_admin_review">Chờ admin duyệt</option>
            <option value="awaiting_sepay_link">Chờ liên kết SePay</option>
            <option value="verified">Đã xác minh</option>
            <option value="failed">Chưa tìm thấy trên SePay</option>
            <option value="rejected">Đã từ chối</option>
          </select>
          <button className="adm-btn adm-btn-primary" type="button" onClick={() => load(1)}>Tìm kiếm</button>
        </div>

        {loading ? (
          <div className="adm-loading">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="adm-empty"><FiShield /><p>Không có yêu cầu phù hợp.</p></div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Nông dân</th><th>Ngân hàng</th><th>Chủ tài khoản</th><th>Trạng thái</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {items.map((item) => {
                    const meta = STATUS[item.verificationStatus] || [item.verificationStatus, 'gray'];
                    const pending = item.verificationStatus === 'pending_admin_review';
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.farmer?.fullName || '—'}</strong><div className="adm-cell-muted">{item.farmer?.email}</div></td>
                        <td><strong>{item.bankName || item.bankCode}</strong><div className="adm-cell-muted">{item.maskedAccountNumber}</div></td>
                        <td>{item.accountHolder}</td>
                        <td><span className={`adm-badge adm-badge-${meta[1]}`}>{meta[0]}</span>{item.adminReviewNote && <div className="adm-cell-note">{item.adminReviewNote}</div>}</td>
                        <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</td>
                        <td>
                          {pending ? (
                            <div className="adm-row-actions">
                              <button className="adm-btn adm-btn-success" type="button" onClick={() => review(item, 'approve')} disabled={processingId === item.id}>
                                <FiCheck /> Duyệt hồ sơ
                              </button>
                              <button className="adm-btn adm-btn-danger" type="button" onClick={() => review(item, 'reject')} disabled={processingId === item.id}>
                                <FiX /> Từ chối
                              </button>
                            </div>
                          ) : ['awaiting_sepay_link', 'failed'].includes(item.verificationStatus) ? (
                            <button className="adm-btn adm-btn-primary" type="button" onClick={() => verifyOnSePay(item)} disabled={processingId === item.id}>
                              <FiShield /> {processingId === item.id ? 'Đang đối chiếu...' : 'Đối chiếu SePay'}
                            </button>
                          ) : <span className="adm-cell-muted">Đã xử lý</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="adm-pagination">
              <span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} yêu cầu</span>
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
