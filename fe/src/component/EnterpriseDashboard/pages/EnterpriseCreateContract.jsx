import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft, FiArrowRight, FiCheckCircle,
  FiShield, FiCheck, FiAlertTriangle, FiX
} from 'react-icons/fi';
import { useAuth } from '../../../contexts/AuthContext';
import contractService from '../../../services/contract.service';
import enterpriseService from '../../../services/enterprise.service';
import productService from '../../../services/product.service';
import ContractFlow from '../../ContractFlow/ContractFlow';
import './EnterpriseCreateContract.css';

// ── Hằng số ───────────────────────────────────────────────
const STEPS = [
  { key: 'propose',      label: 'Đề xuất' },
  { key: 'review',       label: 'Xem xét' },
  { key: 'preon_verify', label: 'PreOnic Xác nhận' },
  { key: 'sign',         label: 'Ký hợp đồng' },
  { key: 'done',         label: 'Hoàn tất' },
];

const PAYMENT_TERMS = [
  { value: '50_50',         label: '50% đặt cọc -- 50% khi nhận hàng' },
  { value: '30_70',         label: '30% đặt cọc -- 70% khi nhận hàng' },
  { value: '100_delivery',  label: '100% khi nhận hàng' },
  { value: '100_upfront',   label: '100% trả trước' },
  { value: 'custom',        label: 'Khác (tùy chỉnh)' },
];

const UNITS = ['kg', 'tạ', 'tấn'];

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('vi-VN') + 'đ';

const getDepositLabel = (paymentTerms, customDeposit, customOnDelivery) => {
  if (paymentTerms === '50_50')        return '50% đặt cọc / 50% khi nhận hàng';
  if (paymentTerms === '30_70')        return '30% đặt cọc / 70% khi nhận hàng';
  if (paymentTerms === '100_delivery') return '100% khi nhận hàng';
  if (paymentTerms === '100_upfront')  return '100% trả trước';
  if (paymentTerms === 'custom')       return `${customDeposit}% đặt cọc / ${customOnDelivery}% khi nhận hàng`;
  return '';
};

