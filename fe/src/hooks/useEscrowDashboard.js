import { useEffect, useState } from 'react';
import escrowService from '../services/escrow.service';

const EMPTY_PAGINATION = { total: 0, totalPages: 0 };

export default function useEscrowDashboard({ pageSize = 6, overviewTab = 'overview' } = {}) {
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(overviewTab);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    let alive = true;

    escrowService.summary()
      .then((res) => {
        if (alive) setSummary(res?.data?.summary || {});
      })
      .catch(() => {
        if (alive) setSummary({});
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (tab === overviewTab) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);

    escrowService.list({
      page,
      limit: pageSize,
      ...(tab === 'active' || tab === 'completed' ? { status: tab } : {}),
    })
      .then((res) => {
        if (!alive) return;
        const next = res?.data?.pagination || {};
        setEscrows(res?.data?.escrows || []);
        setPagination({
          total: Number(next.total || 0),
          totalPages: Number(next.totalPages || 0),
        });
      })
      .catch(() => {
        if (!alive) return;
        setEscrows([]);
        setPagination(EMPTY_PAGINATION);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [overviewTab, page, pageSize, tab]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

  return {
    escrows,
    loading,
    tab,
    changeTab,
    page,
    setPage,
    pagination,
    summary,
  };
}
