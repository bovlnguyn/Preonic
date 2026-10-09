import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiCreditCard, FiFileText, FiPackage, FiPlus, FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import { useEffect, useState } from 'react';
import contractService from '../../../services/contract.service';
import farmerService from '../../../services/farmer.service';
import billingService from '../../../services/billing.service';
import partnerRatingService from '../../../services/partner-rating.service';
import { resolveContractStatusLabel, resolveContractProgress } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];
const ORDERS_PER_PAGE = 10;

function FarmerOverview() {
  const navigate = useNavigate();

  const statIcons = {
    'active-products': FiPackage,
    'active-contracts': FiFileText,
    wallet: FiCreditCard,
    reputation: FiStar,
  };

  const [cropProducts, setCropProducts] = useState([]);
  const [productSummary, setProductSummary] = useState({ totalProducts: 0, totalQuantity: 0 });
  const [contracts, setContracts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [feesDue, setFeesDue] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPagination, setOrdersPagination] = useState({ total: 0, totalPages: 0 });
  const [reputation, setReputation] = useState({ average: 0, count: 0 });
  const [contractSummary, setContractSummary] = useState({
    totalContracts: 0,
    totalContractValue: 0,
    activeContracts: 0,
    pendingContracts: 0,
  });

  useEffect(() => {
    Promise.all([
      farmerService.getMyCropsPage({ page: 1, limit: 3, includeSummary: true }),
      contractService.list(undefined, { page: 1, limit: 3 }),
      contractService.summary(),
      billingService.getAccount().catch(() => null),
      partnerRatingService.getMyRatings().catch(() => null),
    ])
      .then(([cropsResult, contractsRes, summaryRes, billingRes, ratingsRes]) => {
        setCropProducts(cropsResult?.products || []);
        setProductSummary(cropsResult?.summary || { totalProducts: 0, totalQuantity: 0 });
        setContracts(contractsRes?.data?.contracts || []);

        setContractSummary(summaryRes?.data?.summary || {
          totalContracts: 0,
          totalContractValue: 0,
          activeContracts: 0,
          pendingContracts: 0,
        });

        setFeesDue(Number(billingRes?.data?.outstandingAmount || 0));

        const ratingSummary = ratingsRes?.data?.summary || {};
        setReputation({
          average: Number(ratingSummary.reputationScore || 0),
          count: Number(ratingSummary.totalRatings || 0),
        });
      })
      .catch(() => {
        setCropProducts([]);
        setProductSummary({ totalProducts: 0, totalQuantity: 0 });
        setContracts([]);
        setFeesDue(0);
        setReputation({ average: 0, count: 0 });
        setContractSummary({ totalContracts: 0, totalContractValue: 0, activeContracts: 0, pendingContracts: 0 });
      });
  }, []);

  // Don hang tren Overview duoc phan trang o server va chi lay escrow cua chinh
  // cac contract dang hien thi. Khong con tai toan bo lich su escrow moi lan vao dashboard.
  useEffect(() => {
    let alive = true;

    contractService.list(ORDER_CONTRACT_STATUSES.join(','), {
      page: ordersPage,
      limit: ORDERS_PER_PAGE,
    })
      .then((contractsRes) => {
        const orderContracts = contractsRes?.data?.contracts || [];
        const pagination = contractsRes?.data?.pagination || {};
        if (!alive) return;

        setOrders(orderContracts.map((contract) => ({
          id: contract.contractCode,
          contractId: contract.id,
          product: contract.product?.name,
          buyer: contract.enterprise?.name,
          deliveryDate: contract.deliveryDate,
          status: ({
            pending: 'Chờ chuẩn bị hàng',
            preparing: 'Đang chuẩn bị hàng',
            shipping: 'Đang vận chuyển',
            delivered: 'Đã nhận hàng',
            failed: 'Giao hàng thất bại',
          }[contract.deliveryStatus] || resolveContractStatusLabel(contract)),
        })));
        setOrdersPagination({
          total: Number(pagination.total || 0),
          totalPages: Number(pagination.totalPages || 0),
        });
      })
      .catch(() => {
        if (!alive) return;
        setOrders([]);
        setOrdersPagination({ total: 0, totalPages: 0 });
      });

    return () => { alive = false; };
  }, [ordersPage]);

  const activeProductsCount = Number(productSummary.totalProducts || 0);
  const activeContractsCount = Number(contractSummary.activeContracts || 0);
  const pendingContractsCount = Number(contractSummary.pendingContracts || 0);

  const ordersTotalPages = Math.max(1, Number(ordersPagination.totalPages || 1));
  const safeOrdersPage = Math.min(ordersPage, ordersTotalPages);
  const paginatedOrders = orders;

  useEffect(() => {
    if (ordersPage > ordersTotalPages) {
      setOrdersPage(ordersTotalPages);
    }
  }, [ordersPage, ordersTotalPages]);

  const stats = [
    {
      id: 'active-products',
      label: 'Nông sản đang bán',
      value: String(activeProductsCount),
      change: `${productSummary.totalProducts || 0} sản phẩm đã đăng`,
      tone: 'green',
    },
    {
      id: 'active-contracts',
      label: 'Hợp đồng hiệu lực',
      value: String(activeContractsCount),
      change: pendingContractsCount > 0
        ? `${pendingContractsCount} hợp đồng chờ xác nhận`
        : 'Không có hợp đồng chờ xác nhận',
      tone: 'blue',
    },
    {
      id: 'wallet',
      label: 'Phí dịch vụ cần trả',
      value: formatMoney(feesDue),
      change: 'Xem tại Thanh toán & Phí',
      tone: 'gold',
    },
    {
      id: 'reputation',
      label: 'Điểm uy tín',
      value: reputation.count > 0 ? `${reputation.average.toFixed(1)}/5` : 'Chưa có',
      change: `Dựa trên ${reputation.count} đánh giá`,
      tone: 'purple',
    },
  ];

  return (
    <div className="farmer-stack">
      <section className="farmer-hero-card">
        <div>
          <span className="farmer-eyebrow farmer-eyebrow--light">Tổng quan nông hộ</span>
          <h2>Kiểm soát mùa vụ, hợp đồng và dòng tiền trên một dashboard.</h2>
          <p>
            Theo dõi mùa vụ, quản lý hợp đồng và dòng tiền của bạn — mọi số liệu trên trang này đều được cập nhật trực tiếp từ hệ thống.
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
        {stats.map((item) => (
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
          {cropProducts.length === 0 ? (
            <EmptyState
              title="Chưa có nông sản nào"
              desc="Đăng bán nông sản để bắt đầu theo dõi mùa vụ tại đây."
            />
          ) : (
            <div className="farmer-mini-list">
              {cropProducts.slice(0, 3).map((item) => (
                <article
                  key={item.id}
                  className="farmer-mini-item"
                  onClick={() => navigate(`/farmer/crops/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.location || 'Chưa cập nhật'} •{' '}
                      {item.totalQuantity ? `${item.totalQuantity} ${item.unit || ''}` : 'Chưa cập nhật'} •{' '}
                      {formatDate(item.expectedDate)}
                    </span>
                    <ProgressBar value={item.progress} />
                  </div>
                  <StatusBadge status={item.isActive ? 'Đang hoạt động' : 'Tạm ngừng'} />
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="farmer-card">
          <SectionHeader
            eyebrow="Hợp đồng gần đây"
            title="Luồng giao dịch mới nhất"
            desc="Theo dõi hợp đồng, thanh toán trực tiếp và đơn hàng để tránh trễ tiến độ."
          />
          {contracts.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng nào"
              desc="Các đề xuất hợp đồng từ doanh nghiệp sẽ hiển thị tại đây."
            />
          ) : (
            <div className="farmer-mini-list">
              {contracts.slice(0, 3).map((item) => (
                <article
                  key={item.id}
                  className="farmer-mini-item"
                  onClick={() => navigate(`/farmer/contracts/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <strong>{item.contractCode} • {item.product?.name}</strong>
                    <span>{item.enterprise?.name} • {formatMoney(item.totalValue)}</span>
                    <ProgressBar value={resolveContractProgress(item)} />
                  </div>
                  <StatusBadge status={resolveContractStatusLabel(item)} />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="farmer-card">
        <SectionHeader
          eyebrow="Đơn hàng"
          title="Các đơn hàng cần xử lý"
          desc="Đơn hàng được tổng hợp từ các hợp đồng đã kích hoạt và tiến độ giao nhận."
        />
        {orders.length === 0 ? (
          <EmptyState
            title="Chưa có đơn hàng nào"
            desc="Đơn hàng sẽ xuất hiện khi hợp đồng được kích hoạt."
          />
        ) : (
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
                {paginatedOrders.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/farmer/contracts/${item.contractId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{item.id}</td>
                    <td>{item.product}</td>
                    <td>{item.buyer}</td>
                    <td>{formatDate(item.deliveryDate)}</td>
                    <td><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="farmer-pagination">
              <span>
                Trang {safeOrdersPage} / {ordersTotalPages} — {ordersPagination.total.toLocaleString('vi-VN')} đơn hàng
              </span>
              <div className="farmer-pagination__buttons">
                <button
                  type="button"
                  onClick={() => setOrdersPage((page) => Math.max(1, page - 1))}
                  disabled={safeOrdersPage <= 1}
                >
                  <FiChevronLeft size={14} /> Trước
                </button>
                <button
                  type="button"
                  onClick={() => setOrdersPage((page) => Math.min(ordersTotalPages, page + 1))}
                  disabled={safeOrdersPage >= ordersTotalPages}
                >
                  Sau <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default FarmerOverview;
