import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import { CONTRACT_STATUS_LABEL } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';

function FarmerContracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contractService.list()
      .then(res => setContracts(res?.data?.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và hợp đồng mua bán"
          desc="Ký xác nhận hoặc từ chối các đề xuất hợp đồng từ doanh nghiệp."
        />

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : contracts.length === 0 ? (
          <EmptyState
            title="Chưa có hợp đồng nào"
            desc="Các đề xuất hợp đồng từ doanh nghiệp sẽ hiển thị tại đây."
          />
        ) : (
          <div className="farmer-table-wrap">
            <table className="farmer-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Doanh nghiệp</th>
                  <th>Nông sản</th>
                  <th>Số lượng</th>
                  <th>Giá trị</th>
                  <th>Hạn giao</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.contractCode}</td>
                    <td>{item.enterprise?.name}</td>
                    <td>{item.product?.name}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{formatMoney(item.totalValue)}</td>
                    <td>{formatDate(item.deliveryDate)}</td>
                    <td><StatusBadge status={CONTRACT_STATUS_LABEL[item.status] || item.status} /></td>
                    <td>
                      <div className="farmer-action-group">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          onClick={() => navigate(`/farmer/contracts/${item.id}`)}
                        >
                          <FiEye />
                        </button>
                      </div>
                    </td>
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

export default FarmerContracts;
