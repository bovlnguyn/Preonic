import { useEffect, useState } from 'react';
import contractService from '../services/contract.service';

export default function useContractList({ pageSize = 10 } = {}) {
  const [tab, setTab] = useState('all');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let alive = true;
    setLoading(true);

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
      .catch(() => {
        if (!alive) return;
        setContracts([]);
        setPagination({ total: 0, totalPages: 1 });
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
  };
}
