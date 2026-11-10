import { useEffect, useMemo, useState } from 'react';
import { FiArrowUpRight, FiCalendar, FiImage, FiMapPin, FiPlus, FiX } from 'react-icons/fi';
import advertisementService from '../../../services/advertisement.service';
import { resolveImageUrl } from '../../../services/product.service';
import { useAuth } from '../../../contexts/AuthContext';
import SectionHeader from '../components/SectionHeader';
import './FarmerAdvertisements.css';

const money = new Intl.NumberFormat('vi-VN');
const emptyForm = { title: '', content: '', durationDays: 7, targetUrl: '' };

function FarmerAdvertisements() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState({ dailyRate: 49000, minimumDays: 1, maximumDays: 90 });
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [banner, setBanner] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    const [priceResult, campaignResult] = await Promise.allSettled([
      advertisementService.getPricing(),
      advertisementService.getMine(),
    ]);

    if (priceResult.status === 'fulfilled') {
      setPricing(priceResult.value.data);
    }

    if (campaignResult.status === 'fulfilled') {
      setCampaigns(campaignResult.value.data || []);
      setMessage((current) => current.type === 'error' ? { type: '', text: '' } : current);
    } else {
      const error = campaignResult.reason;
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Không thể tải lịch sử quảng cáo. Vui lòng thử lại sau.',
      });
    }

    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const total = useMemo(() => Number(form.durationDays || 0) * Number(pricing.dailyRate || 0), [form.durationDays, pricing.dailyRate]);

  const selectBanner = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Banner chỉ chấp nhận ảnh JPG hoặc PNG.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Banner không được vượt quá 5MB.' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setBanner(file);
    setPreview(URL.createObjectURL(file));
    setMessage({ type: '', text: '' });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!banner) return setMessage({ type: 'error', text: 'Vui lòng tải ảnh banner trước khi tạo chiến dịch.' });
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append('banner', banner);
      const result = await advertisementService.create(payload);
      setMessage({ type: 'success', text: result.message || 'Chiến dịch đã bắt đầu chạy.' });
      setForm(emptyForm);
      setBanner(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview('');
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Không thể tạo chiến dịch.' });
    } finally { setSubmitting(false); }
  };

  const cancelCampaign = async (id) => {
    try {
      await advertisementService.cancel(id);
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Không thể dừng chiến dịch.' });
    }
  };

  return (
    <div className="farmer-ads">
      <SectionHeader breadcrumb="Quảng bá nông sản" icon={FiArrowUpRight} title="Banner quảng cáo" desc="Đưa nông sản của bạn lên khu vực nổi bật trên trang chủ Farmora." />

      <div className="farmer-ads__summary">
        <div><span>Đơn giá hiện tại</span><strong>{money.format(pricing.dailyRate)}đ/ngày</strong><small>Ghi vào kỳ phí nền tảng tháng</small></div>
        <div><span>Khu vực ưu tiên</span><strong><FiMapPin /> {user?.province || 'Theo hồ sơ Farmer'}</strong><small>Hiển thị trước với khách cùng vùng</small></div>
        <div><span>Đang hoạt động</span><strong>{campaigns.filter((item) => item.displayStatus === 'active').length} chiến dịch</strong><small>Tự dừng khi hết thời gian</small></div>
      </div>

      {message.text && <div className={`farmer-ads__message farmer-ads__message--${message.type}`}>{message.text}</div>}

      <div className="farmer-ads__grid">
        <form className="farmer-ads__form" onSubmit={submit}>
          <div className="farmer-ads__form-head"><div><span>TẠO CHIẾN DỊCH</span><h2>Quảng bá mùa vụ của bạn</h2></div><FiPlus /></div>

          <label className={`farmer-ads__upload ${preview ? 'has-image' : ''}`}>
            {preview ? <img src={preview} alt="Xem trước banner" /> : <div><FiImage /><strong>Tải ảnh banner ngang</strong><span>Khuyến nghị 1600 × 700px · JPG/PNG · tối đa 5MB</span></div>}
            <input type="file" accept="image/jpeg,image/png" onChange={(e) => selectBanner(e.target.files?.[0])} />
            {preview && <span className="farmer-ads__replace">Đổi ảnh</span>}
          </label>

          <div className="farmer-ads__fields">
            <label>Tên quảng cáo<input required maxLength="140" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Xoài cát Hòa Lộc vào vụ" /></label>
            <label>Nội dung<textarea required maxLength="800" rows="4" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Điểm nổi bật, sản lượng, tiêu chuẩn và thời gian thu hoạch..." /></label>
            <div className="farmer-ads__field-row">
              <label>Số ngày chạy<input required type="number" min={pricing.minimumDays} max={pricing.maximumDays} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></label>
              <label>Liên kết sản phẩm<input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} placeholder="/products/uuid (tùy chọn)" /></label>
            </div>
          </div>

          <div className="farmer-ads__checkout">
            <div><span>{form.durationDays || 0} ngày × {money.format(pricing.dailyRate)}đ</span><strong>{money.format(total)}đ</strong></div>
            <p>Chi phí được ghi nhận vào mục <b>Thanh toán & Phí</b>. Chiến dịch bắt đầu ngay sau khi xác nhận.</p>
            <button type="submit" disabled={submitting}>{submitting ? 'Đang tạo chiến dịch...' : <>Xác nhận & bắt đầu quảng cáo <FiArrowUpRight /></>}</button>
          </div>
        </form>

        <section className="farmer-ads__campaigns">
          <div className="farmer-ads__campaigns-head"><div><span>CHIẾN DỊCH CỦA TÔI</span><h2>Lịch sử quảng bá</h2></div><small>{campaigns.length} chiến dịch</small></div>
          {loading ? <div className="farmer-ads__loading">Đang tải chiến dịch...</div> : campaigns.length === 0 ? <div className="farmer-ads__empty"><FiImage /><strong>Chưa có banner nào</strong><p>Chiến dịch đầu tiên sẽ xuất hiện tại đây.</p></div> : campaigns.map((campaign) => (
            <article className="farmer-ad-card" key={campaign.id}>
              <img src={resolveImageUrl(campaign.bannerUrl)} alt={campaign.title} />
              <div className="farmer-ad-card__body">
                <div className="farmer-ad-card__top"><span className={`status status--${campaign.displayStatus}`}>{campaign.displayStatus === 'active' ? 'Đang chạy' : campaign.displayStatus === 'expired' ? 'Đã kết thúc' : 'Đã dừng'}</span><strong>{money.format(campaign.totalAmount)}đ</strong></div>
                <h3>{campaign.title}</h3>
                <p><FiCalendar /> {new Date(campaign.startsAt).toLocaleDateString('vi-VN')} – {new Date(campaign.endsAt).toLocaleDateString('vi-VN')}</p>
                <div className="farmer-ad-card__metrics"><span><b>{campaign.impressionCount || 0}</b> lượt hiển thị</span><span><b>{campaign.clickCount || 0}</b> lượt nhấp</span></div>
                {campaign.displayStatus === 'active' && <button type="button" onClick={() => cancelCampaign(campaign.id)}><FiX /> Dừng chiến dịch</button>}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default FarmerAdvertisements;
