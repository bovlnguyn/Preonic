import { useEffect, useMemo, useState } from 'react';
import walletService from '../services/wallet.service';

const EMPTY_OVERVIEW = {
  summary: {},
  chart: [],
  recentTransactions: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

export default function useTransactionOverview({ chartValueKey, errorMessage }) {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    walletService.overviewTransactions({ type: typeFilter || undefined, page })
      .then((res) => {
        if (!alive) return;
        setOverview({ ...EMPTY_OVERVIEW, ...(res?.data || {}) });
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || errorMessage);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [errorMessage, page, typeFilter]);

  const handleTypeFilterChange = (key) => {
    setTypeFilter(key);
    setPage(1);
  };

  const chartData = useMemo(
    () => (overview.chart || []).map((item) => ({
      ...item,
      [chartValueKey]: Number(item[chartValueKey] || 0),
    })),
    [chartValueKey, overview.chart]
  );

  return {
    loading,
    error,
    typeFilter,
    page,
    setPage,
    handleTypeFilterChange,
    chartData,
    transactions: overview.recentTransactions || [],
    summary: overview.summary || {},
    pagination: overview.pagination || EMPTY_OVERVIEW.pagination,
  };
}
