import React from 'react';
import { FiArrowDownLeft, FiArrowUpRight, FiCreditCard, FiLock } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatCard      from '../components/StatCard';
import { useState, useEffect } from 'react';
import { formatDate, formatMoney } from '../utils';

function EnterpriseWallet() {
  const w = walletSummary;
  const [walletSummary, setWalletSummary]       = useState({ balance: 0, escrowLocked: 0, spentThisMonth: 0, pendingPayment: 0 });
const [transactions, setTransactions]         = useState([]);
const [loading, setLoading]                   = useState(true);

useEffect(() => {
  // Khi có API: walletService.getSummary().then(...)
  setLoading(false);
}, []);
  return (
    <div className="ent-stack">
      <section className="ent-grid ent-grid--4">
        <StatCard icon={FiCreditCard}    label="Số dư khả dụng"    value={formatMoney(w.balance)}         change="Có thể nạp thêm hoặc rút"      tone="blue"   />
        <StatCard icon={FiLock}          label="Đang ký quỹ escrow" value={formatMoney(w.escrowLocked)}    change="Từ 3 hợp đồng đang chạy"       tone="gold"   />
        <StatCard icon={FiArrowUpRight}  label="Chi tiêu tháng này" value={formatMoney(w.spentThisMonth)}  change="Ký quỹ + phí nền tảng"         tone="purple" />
        <StatCard icon={FiArrowDownLeft} label="Chờ thanh toán"     value={formatMoney(w.pendingPayment)}  change="Đợi xác nhận giao hàng"        tone="green"  />
      </section>

      <section className="ent-card">
        <SectionHeader
          eyebrow="Ví & Thanh toán"
          title="Lịch sử giao dịch ví doanh nghiệp"
          desc="Trang này giữ vai trò giao diện ví. Chưa xử lý tiền thật khi payment gateway chưa nối."
        />
        <div className="ent-table-wrap">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Mã GD</th><th>Loại</th><th>Nội dung</th><th>Ngày</th><th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.type}</td>
                  <td>{tx.note}</td>
                  <td>{formatDate(tx.date)}</td>
                  <td className={tx.amount >= 0 ? 'ent-money ent-money--up' : 'ent-money ent-money--down'}>
                    {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EnterpriseWallet;
