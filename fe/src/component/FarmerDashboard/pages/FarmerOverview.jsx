import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiFileText, FiPackage, FiPlus, FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { farmerContracts, farmerStats, farmerOrders } from '../../../data/farmer';
import { useEffect, useState } from 'react';
import contractService from '../../../services/contract.service';
import farmerService from '../../../services/farmer.service';
import { formatDate, formatMoney } from '../utils';

function FarmerOverview() {
  const navigate = useNavigate();

  const statIcons = {
    'active-products': FiPackage,
    'active-contracts': FiFileText,
    wallet: FiCreditCard,
    reputation: FiStar,
  };

  const [cropProducts, setCropProducts] = useState([]);
  const [contractSummary, setContractSummary] = useState({
    totalContracts: 0,
    totalContractValue: 0,
  });

  useEffect(() => {
    Promise.all([
      farmerService.getMyCrops(),
      contractService.summary(),
    ])
      .then(([crops, summaryRes]) => {
        setCropProducts(Array.isArray(crops) ? crops : []);
        setContractSummary(summaryRes?.data?.summary || {
          totalContracts: 0,
          totalContractValue: 0,
        });
      })
      .catch(() => {
        setCropProducts([]);
        setContractSummary({ totalContracts: 0, totalContractValue: 0 });
      });
  }, []);

  return (
    <div className="farmer-stack">
      <section className="farmer-hero-card">
        <div>
          <span className="farmer-eyebrow farmer-eyebrow--light">Tổng quan nông hộ</span>
          <h2>Kiểm soát mùa vụ, hợp đồng và dòng tiền trên một dashboard.</h2>
          <p>
            Đây là màn hình tổng của farmer. Các module bên trái đã tách thành trang riêng để sau này nối API backend dễ hơn.
          </p>
          <div className="farmer-hero-card__actions">
            <button type="button" onClick={() => navigate('/farmer/create-product')}>
              <FiPlus /> Đăng bán nông sản
            </button>
            <button type="button" onClick={() => navigate('/farmer/contracts')}>
              Xem hợp đồng
            </button>
          </div>
        </div>
        <div className="farmer-hero-card__panel">
          <span>Doanh thu dự kiến</span>
          <strong>{formatMoney(contractSummary.totalContractValue)}</strong>
          <p>
            {contractSummary.totalContracts > 0
              ? `Đến từ ${contractSummary.totalContracts} hợp đồng chưa hủy.`
              : 'Chưa có hợp đồng tạo doanh thu.'}
          </p>
        </div>
      </section>

      <section className="farmer-grid farmer-grid--4">
        {farmerStats.map((item) => (
          <StatCard
            key={item.id}
            icon={statIcons[item.id]}
            label={item.label}
            value={item.value}
            change={item.change}
            tone={item.tone}
          />
        ))}
      </section>

      <section className="farmer-grid farmer-grid--2">
        <div className="farmer-card">
          <SectionHeader
            eyebrow="Mùa vụ nổi bật"
            title="Nông sản đang cần theo dõi"
            desc="Ưu tiên cập nhật tiến độ và ngày thu hoạch để doanh nghiệp có dữ liệu đặt hàng."
          />
          <div className="farmer-mini-list">
            {cropProducts.slice(0, 3).map((item) => (
              <article key={item.id} className="farmer-mini-item">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.location} • {item.quantity} • {formatDate(item.harvestDate)}</span>
                  <ProgressBar value={item.progress} />
                </div>
                <StatusBadge status={item.status} />
              </article>
            ))}
          </div>
        </div>

        <div className="farmer-card">
          <SectionHeader
            eyebrow="Hợp đồng gần đây"
            title="Luồng giao dịch mới nhất"
            desc="Theo dõi hợp đồng, ký quỹ và đơn hàng để tránh trễ tiến độ."
          />
          <div className="farmer-mini-list">
            {farmerContracts.slice(0, 3).map((item) => (
              <article key={item.id} className="farmer-mini-item">
                <div>
                  <strong>{item.id} • {item.product}</strong>
                  <span>{item.buyer} • {formatMoney(item.value)}</span>
                  <ProgressBar value={item.progress} />
                </div>
                <StatusBadge status={item.status} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="farmer-card">
        <SectionHeader
          eyebrow="Đơn hàng"
          title="Các đơn hàng cần xử lý"
          desc="Bản frontend đang dùng mock data. Khi backend xong, phần này thay bằng API orders."
        />
        <div className="farmer-table-wrap">
          <table className="farmer-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Sản phẩm</th>
                <th>Doanh nghiệp</th>
                <th>Ngày giao</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {farmerOrders.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.product}</td>
                  <td>{item.buyer}</td>
                  <td>{formatDate(item.deliveryDate)}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default FarmerOverview;
