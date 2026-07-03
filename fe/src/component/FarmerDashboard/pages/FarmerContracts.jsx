import React from 'react';
import { FiDownload, FiEye } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { farmerContracts } from '../../../data/farmer';
import { formatDate, formatMoney } from '../utils';

function FarmerContracts() {
  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và hợp đồng mua bán"
          desc="Khi backend hoàn thiện, trang này sẽ lấy dữ liệu từ contract API và cho phép ký/xác nhận hợp đồng thật."
        />

        <div className="farmer-table-wrap">
          <table className="farmer-table">
            <thead>
              <tr>
                <th>Mã HĐ</th>
                <th>Doanh nghiệp</th>
                <th>Nông sản</th>
                <th>Giá trị</th>
                <th>Ngày ký</th>
                <th>Hạn giao</th>
                <th>Tiến độ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {farmerContracts.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.buyer}</td>
                  <td>{item.product}</td>
                  <td>{formatMoney(item.value)}</td>
                  <td>{formatDate(item.signedDate)}</td>
                  <td>{formatDate(item.deadline)}</td>
                  <td className="farmer-table__progress"><ProgressBar value={item.progress} /></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    <div className="farmer-action-group">
                      <button type="button" title="Xem chi tiết"><FiEye /></button>
                      <button type="button" title="Tải hợp đồng"><FiDownload /></button>
                    </div>
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

export default FarmerContracts;
