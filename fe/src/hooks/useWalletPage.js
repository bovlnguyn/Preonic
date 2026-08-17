import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import walletService from '../services/wallet.service';
import { formatMoney } from '../utils/dashboard';

const EMPTY_WITHDRAW_FORM = {
  amount: '',
  bank: '',
  accountNumber: '',
  accountHolder: '',
  note: '',
};

const EMPTY_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export default function useWalletPage() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amountRaw, setAmountRaw] = useState('');
  const [quickPicked, setQuickPicked] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [sepayOrder, setSepayOrder] = useState(null);
  const [sepayCreating, setSepayCreating] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [wForm, setWForm] = useState(EMPTY_WITHDRAW_FORM);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [historyPagination, setHistoryPagination] = useState(EMPTY_PAGINATION);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadWallet = () => {
    setLoading(true);
    Promise.all([
      walletService.get(),
      walletService.listTransactions({ limit: 100 }),
    ])
      .then(([walletRes, txRes]) => {
        setBalance(walletRes?.data?.wallet?.balance || 0);
        setTransactions(txRes?.data?.transactions || []);
      })
      .catch(() => {
        setBalance(0);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadWallet, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWithdrawals = () => {
    setWithdrawalsLoading(true);
    walletService.listTransactions({ type: 'withdraw', limit: 20 })
      .then((res) => setWithdrawals(res?.data?.transactions || []))
      .catch(() => setWithdrawals([]))
      .finally(() => setWithdrawalsLoading(false));
  };

  useEffect(() => {
    if (tab === 'withdraw') loadWithdrawals();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => transactions.reduce(
    (result, transaction) => {
      const amount = Number(transaction.amount || 0);
      if (transaction.type === 'topup') result.topup += amount;
      if (transaction.type === 'release') result.release += amount;
      if (transaction.type === 'deposit') result.deposit += amount;
      return result;
    },
    { topup: 0, release: 0, deposit: 0 },
  ), [transactions]);

  useEffect(() => {
    if (tab !== 'history') return;

    setHistoryLoading(true);
    walletService.listTransactions({
      type: historyFilter === 'all' ? undefined : historyFilter,
      page: historyPage,
      limit: 10,
    })
      .then((res) => {
        setHistoryTransactions(res?.data?.transactions || []);
        setHistoryPagination(res?.data?.pagination || EMPTY_PAGINATION);
      })
      .catch(() => {
        setHistoryTransactions([]);
        setHistoryPagination(EMPTY_PAGINATION);
      })
      .finally(() => setHistoryLoading(false));
  }, [tab, historyFilter, historyPage]);

  const handleHistoryFilterChange = (key) => {
    setHistoryFilter(key);
    setHistoryPage(1);
  };

  const pickQuick = (value) => {
    setQuickPicked(value);
    setAmountRaw(String(value));
  };

  const onCustomAmountChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    setAmountRaw(digits);
    setQuickPicked(null);
  };

  const handleCreateSePayOrder = async () => {
    const amount = Number(amountRaw);
    if (!amount) {
      toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.');
      return;
    }

    setSepayCreating(true);
    try {
      const res = await walletService.createSepayOrder(amount);
      setSepayOrder(res?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Tạo lệnh SePay thất bại, vui lòng thử lại.');
    } finally {
      setSepayCreating(false);
    }
  };

  const handleCreateDemoQrOrder = async () => {
    const amount = Number(amountRaw);
    if (!amount) {
      toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.');
      return;
    }

    setSepayCreating(true);
    try {
      const res = await walletService.createDemoQrOrder(amount);
      setSepayOrder(res?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Tạo mã QR demo thất bại, vui lòng thử lại.');
    } finally {
      setSepayCreating(false);
    }
  };

  const resetSepayOrder = () => setSepayOrder(null);

  const copySepayField = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.warning('Không thể sao chép, vui lòng copy thủ công.');
    }
  };

  useEffect(() => {
    if (!sepayOrder || sepayOrder.status === 'completed') return undefined;

    const interval = setInterval(async () => {
      try {
        const res = await walletService.getSepayOrderStatus(sepayOrder.orderCode);
        if (res?.data?.status === 'completed') {
          setSepayOrder((prev) => (prev ? { ...prev, status: 'completed' } : prev));
        }
      } catch {
        // Lỗi mạng tạm thời sẽ được thử lại ở lần poll kế tiếp.
      }
    }, 3000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sepayOrder?.orderCode, sepayOrder?.status]);

  useEffect(() => {
    if (!sepayOrder?.isDemo || sepayOrder.status !== 'pending') return undefined;

    const timer = setTimeout(() => {
      walletService.confirmDemoQrOrder(sepayOrder.orderCode).catch(() => {});
    }, 4000);

    return () => clearTimeout(timer);
  }, [sepayOrder?.orderCode, sepayOrder?.isDemo, sepayOrder?.status]);

  useEffect(() => {
    if (sepayOrder?.status !== 'completed') return undefined;

    toast.success(`Nạp thành công ${formatMoney(sepayOrder.amount)} vào ví${sepayOrder.isDemo ? ' (QR demo)' : ' qua SePay'}.`);
    loadWallet();

    const timer = setTimeout(() => {
      setSepayOrder(null);
      setAmountRaw('');
      setQuickPicked(null);
      setTab('overview');
    }, 1800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sepayOrder?.status]);

  const handleDemoTopUp = async () => {
    const amount = Number(amountRaw);
    if (!amount || amount <= 0) {
      toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.');
      return;
    }

    setTopupLoading(true);
    try {
      const res = await walletService.demoTopup(amount);
      setBalance(res?.data?.wallet?.balance ?? balance);
      setAmountRaw('');
      setQuickPicked(null);
      toast.success(`Nạp thành công ${formatMoney(amount)} vào ví (demo).`);
      setTab('overview');
      loadWallet();
    } catch (err) {
      toast.error(err?.message || 'Nạp tiền thất bại, vui lòng thử lại.');
    } finally {
      setTopupLoading(false);
    }
  };

  const setWField = (key, value) => setWForm((prev) => ({ ...prev, [key]: value }));

  const submitWithdraw = async (event) => {
    event.preventDefault();
    const amount = Number(wForm.amount.replace(/\D/g, ''));

    if (!amount || amount <= 0) {
      toast.warning('Vui lòng nhập số tiền muốn rút.');
      return;
    }
    if (amount > balance) {
      toast.error('Số tiền rút vượt quá số dư khả dụng.');
      return;
    }
    if (!wForm.bank) {
      toast.warning('Vui lòng chọn ngân hàng nhận tiền.');
      return;
    }
    if (!wForm.accountNumber.trim()) {
      toast.warning('Vui lòng nhập số tài khoản.');
      return;
    }
    if (!wForm.accountHolder.trim()) {
      toast.warning('Vui lòng nhập tên chủ tài khoản.');
      return;
    }

    setWithdrawLoading(true);
    try {
      await walletService.requestWithdraw({
        amount,
        note: wForm.note.trim(),
        isDemo: false,
        bankName: wForm.bank,
        bankAccountNumber: wForm.accountNumber.trim(),
        bankAccountHolder: wForm.accountHolder.trim().toUpperCase(),
      });
      setWForm(EMPTY_WITHDRAW_FORM);
      toast.success('Đã gửi yêu cầu rút tiền. Quản trị viên sẽ xử lý sớm nhất.');
      loadWithdrawals();
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu rút tiền thất bại, vui lòng thử lại.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleDemoWithdraw = async () => {
    const amount = Number(wForm.amount.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      toast.warning('Vui lòng nhập số tiền muốn rút.');
      return;
    }
    if (amount > balance) {
      toast.error('Số tiền rút vượt quá số dư khả dụng.');
      return;
    }

    setWithdrawLoading(true);
    try {
      await walletService.requestWithdraw({ amount, isDemo: true });
      setWForm(EMPTY_WITHDRAW_FORM);
      toast.success(`Đã gửi yêu cầu rút ${formatMoney(amount)} (demo). Chờ quản trị viên duyệt để hoàn tất.`);
      loadWithdrawals();
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu rút tiền thất bại, vui lòng thử lại.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return {
    tab,
    setTab,
    loading,
    balance,
    transactions,
    amountRaw,
    quickPicked,
    topupLoading,
    sepayOrder,
    sepayCreating,
    withdrawals,
    withdrawalsLoading,
    wForm,
    withdrawLoading,
    historyFilter,
    historyPage,
    historyTransactions,
    historyPagination,
    historyLoading,
    totals,
    setHistoryPage,
    handleHistoryFilterChange,
    pickQuick,
    onCustomAmountChange,
    handleCreateSePayOrder,
    handleCreateDemoQrOrder,
    resetSepayOrder,
    copySepayField,
    handleDemoTopUp,
    setWField,
    submitWithdraw,
    handleDemoWithdraw,
  };
}
