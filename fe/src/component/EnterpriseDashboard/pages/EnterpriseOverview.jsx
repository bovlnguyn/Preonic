import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiFileText, FiLayers, FiPlus, FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import { useState, useEffect } from 'react';
import contractService from '../../../services/contract.service';
import billingService from '../../../services/billing.service';
import partnerRatingService from '../../../services/partner-rating.service';
import { resolveContractStatusLabel, resolveContractProgress } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];
const CONTRACTS_PER_PAGE = 10;

const STAT_ICONS = {
  'total-contracts': FiFileText,
  'active-contracts': FiLayers,
  'fees-due': FiCreditCard,
  reputation: FiStar,
};

function EnterpriseOverview() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [contractsPage, setContractsPage] = useState(1);
  const [contractPagination, setContractPagination] = useState({ total: 0, totalPages: 0 });
  const [orders, setOrders] = useState([]);
  const [feesDue, setFeesDue] = useState(0);
  const [reputation, setReputation] = useState({ average: 0, count: 0 });
  const [contractSummary, setContractSummary] = useState({
    totalContracts: 0,
    totalContractValue: 0,
    activeContracts: 0,
    pendingContracts: 0,
  });

  // KPI/mini-order duoc tai bang cac endpoint nhe; khong tai 100 contracts + toan bo escrow.
  useEffect(() => {
    let alive = true;

    Promise.all([
      contractService.summary(),
      billingService.getAccount().catch(() => null),
      partnerRatingService.getMyRatings().catch(() => null),
      contractService.list(ORDER_CONTRACT_STATUSES.join(','), { page: 1, limit: 3 }),
    ])
      .then(([summaryRes, billingRes, ratingsRes, ordersRes]) => {
        if (!alive) return;
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

        const orderContracts = ordersRes?.data?.contracts || [];
        setOrders(orderContracts.map((contract) => {
          const deliveryLabel = {
            pending: 'Chờ chuẩn bị hàng',
            preparing: 'Đang chuẩn bị hàng',
            shipping: 'Đang vận chuyển',
            delivered: 'Đã nhận hàng',
            failed: 'Giao hàng thất bại',
          }[contract.deliveryStatus] || resolveContractStatusLabel(contract);

          return {
            id: contract.contractCode,
            contractId: contract.id,
            farmer: contract.farmer?.name,
            product: contract.product?.name,
            status: deliveryLabel,
            milestone: contract.paymentFlow === 'direct_v2'
              ? 'Thanh toán trực tiếp theo tiến độ hợp đồng'
              : 'Luồng escrow legacy',
          };
        }));
      })
      .catch(() => {
        if (!alive) return;
        setOrders([]);
        setFeesDue(0);
        setReputation({ average: 0, count: 0 });
        setContractSummary({ totalContracts: 0, totalContractValue: 0, activeContracts: 0, pendingContracts: 0 });
      });

    return () => { alive = false; };
  }, []);

  // Bang hop dong phan trang that tai backend.
  useEffect(() => {
    let alive = true;
    contractService.list(undefined, { page: contractsPage, limit: CONTRACTS_PER_PAGE })
      .then((res) => {
        if (!alive) return;
        setContracts(res?.data?.contracts || []);
        const pagination = res?.data?.pagination || {};
        setContractPagination({
          total: Number(pagination.total || 0),
          totalPages: Number(pagination.totalPages || 0),
        });
      })
      .catch(() => {
        if (!alive) return;
        setContracts([]);
        setContractPagination({ total: 0, totalPages: 0 });
      });
    return () => { alive = false; };
  }, [contractsPage]);

  const totalContractPages = Math.max(1, Number(contractPagination.totalPages || 1));
  const paginatedContracts = contracts;

  useEffect(() => {
    setContractsPage((currentPage) => Math.min(currentPage, totalContractPages));
  }, [totalContractPages]);

  const activeContractsCount = Number(contractSummary.activeContracts || 0);

  const stats = [
    {
      id: 'total-contracts',
      label: 'Tổng hợp đồng',
      value: String(contractSummary.totalContracts),
      change: `${formatMoney(contractSummary.totalContractValue)} tổng giá trị`,
      tone: 'blue',
    },
    {
      id: 'active-contracts',
      label: 'Hợp đồng hiệu lực',
      value: String(activeContractsCount),
      change: `${contractSummary.totalContracts} hợp đồng đã gửi/chưa hủy`,
      tone: 'green',
    },
    {
      id: 'fees-due',
      label: 'Phí dịch vụ cần trả',
      value: formatMoney(feesDue),
      change: 'Quản lý tại Thanh toán & Phí',
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
    <div className="ent-stack">

      {/* Hero */}
      <section className="ent-hero-card">
        <div>
          <span className="ent-eyebrow ent-eyebrow--light">Tổng quan doanh nghiệp</span>
          <h2>Kiểm soát thu mua, hợp đồng và dòng vốn trên một dashboard.</h2>
          <p>
            Theo dõi toàn bộ chuỗi cung ứng từ tìm nguồn cung đến thanh toán trực tiếp và giao nhận.
          </p>
          <div className="ent-hero-card__actions">
            <button type="button" onClick={() => navigate('/enterprise/products')}>
              <FiPlus /> Tìm nguồn cung
            </button>
            <button type="button" onClick={() => navigate('/enterprise/contracts')}>
              Xem hợp đồng
            </button>
          </div>
        </div>
        <div className="ent-hero-card__panel">
          <span>Tổng giá trị hợp đồng</span>
          <strong>{formatMoney(contractSummary.totalContractValue)}</strong>
          <p>
            {contractSummary.totalContracts > 0
              ? `Từ ${contractSummary.totalContracts} hợp đồng chưa hủy.`
              : 'Chưa có hợp đồng nào trong hệ thống.'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="ent-grid ent-grid--4">
        {stats.map((item) => (
          <StatCard
            key={item.id}
            icon={STAT_ICONS[item.id]}
            label={item.label}
            value={item.value}
            change={item.change}
            tone={item.tone}
          />
        ))}
      </section>

      {/* Mini-lists */}
      <section className="ent-grid ent-grid--2">
        <div className="ent-card">
          <SectionHeader
            eyebrow="Hợp đồng nổi bật"
            title="Hợp đồng cần theo dõi"
            desc="Ưu tiên các hợp đồng gần hạn giao hoặc đang có khoản thanh toán cần xử lý."
          />
          {contracts.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng nào"
              desc="Tạo hợp đồng từ trang sản phẩm để bắt đầu theo dõi tại đây."
            />
          ) : (
            <div className="ent-mini-list">
              {contracts.slice(0, 3).map((c) => (
                <article
                  key={c.id}
                  className="ent-mini-item"
                  onClick={() => navigate(`/enterprise/contracts/${c.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <strong>{c.contractCode} — {c.product?.name}</strong>
                    <span>{c.farmer?.name} • {formatMoney(c.totalValue)} • {formatDate(c.deliveryDate)}</span>
                    <ProgressBar value={resolveContractProgress(c)} />
                  </div>
                  <StatusBadge status={resolveContractStatusLabel(c)} />
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="ent-card">
          <SectionHeader
            eyebrow="Đơn hàng gần đây"
            title="Luồng giao nhận mới nhất"
            desc="Theo dõi thanh toán trực tiếp, vận chuyển và xác nhận nhận hàng để tránh trễ tiến độ."
          />
          {orders.length === 0 ? (
            <EmptyState
              title="Chưa có đơn hàng nào"
              desc="Đơn hàng sẽ xuất hiện khi hợp đồng được kích hoạt."
            />
          ) : (
            <div className="ent-mini-list">
              {orders.slice(0, 3).map((o) => (
                <article
                  key={o.id}
                  className="ent-mini-item"
                  onClick={() => navigate(`/enterprise/contracts/${o.contractId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <strong>{o.id} • {o.product}</strong>
                    <span>{o.farmer} • {o.milestone}</span>
                    <ProgressBar value={o.status.includes('vận chuyển') ? 60 : o.status.includes('kiểm tra') ? 80 : 40} />
                  </div>
                  <StatusBadge status={o.status} />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contracts table */}
      <section className="ent-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Các hợp đồng đang hoạt động"
          desc="Bấm vào một hợp đồng để xem chi tiết thanh toán trực tiếp và tiến độ giao nhận."
        />
        {contracts.length === 0 ? (
          <EmptyState
            title="Chưa có hợp đồng nào"
            desc="Tạo hợp đồng từ trang sản phẩm để theo dõi tại đây."
          />
        ) : (
          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th><th>Nông dân</th><th>Nông sản</th>
                  <th>Giá trị</th><th>Hạn giao</th><th>Tiến độ</th><th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/enterprise/contracts/${c.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{c.contractCode}</td>
                    <td>{c.farmer?.name}</td>
                    <td>{c.product?.name}</td>
                    <td>{formatMoney(c.totalValue)}</td>
                    <td>{formatDate(c.deliveryDate)}</td>
                    <td className="ent-table__progress"><ProgressBar value={resolveContractProgress(c)} /></td>
                    <td><StatusBadge status={resolveContractStatusLabel(c)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contractPagination.total > CONTRACTS_PER_PAGE && (
              <div className="et-pagination">
                <span>
                  Trang {contractsPage} / {totalContractPages} — {contractPagination.total} hợp đồng
                </span>

                <div className="et-pagination-btns">
                  <button
                    type="button"
                    onClick={() => setContractsPage((page) => Math.max(1, page - 1))}
                    disabled={contractsPage === 1}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractsPage((page) => Math.min(totalContractPages, page + 1))}
                    disabled={contractsPage === totalContractPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}

export default EnterpriseOverview;
