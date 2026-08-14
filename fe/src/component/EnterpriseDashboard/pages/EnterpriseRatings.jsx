import React, { useEffect, useMemo, useState } from 'react';
import { FiShield, FiUsers, FiCheck, FiTarget, FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import partnerRatingService from '../../../services/partner-rating.service';
import { useToast } from '../../../contexts/ToastContext';
import { formatRatingValue } from '../../../utils/rating';
import './EnterpriseRatings.css';

const CRITERIA_FIELDS = [
  { key: 'quality', label: 'Chất lượng sản phẩm' },
  { key: 'onTimeDelivery', label: 'Giao hàng đúng hạn' },
  { key: 'committedVolume', label: 'Đúng sản lượng cam kết' },
];

const VALUE_POINTS = [
  'Xếp hạng nông dân đáng tin cậy để hợp tác lâu dài',
  'Bảo vệ doanh nghiệp trước rủi ro chậm giao, sai sản lượng',
  'Tăng khả năng lập kế hoạch thu mua an toàn',
];

function StarPicker({ value, onChange }) {
  return (
    <span className="er-star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={n <= value ? 'er-star er-star--active' : 'er-star'}
          onClick={() => onChange(n)}
        >
          <FiStar />
        </button>
      ))}
    </span>
  );
}

function EnterpriseRatings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [given, setGiven] = useState([]);
  const [received, setReceived] = useState([]);

  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [criteria, setCriteria] = useState({ quality: 5, onTimeDelivery: 5, committedVolume: 5 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      partnerRatingService.getEligiblePartners(),
      partnerRatingService.getMyRatings(),
    ])
      .then(([partnersRes, ratingsRes]) => {
        setPartners(partnersRes?.data?.partners || []);
        setGiven(ratingsRes?.data?.given || []);
        setReceived(ratingsRes?.data?.received || []);
      })
      .catch(() => {
        setPartners([]);
        setGiven([]);
        setReceived([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const ratedContractIds = useMemo(() => new Set(given.map((r) => r.contractId)), [given]);

  const selectedPartner = partners.find((p) => p.partnerId === selectedPartnerId);
  const availableContracts = (selectedPartner?.contracts || []).filter(
    (c) => !ratedContractIds.has(c.contractId)
  );

  const averagePreview = (
    (criteria.quality + criteria.onTimeDelivery + criteria.committedVolume) / 3
  ).toFixed(1);

  const canSubmit = Boolean(selectedPartnerId && selectedContractId && comment.trim());

  const handlePartnerChange = (partnerId) => {
    setSelectedPartnerId(partnerId);
    setSelectedContractId('');
  };

  const submitRating = async () => {
    if (!canSubmit) {
      toast.warning('Vui lòng chọn đối tác, hợp đồng và nhập nhận xét.');
      return;
    }
    setSubmitting(true);
    try {
      await partnerRatingService.create({
        contractId: selectedContractId,
        revieweeId: selectedPartnerId,
        criteria,
        comment: comment.trim(),
      });
      toast.success('Đã gửi đánh giá đối tác.');
      setSelectedPartnerId('');
      setSelectedContractId('');
      setCriteria({ quality: 5, onTimeDelivery: 5, committedVolume: 5 });
      setComment('');
      load();
    } catch (err) {
      toast.error(err?.message || 'Đánh giá đối tác thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ent-stack">
      <SectionHeader
        breadcrumb="Đánh giá đối tác"
        eyebrow={<><FiShield size={12} /> Đánh giá đối tác</>}
        title="Đánh giá chất lượng hợp tác theo từng hợp đồng"
        desc="Sau mỗi hợp đồng hoàn tất, doanh nghiệp có thể đánh giá nhà cung cấp theo các tiêu chí chất lượng, tiến độ và sản lượng để xây dựng điểm tin cậy."
      />

      {loading ? (
        <div className="spinner-border text-primary" role="status" />
      ) : (
        <div className="er-page-split">
          <section className="ent-card er-form-card">
            <span className="er-role-tag">Doanh nghiệp đánh giá Nông dân</span>
            <p className="er-role-desc">
              Đánh giá chất lượng, giao hàng đúng hạn và đúng sản lượng cam kết trước khi mở rộng hoặc gia hạn hợp tác.
            </p>

            <div className="er-select-row">
              <div className="er-field">
                <label>Đối tác được đánh giá</label>
                <select value={selectedPartnerId} onChange={(e) => handlePartnerChange(e.target.value)}>
                  <option value="">Chọn đối tác</option>
                  {partners.map((p) => (
                    <option key={p.partnerId} value={p.partnerId}>{p.partnerName}</option>
                  ))}
                </select>
              </div>
              <div className="er-field">
                <label>Mã hợp đồng</label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  disabled={!selectedPartnerId}
                >
                  <option value="">Chọn hợp đồng</option>
                  {availableContracts.map((c) => (
                    <option key={c.contractId} value={c.contractId}>{c.contractCode} • {c.productName}</option>
                  ))}
                </select>
              </div>
            </div>

            {CRITERIA_FIELDS.map((f) => (
              <div className="er-criteria-box" key={f.key}>
                <div className="er-criteria-box__label"><FiTarget size={15} /> <strong>{f.label}</strong></div>
                <div className="er-criteria-box__stars">
                  <StarPicker
                    value={criteria[f.key]}
                    onChange={(v) => setCriteria((prev) => ({ ...prev, [f.key]: v }))}
                  />
                  <span className="er-score-pill">{criteria[f.key]}/5</span>
                </div>
              </div>
            ))}

            <div className="er-field">
              <label>Nhận xét chi tiết</label>
              <textarea
                className="er-textarea"
                placeholder="Nhập nhận xét thực tế để đối tác cải thiện quá trình hợp tác..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div className="er-submit-row">
              <div>
                <span className="er-submit-row__label">Điểm trung bình</span>
                <strong className="er-submit-row__score">{averagePreview}/5</strong>
              </div>
              <button
                type="button"
                className="er-btn-primary"
                onClick={submitRating}
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </section>

          <div className="er-sidebar">
            <section className="ent-card er-value-card">
              <h4><FiUsers size={15} /> Giá trị vận hành</h4>
              <ul className="er-value-list">
                {VALUE_POINTS.map((point) => (
                  <li key={point}><FiCheck size={13} /> {point}</li>
                ))}
              </ul>
            </section>

            <section className="ent-card er-summary-card">
              <div className="er-summary-card__head">
                <h4>Đánh giá đã gửi</h4>
                <span>{given.length} bản ghi</span>
              </div>
              {given.length === 0 ? (
                <p className="er-summary-empty">Bạn chưa gửi đánh giá nào.</p>
              ) : (
                <ul className="er-summary-list">
                  {given.map((r) => (
                    <li key={r.id}>
                      <strong>{r.reviewee?.fullName}</strong>
                      <span>{formatRatingValue(r.overallRating)}/5 • {r.contract?.contractCode}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ent-card er-summary-card">
              <div className="er-summary-card__head">
                <h4>Đánh giá nhận được</h4>
                <span>{received.length} bản ghi</span>
              </div>
              {received.length === 0 ? (
                <p className="er-summary-empty">Chưa có đánh giá nào được gửi cho bạn.</p>
              ) : (
                <ul className="er-summary-list">
                  {received.map((r) => (
                    <li key={r.id}>
                      <strong>{r.reviewer?.fullName}</strong>
                      <span>{formatRatingValue(r.overallRating)}/5 • {r.contract?.contractCode}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnterpriseRatings;
