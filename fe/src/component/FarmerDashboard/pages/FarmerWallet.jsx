import React from 'react';
import { FiArrowDownRight, FiArrowUpRight, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { walletSummary, walletTransactions } from '../data/farmerMockData';
import { formatDate, formatMoney } from '../utils';

function FarmerWallet() {
  return (
    <div className="farmer-stack">
      <section className="farmer-grid farmer-grid--4">
        <StatCard icon={FiCreditCard} label="Số dư khả dụng" value={formatMoney(walletSummary.balance)} change="Có thể rút về ngân hàng" tone="green" />
        <StatCard icon={FiDollarSign} label="Đang chờ giải ngân" value={formatMoney(walletSummary.pending)} change="Theo các mốc escrow" tone="gold" />
        <StatCard icon={FiArrowDownRight} label="Đã nhận tháng này" value={formatMoney(walletSummary.releasedThisMonth)} change="Từ hợp đồng HD-1024" tone="blue" />
        <StatCard icon={FiArrowUpRight} label="Phí nền tảng" value={formatMoney(walletSummary.platformFee)} change="Ước tính theo giao dịch" tone="purple" />
      </section>

      <section className="farmer-card">
        <SectionHeader
          eyebrow="Ví & Thanh toán"
          title="Lịch sử giao dịch ví farmer"
          desc="Trang này giữ vai trò giao diện ví. Chưa xử lý tiền thật khi backend/payment gateway chưa nối."
        />

        <div className="farmer-table-wrap">
          <table className="farmer-table">
            <thead>
              <tr>
                <th>Mã giao dịch</th>
                <th>Loại</th>
                <th>Nội dung</th>
                <th>Ngày</th>
                <th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {walletTransactions.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.type}</td>
                  <td>{item.note}</td>
                  <td>{formatDate(item.date)}</td>
                  <td className={item.amount >= 0 ? 'farmer-money farmer-money--up' : 'farmer-money farmer-money--down'}>
                    {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount)}
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

export default FarmerWallet;
