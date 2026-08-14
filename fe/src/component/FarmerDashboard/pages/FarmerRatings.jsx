import React, { useEffect, useMemo, useState } from 'react';
import { FiShield, FiUsers, FiCheck, FiTarget, FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import partnerRatingService from '../../../services/partner-rating.service';
import { useToast } from '../../../contexts/ToastContext';
import { formatRatingValue } from '../../../utils/rating';
import './FarmerRatings.css';

const CRITERIA_FIELDS = [
  { key: 'transparency', label: 'Minh bạch điều khoản' },
  { key: 'paymentPunctuality', label: 'Thanh toán đúng hạn' },
  { key: 'coordination', label: 'Phối hợp hợp đồng trước mùa vụ' },
];

const VALUE_POINTS = [
  'Xếp hạng doanh nghiệp đáng tin cậy để hợp tác lâu dài',
  'Bảo vệ nông dân trước rủi ro chậm thanh toán',
  'Tăng khả năng lập kế hoạch gieo trồng an toàn',
];

function StarPicker({ value, onChange }) {
  return (
    <span className="fr-star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={n <= value ? 'fr-star fr-star--active' : 'fr-star'}
          onClick={() => onChange(n)}
        >
          <FiStar />
        </button>
      ))}
    </span>
  );
}

function FarmerRatings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [given, setGiven] = useState([]);
  const [received, setReceived] = useState([]);

  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [criteria, setCriteria] = useState({ transparency: 5, paymentPunctuality: 5, coordination: 5 });
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
    (criteria.transparency + criteria.paymentPunctuality + criteria.coordination) / 3
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
      setCriteria({ transparency: 5, paymentPunctuality: 5, coordination: 5 });
      setComment('');
      load();
    } catch (err) {
      toast.error(err?.message || 'Đánh giá đối tác thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="farmer-stack">
      <SectionHeader
        eyebrow={<><FiShield size={12} /> Rating đối tác 2 chiều</>}
        title="Đánh giá chéo Doanh nghiệp - Nông dân theo từng hợp đồng"
        desc="Sau mỗi hợp đồng hoàn tất giao hàng, hai bên có thể đánh giá nhau theo bộ tiêu chí riêng để xây dựng điểm tin cậy và giảm rủi ro hợp tác cho mùa vụ tiếp theo."
      />

      {loading ? (
        <div className="spinner-border text-success" role="status" />
      ) : (
        <div className="fr-page-split">
          <section className="farmer-card fr-form-card">
            <span className="fr-role-tag">Nông dân / Supplier đánh giá Doanh nghiệp</span>
            <p className="fr-role-desc">
              Đánh giá tính minh bạch, thanh toán và phối hợp hợp đồng trước mùa vụ để giảm rủi ro bị ép giá, chậm tiền.
            </p>

            <div className="fr-select-row">
              <div className="fr-field">
                <label>Đối tác được đánh giá</label>
                <select value={selectedPartnerId} onChange={(e) => handlePartnerChange(e.target.value)}>
                  <option value="">Chọn đối tác</option>
                  {partners.map((p) => (
                    <option key={p.partnerId} value={p.partnerId}>{p.partnerName}</option>
                  ))}
                </select>
              </div>
              <div className="fr-field">
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
              <div className="fr-criteria-box" key={f.key}>
                <div className="fr-criteria-box__label"><FiTarget size={15} /> <strong>{f.label}</strong></div>
                <div className="fr-criteria-box__stars">
                  <StarPicker
                    value={criteria[f.key]}
                    onChange={(v) => setCriteria((prev) => ({ ...prev, [f.key]: v }))}
                  />
                  <span className="fr-score-pill">{criteria[f.key]}/5</span>
                </div>
              </div>
            ))}

            <div className="fr-field">
              <label>Nhận xét chi tiết</label>
              <textarea
                className="fr-textarea"
                placeholder="Nhập nhận xét thực tế để đối tác cải thiện quá trình hợp tác..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div className="fr-submit-row">
              <div>
                <span className="fr-submit-row__label">Điểm trung bình</span>
                <strong className="fr-submit-row__score">{averagePreview}/5</strong>
              </div>
              <button
                type="button"
                className="fr-btn-primary"
                onClick={submitRating}
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </section>

          <div className="fr-sidebar">
            <section className="farmer-card fr-value-card">
              <h4><FiUsers size={15} /> Giá trị vận hành</h4>
              <ul className="fr-value-list">
                {VALUE_POINTS.map((point) => (
                  <li key={point}><FiCheck size={13} /> {point}</li>
                ))}
              </ul>
            </section>

            <section className="farmer-card fr-summary-card">
              <div className="fr-summary-card__head">
                <h4>Đánh giá đã gửi</h4>
                <span>{given.length} bản ghi</span>
              </div>
              {given.length === 0 ? (
                <p className="fr-summary-empty">Bạn chưa gửi đánh giá nào.</p>
              ) : (
                <ul className="fr-summary-list">
                  {given.map((r) => (
                    <li key={r.id}>
                      <strong>{r.reviewee?.fullName}</strong>
                      <span>{formatRatingValue(r.overallRating)}/5 • {r.contract?.contractCode}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="farmer-card fr-summary-card">
              <div className="fr-summary-card__head">
                <h4>Đánh giá nhận được</h4>
                <span>{received.length} bản ghi</span>
              </div>
              {received.length === 0 ? (
                <p className="fr-summary-empty">Chưa có đánh giá nào được gửi cho bạn.</p>
              ) : (
                <ul className="fr-summary-list">
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

export default FarmerRatings;
