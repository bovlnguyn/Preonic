import React, { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { enterpriseTransactions, enterpriseContracts, enterpriseEscrows } from '../data/enterpriseMockData';
import { formatDate, formatMoney } from '../utils';

const TABS = [
  { key: 'wallet',    label: 'Giao dịch ví' },
  { key: 'contracts', label: 'Hợp đồng' },
  { key: 'escrow',    label: 'Escrow' },
];

function EnterpriseTransactions() {
  const [tab, setTab] = useState('wallet');

  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Lịch sử giao dịch"
          title="Toàn bộ dòng tiền của doanh nghiệp"
          desc="Xem lịch sử ví, trạng thái hợp đồng và tiến độ escrow trên cùng một trang."
        />

        <div className="ent-filter-row">
          {TABS.map((t) => (
            <button key={t.key} type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'wallet' && (
          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr><th>Mã GD</th><th>Loại</th><th>Nội dung</th><th>Ngày</th><th>Số tiền</th></tr>
              </thead>
              <tbody>
                {enterpriseTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td><td>{tx.type}</td><td>{tx.note}</td>
                    <td>{formatDate(tx.date)}</td>
                    <td className={tx.amount >= 0 ? 'ent-money ent-money--up' : 'ent-money ent-money--down'}>
                      {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'contracts' && (
          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr><th>Mã HĐ</th><th>Nông dân</th><th>Sản phẩm</th><th>Giá trị</th><th>Hạn giao</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {enterpriseContracts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td><td>{c.farmer}</td><td>{c.product}</td>
                    <td>{formatMoney(c.value)}</td><td>{formatDate(c.deliveryDate)}</td>
                    <td><span className={`ent-badge ent-badge--${c.status.includes('Hoàn') ? 'success' : c.status.includes('hủy') ? 'danger' : 'info'}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'escrow' && (
          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr><th>Mã Escrow</th><th>Nông dân</th><th>Tổng ký quỹ</th><th>Đã giải ngân</th><th>Mốc hiện tại</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {enterpriseEscrows.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td><td>{e.farmer}</td>
                    <td>{formatMoney(e.amount)}</td><td>{formatMoney(e.released)}</td>
                    <td>{e.milestone}</td>
                    <td><span className={`ent-badge ent-badge--${e.status.includes('Chờ') ? 'warning' : e.status.includes('giải ngân') ? 'info' : 'neutral'}`}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default EnterpriseTransactions;