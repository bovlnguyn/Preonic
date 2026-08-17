import React, { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiShield, FiStar, FiTarget, FiUsers } from 'react-icons/fi';
import partnerRatingService from '../../../services/partner-rating.service';
import { useToast } from '../../../contexts/ToastContext';
import { formatRatingValue } from '../../../utils/rating';

function makeInitialCriteria(fields) {
  return fields.reduce((result, field) => ({ ...result, [field.key]: 5 }), {});
}

function StarPicker({ classPrefix, value, onChange }) {
  return (
    <span className={`${classPrefix}-star-picker`}>
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          type="button"
          key={score}
          className={score <= value
            ? `${classPrefix}-star ${classPrefix}-star--active`
            : `${classPrefix}-star`}
          onClick={() => onChange(score)}
        >
          <FiStar />
        </button>
      ))}
    </span>
  );
}

function PartnerRatingsPage({
  shellPrefix,
  classPrefix,
  spinnerClassName,
  SectionHeader,
  headerProps,
  criteriaFields,
  valuePoints,
  roleTag,
  roleDescription,
}) {
  const toast = useToast();
  const initialCriteria = useMemo(() => makeInitialCriteria(criteriaFields), [criteriaFields]);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [given, setGiven] = useState([]);
  const [received, setReceived] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [criteria, setCriteria] = useState(() => makeInitialCriteria(criteriaFields));
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

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ratedContractIds = useMemo(() => new Set(given.map((rating) => rating.contractId)), [given]);
  const selectedPartner = partners.find((partner) => partner.partnerId === selectedPartnerId);
  const availableContracts = (selectedPartner?.contracts || []).filter(
    (contract) => !ratedContractIds.has(contract.contractId),
  );

  const averagePreview = (
    criteriaFields.reduce((sum, field) => sum + Number(criteria[field.key] || 0), 0) / criteriaFields.length
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
      setCriteria(initialCriteria);
      setComment('');
      load();
    } catch (err) {
      toast.error(err?.message || 'Đánh giá đối tác thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${shellPrefix}-stack`}>
      <SectionHeader
        {...headerProps}
        eyebrow={<><FiShield size={12} /> {headerProps.eyebrow}</>}
      />

      {loading ? (
        <div className={`spinner-border ${spinnerClassName}`} role="status" />
      ) : (
        <div className={`${classPrefix}-page-split`}>
          <section className={`${shellPrefix}-card ${classPrefix}-form-card`}>
            <span className={`${classPrefix}-role-tag`}>{roleTag}</span>
            <p className={`${classPrefix}-role-desc`}>{roleDescription}</p>

            <div className={`${classPrefix}-select-row`}>
              <div className={`${classPrefix}-field`}>
                <label>Đối tác được đánh giá</label>
                <select value={selectedPartnerId} onChange={(event) => handlePartnerChange(event.target.value)}>
                  <option value="">Chọn đối tác</option>
                  {partners.map((partner) => (
                    <option key={partner.partnerId} value={partner.partnerId}>{partner.partnerName}</option>
                  ))}
                </select>
              </div>

              <div className={`${classPrefix}-field`}>
                <label>Mã hợp đồng</label>
                <select
                  value={selectedContractId}
                  onChange={(event) => setSelectedContractId(event.target.value)}
                  disabled={!selectedPartnerId}
                >
                  <option value="">Chọn hợp đồng</option>
                  {availableContracts.map((contract) => (
                    <option key={contract.contractId} value={contract.contractId}>
                      {contract.contractCode} • {contract.productName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {criteriaFields.map((field) => (
              <div className={`${classPrefix}-criteria-box`} key={field.key}>
                <div className={`${classPrefix}-criteria-box__label`}>
                  <FiTarget size={15} /> <strong>{field.label}</strong>
                </div>
                <div className={`${classPrefix}-criteria-box__stars`}>
                  <StarPicker
                    classPrefix={classPrefix}
                    value={criteria[field.key]}
                    onChange={(value) => setCriteria((prev) => ({ ...prev, [field.key]: value }))}
                  />
                  <span className={`${classPrefix}-score-pill`}>{criteria[field.key]}/5</span>
                </div>
              </div>
            ))}

            <div className={`${classPrefix}-field`}>
              <label>Nhận xét chi tiết</label>
              <textarea
                className={`${classPrefix}-textarea`}
                placeholder="Nhập nhận xét thực tế để đối tác cải thiện quá trình hợp tác..."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
              />
            </div>

            <div className={`${classPrefix}-submit-row`}>
              <div>
                <span className={`${classPrefix}-submit-row__label`}>Điểm trung bình</span>
                <strong className={`${classPrefix}-submit-row__score`}>{averagePreview}/5</strong>
              </div>
              <button
                type="button"
                className={`${classPrefix}-btn-primary`}
                onClick={submitRating}
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </section>

          <div className={`${classPrefix}-sidebar`}>
            <section className={`${shellPrefix}-card ${classPrefix}-value-card`}>
              <h4><FiUsers size={15} /> Giá trị vận hành</h4>
              <ul className={`${classPrefix}-value-list`}>
                {valuePoints.map((point) => (
                  <li key={point}><FiCheck size={13} /> {point}</li>
                ))}
              </ul>
            </section>

            <section className={`${shellPrefix}-card ${classPrefix}-summary-card`}>
              <div className={`${classPrefix}-summary-card__head`}>
                <h4>Đánh giá đã gửi</h4>
                <span>{given.length} bản ghi</span>
              </div>
              {given.length === 0 ? (
                <p className={`${classPrefix}-summary-empty`}>Bạn chưa gửi đánh giá nào.</p>
              ) : (
                <ul className={`${classPrefix}-summary-list`}>
                  {given.map((rating) => (
                    <li key={rating.id}>
                      <strong>{rating.reviewee?.fullName}</strong>
                      <span>{formatRatingValue(rating.overallRating)}/5 • {rating.contract?.contractCode}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${shellPrefix}-card ${classPrefix}-summary-card`}>
              <div className={`${classPrefix}-summary-card__head`}>
                <h4>Đánh giá nhận được</h4>
                <span>{received.length} bản ghi</span>
              </div>
              {received.length === 0 ? (
                <p className={`${classPrefix}-summary-empty`}>Chưa có đánh giá nào được gửi cho bạn.</p>
              ) : (
                <ul className={`${classPrefix}-summary-list`}>
                  {received.map((rating) => (
                    <li key={rating.id}>
                      <strong>{rating.reviewer?.fullName}</strong>
                      <span>{formatRatingValue(rating.overallRating)}/5 • {rating.contract?.contractCode}</span>
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

export default PartnerRatingsPage;