// ── Terms Modal ────────────────────────────────────────────
function TermsModal({ type, onClose, onAgree }) {
  return (
    <div className="ecc-modal-overlay" onClick={onClose}>
      <div className="ecc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ecc-modal__header">
          <h3>{type === 'contract' ? 'Điều khoản Hợp đồng Bao tiêu' : 'Điều khoản Dịch vụ PreOnic'}</h3>
          <button className="ecc-modal__close" onClick={onClose}><FiX /></button>
        </div>
        <div className="ecc-modal__body">
          {type === 'contract' ? (
            <>
              <h4>1. Phạm vi hợp đồng</h4>
              <p>Hợp đồng bao tiêu nông sản này được ký kết giữa Bên bán (Nông dân/HTX) và Bên mua (Doanh nghiệp) thông qua nền tảng trung gian PreOnic. Hợp đồng có hiệu lực kể từ thời điểm cả hai bên hoàn tất ký điện tử.</p>
              <h4>2. Cam kết của Bên bán</h4>
              <p>Bên bán cam kết cung cấp nông sản đúng chủng loại, khối lượng, chất lượng và thời gian giao hàng đã thỏa thuận. Sản phẩm phải đáp ứng tiêu chuẩn VietGAP/GlobalGAP.</p>
              <h4>3. Cam kết của Bên mua</h4>
              <p>Bên mua cam kết thanh toán đúng hạn theo lịch đã thỏa thuận. Mọi khoản thanh toán được thực hiện qua hệ thống Ký quỹ PreOnic Escrow để bảo đảm an toàn cho cả hai bên.</p>
              <h4>4. Cơ chế ký quỹ</h4>
              <p>Toàn bộ giá trị hợp đồng được giữ trong tài khoản Escrow cho đến khi Bên mua xác nhận nghiệm thu. Nếu phát sinh tranh chấp, PreOnic sẽ đóng vai trò trung gian hòa giải.</p>
              <h4>5. Vi phạm và bồi thường</h4>
              <p>Vi phạm hợp đồng có thể dẫn đến bồi thường tối đa 20% giá trị hợp đồng tùy mức độ lỗi.</p>
              <h4>6. Tranh chấp</h4>
              <p>Tranh chấp được giải quyết qua cơ chế Dispute Resolution của PreOnic trong vòng 15 ngày làm việc.</p>
            </>
          ) : (
            <>
              <h4>1. Phí dịch vụ trung gian</h4>
              <p><strong>3% giá trị hợp đồng</strong> là phí dịch vụ PreOnic thu để cung cấp nền tảng kết nối, hệ thống Escrow và hỗ trợ giải quyết tranh chấp.</p>
              <h4>2. Những gì bạn nhận được</h4>
              <ul>
                <li>Bảo vệ Escrow: Tiền giao dịch giữ an toàn đến khi nghiệm thu xong.</li>
                <li>Xác minh đối tác: PreOnic xác minh danh tính cả hai bên.</li>
                <li>Hợp đồng điện tử có giá trị pháp lý theo tiêu chuẩn pháp luật Việt Nam.</li>
                <li>Giải quyết tranh chấp miễn phí trong 15 ngày làm việc.</li>
                <li>Hỗ trợ 24/7.</li>
              </ul>
              <h4>3. Thời điểm thu phí</h4>
              <p>Phí chỉ thu khi giao dịch hoàn tất. Nếu hợp đồng bị hủy trước khi thực hiện, không thu phí.</p>
            </>
          )}
        </div>
        <div className="ecc-modal__footer">
          <button className="ecc-btn ecc-btn--primary" onClick={onAgree}>Tôi đã đọc và đồng ý</button>
          <button className="ecc-btn ecc-btn--outline" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function EnterpriseCreateContract() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const productId = searchParams.get('product');

  // ── State ──────────────────────────────────────────────
  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});
  const [contractCode]            = useState(enterpriseService.generateContractCode);
  const [createdContract, setCreatedContract] = useState(null);
  const [showTermsModal, setShowTermsModal]   = useState(null); // 'contract' | 'service'
  const [agreed, setAgreed]       = useState({ terms: false, preon: false });
  const [showInsurance, setShowInsurance]     = useState(false);

  const [form, setForm] = useState({
    productName:    '',
    farmerName:     '',
    enterpriseName: user?.fullName || '',
    quantity:       '',
    unit:           'kg',
    pricePerUnit:   '',
    deliveryDate:   '',
    paymentTerms:   '50_50',
    customDeposit:  '',
    customOnDelivery: '',
    notes:          '',
  });

  const [insurance, setInsurance] = useState({
    insuranceCompany: '',
    policyNumber:     '',
    insuredValue:     '',
    coveredEvents:    'both',
    validFrom:        '',
    validTo:          '',
    riskSharingTerms: '',
  });

  // Tự điền nếu có productId
  useEffect(() => {
    if (!productId) return;
    productService.getProductById(productId)
      .then(data => {
        const p = data?.data?.product || data?.data || data;
        if (!p) return;
        const matchedUnit = UNITS.find(
          u => u.normalize('NFC') === String(p.unit || '').normalize('NFC')
        );
        setForm(prev => ({
          ...prev,
          productName:  p.name || prev.productName,
          farmerName:   p.sellerName || prev.farmerName,
          unit:         matchedUnit || prev.unit,
          pricePerUnit: p.priceMin ? String(p.priceMin) : prev.pricePerUnit,
        }));
      })
      .catch(() => {});
  }, [productId]);

  // ── Computed ───────────────────────────────────────────
  const { totalValue, commission } = enterpriseService.calculateContractTotals(form);
  const today         = new Date().toISOString().split('T')[0];

  const customDepositValid = () => {
    const d = parseFloat(form.customDeposit);
    const r = parseFloat(form.customOnDelivery);
    return !isNaN(d) && !isNaN(r) && d >= 0 && d <= 100 && r >= 0 && r <= 100 && Math.abs(d + r - 100) < 0.01;
  };

  // ── Validate step 0 ────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.productName.trim())  e.productName  = 'Vui lòng nhập tên sản phẩm.';
    if (!form.farmerName.trim())   e.farmerName   = 'Vui lòng nhập tên nông dân cung cấp.';
    if (!form.quantity || parseFloat(form.quantity) <= 0)
      e.quantity = 'Số lượng phải lớn hơn 0.';
    if (!form.pricePerUnit || parseFloat(form.pricePerUnit) <= 0)
      e.pricePerUnit = 'Giá phải lớn hơn 0.';
    if (!form.deliveryDate)
      e.deliveryDate = 'Vui lòng chọn ngày giao hàng.';
    else if (form.deliveryDate <= today)
      e.deliveryDate = 'Ngày giao hàng phải sau ngày hôm nay.';
    if (form.paymentTerms === 'custom' && !customDepositValid())
      e.customDeposit = 'Tổng đặt cọc + khi nhận hàng phải bằng 100%.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ───────────────────────────────────────────
  const setField = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const setInsField = (k, v) => setInsurance(prev => ({ ...prev, [k]: v }));

  const handleCustomDeposit = (val, field) => {
    const num = val === '' ? '' : String(Math.min(100, Math.max(0, Number(val))));
    if (field === 'deposit') {
      setField('customDeposit', num);
      if (num !== '') setField('customOnDelivery', String(100 - Number(num)));
    } else {
      setField('customOnDelivery', num);
      if (num !== '') setField('customDeposit', String(100 - Number(num)));
    }
  };

  const handleNext = () => {
    if (step === 0 && !validate()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleBack = () => { if (step > 0) setStep(s => s - 1); };

  const handleSign = async () => {
    setLoading(true);
    try {
      const depositPct = enterpriseService.resolveDepositPercentage(form.paymentTerms, form.customDeposit);

      const payload = {
        contractCode,
        productName:       form.productName,
        farmerName:        form.farmerName,
        enterpriseName:    form.enterpriseName || user?.fullName,
        quantity:          parseFloat(form.quantity),
        unit:              form.unit,
        pricePerUnit:      parseFloat(form.pricePerUnit),
        deliveryDate:      form.deliveryDate,
        paymentTerms:      form.paymentTerms,
        qualityRequirements: form.notes,
        depositPercentage: depositPct,
        totalValue,
        commission,
        productId:         productId || undefined,
      };

      if (showInsurance && insurance.insuranceCompany) {
        payload.insuranceEnterprise = {
          insuranceCompany: insurance.insuranceCompany,
          policyNumber:     insurance.policyNumber,
          insuredValue:     parseFloat(insurance.insuredValue) || 0,
          coveredEvents:    insurance.coveredEvents,
          validFrom:        insurance.validFrom,
          validTo:          insurance.validTo,
          riskSharingTerms: insurance.riskSharingTerms,
        };
      }

      const result = await enterpriseService.proposeContract(payload);
      const contract = result.data?.contract || result.data;
      setCreatedContract(contract);

      // Auto-sign
      const cId = contract?._id;
      if (cId) {
        try { await contractService.sign(cId); } catch (e) { console.warn('Auto-sign:', e); }
      }

      setStep(4);
    } catch (err) {
      setErrors({ submit: err?.message || 'Tạo hợp đồng thất bại, vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  const canSign = agreed.terms && agreed.preon;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="ecc-page">
      {/* Header */}
      <div className="ecc-page__top">
        <button className="ecc-back" onClick={() => navigate(-1)}>
          <FiArrowLeft size={14} /> Quay lại
        </button>
      </div>

      <div className="ecc-page__heading">
        <h1>Tạo Hợp Đồng Bao Tiêu</h1>
        <p>Luồng ký hợp đồng qua trung gian <strong>PreOnic</strong> -- đảm bảo quyền lợi hai bên</p>
      </div>

      <ContractFlow steps={STEPS} currentIndex={step} />

      <div className="ecc-body">

        {/* ── BƯỚC 0: Thông tin hợp đồng ── */}
        {step === 0 && (
          <div className="ecc-card">
            <h3 className="ecc-card__title">Thông tin hợp đồng</h3>

            <div className="ecc-row">
              <div className="ecc-field">
                <label>Sản phẩm <span className="ecc-req">*</span></label>
                <input
                  className={errors.productName ? 'ecc-input ecc-input--error' : 'ecc-input'}
                  value={form.productName}
                  onChange={e => setField('productName', e.target.value)}
                  placeholder="VD: Thanh Long Ruột Đỏ"
                />
                {errors.productName && <span className="ecc-err">{errors.productName}</span>}
              </div>

              <div className="ecc-field">
                <label>Số lượng <span className="ecc-req">*</span></label>
                <div className="ecc-input-group">
                  <input
                    className={errors.quantity ? 'ecc-input ecc-input--error' : 'ecc-input'}
                    type="number" min="0.01" step="0.01"
                    value={form.quantity}
                    onChange={e => setField('quantity', e.target.value)}
                    placeholder="VD: 5"
                  />
                  <select className="ecc-select" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                {errors.quantity && <span className="ecc-err">{errors.quantity}</span>}
              </div>
            </div>

            <div className="ecc-row">
              <div className="ecc-field">
                <label>Giá mỗi {form.unit} (VND) <span className="ecc-req">*</span></label>
                <input
                  className={errors.pricePerUnit ? 'ecc-input ecc-input--error' : 'ecc-input'}
                  type="number" min="0"
                  value={form.pricePerUnit}
                  onChange={e => setField('pricePerUnit', e.target.value)}
                  placeholder="VD: 15000"
                />
                {errors.pricePerUnit && <span className="ecc-err">{errors.pricePerUnit}</span>}
                {totalValue > 0 && (
                  <span className="ecc-note">Tổng giá trị: <strong>{fmtMoney(totalValue)}</strong></span>
                )}
              </div>

              <div className="ecc-field">
                <label>Ngày giao hàng <span className="ecc-req">*</span></label>
                <input
                  className={errors.deliveryDate ? 'ecc-input ecc-input--error' : 'ecc-input'}
                  type="date"
                  min={today}
                  value={form.deliveryDate}
                  onChange={e => setField('deliveryDate', e.target.value)}
                />
                {errors.deliveryDate && <span className="ecc-err">{errors.deliveryDate}</span>}
              </div>
            </div>

            <div className="ecc-row">
              <div className="ecc-field">
                <label>Phương thức đặt cọc</label>
                <select className="ecc-select ecc-select--full"
                  value={form.paymentTerms}
                  onChange={e => { setField('paymentTerms', e.target.value); setField('customDeposit', ''); setField('customOnDelivery', ''); }}
                >
                  {PAYMENT_TERMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>

                {form.paymentTerms === 'custom' && (
                  <div className="ecc-custom-deposit">
                    <div className="ecc-row">
                      <div className="ecc-field">
                        <label>Đặt cọc (%)</label>
                        <input className="ecc-input" type="number" min="0" max="100"
                          value={form.customDeposit}
                          onChange={e => handleCustomDeposit(e.target.value, 'deposit')}
                          placeholder="VD: 40"
                        />
                      </div>
                      <div className="ecc-field">
                        <label>Khi nhận hàng (%)</label>
                        <input className="ecc-input" type="number" min="0" max="100"
                          value={form.customOnDelivery}
                          onChange={e => handleCustomDeposit(e.target.value, 'delivery')}
                          placeholder="VD: 60"
                        />
                      </div>
                    </div>
                    {errors.customDeposit && <span className="ecc-err">{errors.customDeposit}</span>}
                    {customDepositValid() && (
                      <span className="ecc-ok">✓ {form.customDeposit}% đặt cọc -- {form.customOnDelivery}% khi nhận hàng</span>
                    )}
                  </div>
                )}
              </div>

              <div className="ecc-field">
                <label>Nông dân cung cấp <span className="ecc-req">*</span></label>
                <input
                  className={errors.farmerName ? 'ecc-input ecc-input--error' : 'ecc-input'}
                  value={form.farmerName}
                  onChange={e => setField('farmerName', e.target.value)}
                  placeholder="Tên nông dân / HTX"
                />
                {errors.farmerName && <span className="ecc-err">{errors.farmerName}</span>}
              </div>
            </div>

            <div className="ecc-field ecc-field--full">
              <label>Ghi chú thêm</label>
              <textarea className="ecc-textarea" rows={3}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Yêu cầu đặc biệt, tiêu chuẩn chất lượng..."
              />
            </div>

            {/* Insurance toggle */}
            <label className="ecc-insurance-toggle">
              <input type="checkbox" checked={showInsurance}
                onChange={e => setShowInsurance(e.target.checked)} />
              <span>Thêm thông tin bảo hiểm nông nghiệp (tùy chọn)</span>
            </label>

            {showInsurance && (
              <div className="ecc-insurance-section">
                <h4>Thông tin bảo hiểm của bạn</h4>
                <p className="ecc-ins-note">Nhập thông tin bảo hiểm nông nghiệp mà bạn đã mua từ công ty bảo hiểm bên ngoài.</p>
                <div className="ecc-row">
                  <div className="ecc-field">
                    <label>Tên công ty bảo hiểm</label>
                    <input className="ecc-input" value={insurance.insuranceCompany}
                      onChange={e => setInsField('insuranceCompany', e.target.value)}
                      placeholder="VD: Bao Viet, PVI..." />
                  </div>
                  <div className="ecc-field">
                    <label>Số hợp đồng bảo hiểm</label>
                    <input className="ecc-input" value={insurance.policyNumber}
                      onChange={e => setInsField('policyNumber', e.target.value)}
                      placeholder="VD: BV-2024-001234" />
                  </div>
                </div>
                <div className="ecc-row">
                  <div className="ecc-field">
                    <label>Giá trị được bảo hiểm (VND)</label>
                    <input className="ecc-input" type="number" value={insurance.insuredValue}
                      onChange={e => setInsField('insuredValue', e.target.value)}
                      placeholder="VD: 500000000" />
                  </div>
                  <div className="ecc-field">
                    <label>Sự kiện được bảo hiểm</label>
                    <select className="ecc-select ecc-select--full" value={insurance.coveredEvents}
                      onChange={e => setInsField('coveredEvents', e.target.value)}>
                      <option value="natural_disaster">Thiên tai</option>
                      <option value="disease">Dịch bệnh</option>
                      <option value="both">Cả hai (thiên tai + dịch bệnh)</option>
                    </select>
                  </div>
                </div>
                <div className="ecc-row">
                  <div className="ecc-field">
                    <label>Hiệu lực từ</label>
                    <input className="ecc-input" type="date" value={insurance.validFrom}
                      onChange={e => setInsField('validFrom', e.target.value)} />
                  </div>
                  <div className="ecc-field">
                    <label>Hiệu lực đến</label>
                    <input className="ecc-input" type="date" value={insurance.validTo}
                      onChange={e => setInsField('validTo', e.target.value)} />
                  </div>
                </div>
                <div className="ecc-field ecc-field--full">
                  <label>Điều khoản chia sẻ rủi ro (tùy chọn)</label>
                  <textarea className="ecc-textarea" rows={2}
                    value={insurance.riskSharingTerms}
                    onChange={e => setInsField('riskSharingTerms', e.target.value)}
                    placeholder="VD: Rủi ro thiên tai chia đều 50/50 giữa hai bên..." />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BƯỚC 1: Xem xét ── */}
        {step === 1 && (
          <div className="ecc-card">
            <h3 className="ecc-card__title">Xem xét hợp đồng</h3>
            <div className="ecc-summary">
              <div className="ecc-summary__row"><span>Sản phẩm:</span><strong>{form.productName}</strong></div>
              <div className="ecc-summary__row"><span>Số lượng:</span><strong>{form.quantity} {form.unit}</strong></div>
              <div className="ecc-summary__row"><span>Đơn giá:</span><strong>{fmtMoney(parseFloat(form.pricePerUnit) || 0)}/{form.unit}</strong></div>
              <div className="ecc-summary__row"><span>Ngày giao:</span><strong>{form.deliveryDate || '--'}</strong></div>
              <div className="ecc-summary__row"><span>Đặt cọc:</span><strong>{getDepositLabel(form.paymentTerms, form.customDeposit, form.customOnDelivery)}</strong></div>
              <div className="ecc-summary__row"><span>Nhà sản xuất:</span><strong>{form.farmerName || '--'}</strong></div>
              <div className="ecc-summary__row"><span>Doanh nghiệp:</span><strong>{form.enterpriseName || user?.fullName || '--'}</strong></div>
              {form.notes && <div className="ecc-summary__row"><span>Ghi chú:</span><strong>{form.notes}</strong></div>}

              {showInsurance && insurance.insuranceCompany && (
                <>
                  <hr className="ecc-divider" />
                  <div className="ecc-summary__row"><span>Bảo hiểm:</span><strong>{insurance.insuranceCompany}</strong></div>
                  {insurance.policyNumber && <div className="ecc-summary__row"><span>Số HĐ BH:</span><strong>{insurance.policyNumber}</strong></div>}
                  {insurance.insuredValue && <div className="ecc-summary__row"><span>Giá trị BH:</span><strong>{fmtMoney(insurance.insuredValue)}</strong></div>}
                </>
              )}

              <hr className="ecc-divider" />
              <div className="ecc-summary__row ecc-summary__row--total"><span>Tổng giá trị:</span><strong>{fmtMoney(totalValue)}</strong></div>
              <div className="ecc-summary__row ecc-summary__row--fee"><span>Phí PreOnic (3%):</span><strong className="ecc-fee">{fmtMoney(commission)}</strong></div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 2: PreOnic xác nhận ── */}
        {step === 2 && (
          <div className="ecc-card ecc-card--center">
            <div className="ecc-verify__icon"><FiShield size={40} /></div>
            <h3 className="ecc-card__title">PreOnic đang xác minh</h3>
            <p className="ecc-verify__desc">Hệ thống đang kiểm tra thông tin hai bên và xác nhận hợp đồng hợp lệ.</p>
            <div className="ecc-verify__list">
              {[
                'Xác minh danh tính người bán',
                'Xác minh danh tính người mua',
                'Kiểm tra giá thị trường',
                'Kiểm tra năng lực cung ứng',
                'PreOnic phê duyệt hợp đồng',
              ].map((item) => (
                <div key={item} className="ecc-verify__item">
                  <FiCheck size={14} /> {item}
                </div>
              ))}
            </div>
            <div className="ecc-verify__badge">
              <FiShield size={16} />
              <div>
                <strong>Hợp đồng được PreOnic bảo vệ</strong>
                <p>Phí dịch vụ 3% -- Bảo hiểm giao dịch -- Hỗ trợ giải quyết tranh chấp</p>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 3: Ký hợp đồng ── */}
        {step === 3 && (
          <div className="ecc-card">
            <h3 className="ecc-card__title">Ký hợp đồng điện tử</h3>

            <div className="ecc-contract-doc">
              <div className="ecc-contract-doc__header">
                <h4>HỢP ĐỒNG BAO TIÊU NÔNG SẢN</h4>
                <p>So: {contractCode}</p>
              </div>
              <div className="ecc-contract-doc__body">
                <p>Hợp đồng bao tiêu <strong>{form.quantity} {form.unit} {form.productName}</strong> với đơn giá <strong>{fmtMoney(parseFloat(form.pricePerUnit) || 0)}/{form.unit}</strong>.</p>
                <p>Tổng giá trị: <strong>{fmtMoney(totalValue)}</strong> | Phí dịch vụ PreOnic: <strong>{fmtMoney(commission)}</strong></p>
                <p>Ngày giao hàng: <strong>{form.deliveryDate}</strong></p>
                <p>Bên bán: {form.farmerName || '--'} | Bên mua: {form.enterpriseName || user?.fullName || '--'}</p>
                <p>Trung gian: <strong>Công ty TNHH PreOnic Việt Nam</strong></p>
              </div>
            </div>

            <div className="ecc-checkboxes">
              <label className="ecc-check-label">
                <input type="checkbox" checked={agreed.terms}
                  onChange={e => setAgreed(p => ({ ...p, terms: e.target.checked }))} />
                <span>Tôi đồng ý với{' '}
                  <button type="button" className="ecc-link-btn"
                    onClick={() => setShowTermsModal('contract')}>điều khoản hợp đồng
                  </button>{' '}và cam kết thực hiện đúng nội dung
                </span>
              </label>
              <label className="ecc-check-label">
                <input type="checkbox" checked={agreed.preon}
                  onChange={e => setAgreed(p => ({ ...p, preon: e.target.checked }))} />
                <span>Tôi đồng ý{' '}
                  <button type="button" className="ecc-link-btn"
                    onClick={() => setShowTermsModal('service')}>phí dịch vụ 3%
                  </button>{' '}cho PreOnic -- đổi lại được bảo vệ giao dịch
                </span>
              </label>
            </div>

            <div className="ecc-signature">
              <p>Chữ ký của bạn</p>
              <div className="ecc-signature__pad">{user?.fullName || 'Ký tên tại đây'}</div>
            </div>

            {errors.submit && (
              <div className="ecc-error-box">
                <FiAlertTriangle size={14} /> {errors.submit}
              </div>
            )}
          </div>
        )}

        {/* ── BƯỚC 4: Hoàn tất ── */}
        {step === 4 && (
          <div className="ecc-card ecc-card--center">
            <div className="ecc-done__icon"><FiCheckCircle size={48} /></div>
            <h3 className="ecc-card__title">Hợp đồng đã được ký thành công!</h3>
            <p>Mã hợp đồng: <strong>{createdContract?.contractCode || contractCode}</strong></p>
            <div className="ecc-done__summary">
              <div><span>Sản phẩm:</span><strong>{form.productName}</strong></div>
              <div><span>Giá trị:</span><strong>{fmtMoney(createdContract?.totalValue || totalValue)}</strong></div>
              <div><span>Phí PreOnic:</span><strong>{fmtMoney(createdContract?.commission || commission)}</strong></div>
              <div><span>Trạng thái:</span><strong className="ecc-status-active">{createdContract?.status || 'active'}</strong></div>
            </div>
            <div className="ecc-done__actions">
              <button className="ecc-btn ecc-btn--primary"
                onClick={() => navigate('/enterprise/contracts')}>Về Dashboard</button>
              <button className="ecc-btn ecc-btn--outline"
                onClick={() => navigate('/messaging')}>Nhắn tin đối tác</button>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {step < 4 && (
          <div className="ecc-nav">
            <button className="ecc-btn ecc-btn--outline" onClick={handleBack} disabled={step === 0}>
              Quay lại
            </button>
            {step < 3 ? (
              <button className="ecc-btn ecc-btn--primary" onClick={handleNext}>
                Tiếp tục <FiArrowRight size={14} />
              </button>
            ) : (
              <button className="ecc-btn ecc-btn--primary"
                onClick={handleSign}
                disabled={!canSign || loading}>
                {loading ? 'Đang xử lý...' : 'Ký hợp đồng'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <TermsModal
          type={showTermsModal}
          onClose={() => setShowTermsModal(null)}
          onAgree={() => {
            if (showTermsModal === 'contract') setAgreed(p => ({ ...p, terms: true }));
            else setAgreed(p => ({ ...p, preon: true }));
            setShowTermsModal(null);
          }}
        />
      )}
    </div>
  );
}