import { useEffect, useState } from 'react';
import contractService from '../services/contract.service';

export default function useContractList({ pageSize = 10 } = {}) {
  const [tab, setTab] = useState('all');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    contractService
      .list(tab === 'all' ? undefined : tab, { page, limit: pageSize })
      .then((res) => {
        if (!alive) return;
        const nextPagination = res?.data?.pagination || {};
        setContracts(res?.data?.contracts || []);
        setPagination({
          total: Number(nextPagination.total || 0),
          totalPages: Math.max(1, Number(nextPagination.totalPages || 1)),
        });
      })
      .catch((requestError) => {
        if (!alive) return;
        // Giữ dữ liệu đã tải thành công trên màn hình. Một lỗi quyền/mạng tạm
        // thời không đồng nghĩa các bản ghi trong database đã biến mất.
        setError(requestError?.message || 'Không thể cập nhật danh sách hợp đồng.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tab, page, pageSize, reloadToken]);

  const totalPages = Math.max(1, pagination.totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const reload = () => setReloadToken((current) => current + 1);

  return {
    tab,
    contracts,
    loading,
    page,
    pagination,
    totalPages,
    setPage,
    handleTabChange,
    reload,
    error,
  };
}
