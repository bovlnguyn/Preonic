import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiSend,
  FiTruck,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import orderService from '../../services/order.service';
import './OrderDetail.css';

const STEPS = [
  { key: 'cultivating', label: 'Đang trồng', icon: FiCalendar },
  { key: 'ready_to_ship', label: 'Sẵn sàng giao', icon: FiPackage },
  { key: 'in_transit', label: 'Đang vận chuyển', icon: FiTruck },
  { key: 'delivered', label: 'Đã nhận hàng', icon: FiCheckCircle },
  { key: 'completed', label: 'Hoàn tất hợp đồng', icon: FiCheck },
];

const STAGE_LABEL = Object.fromEntries(STEPS.map((step) => [step.key, step.label]));
const fmtDate = (value, withTime = false) => value
  ? new Date(value).toLocaleString('vi-VN', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' })
  : 'Chưa cập nhật';
const fmtMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

function Progress({ stage }) {
  const current = Math.max(0, STEPS.findIndex((step) => step.key === stage));
  return (
    <div className="order-progress" aria-label={`Tiến độ: ${STAGE_LABEL[stage] || stage}`}>
      <div className="order-progress__line"><span style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }} /></div>
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <div className={`order-progress__step${index <= current ? ' is-done' : ''}${index === current ? ' is-current' : ''}`} key={step.key}>
            <span><Icon /></span>
            <strong>{step.label}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RouteMap({ order, events }) {
  const newest = events[0];
  const rawLatitude = order.currentLatitude ?? newest?.latitude;
  const rawLongitude = order.currentLongitude ?? newest?.longitude;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const hasCoordinates = rawLatitude != null && rawLongitude != null
    && Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.03}%2C${latitude - 0.02}%2C${longitude + 0.03}%2C${latitude + 0.02}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;
  return (
    <section className="order-card order-map-card">
      <div className="order-card__heading">
        <div><span className="order-eyebrow">Theo dõi vận chuyển</span><h2>Bản đồ hành trình</h2></div>
        {order.trackingCode && <span className="order-tracking-code">{order.carrier === 'ghn' ? 'GHN' : 'Mã vận đơn'} · {order.trackingCode}</span>}
      </div>
      {hasCoordinates ? (
        <iframe className="order-route-map order-route-map--live" title="Vị trí đơn hàng trên OpenStreetMap" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="order-route-map">
          <div className="order-route-map__road" />
          <div className="order-route-map__point order-route-map__point--start"><FiMapPin /><span>Nông trại</span></div>
          <div className={`order-route-map__vehicle order-route-map__vehicle--${order.stage}`}><FiTruck /></div>
          <div className="order-route-map__point order-route-map__point--end"><FiMapPin /><span>Điểm nhận</span></div>
        </div>
      )}
      <div className="order-route-addresses">
        <div><span>Điểm đi</span><strong>{order.contract?.farmLocation || 'Nông trại của người bán'}</strong></div>
        <div><span>Vị trí cập nhật gần nhất</span><strong>{order.currentLocation || newest?.location || 'Chưa có vị trí từ đơn vị vận chuyển'}</strong></div>
        <div><span>Điểm đến</span><strong>{order.contract?.deliveryAddress || 'Chưa cập nhật'}</strong></div>
      </div>
      <p className="order-map-note">GHN cung cấp trạng thái và bưu cục gần nhất. Vị trí GPS trực tiếp sẽ hiển thị khi tài khoản đối tác được GHN cấp dữ liệu tọa độ.</p>
    </section>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const isFarmer = user?.role === 'farmer';
  const basePath = isFarmer ? '/farmer/orders' : '/enterprise/orders';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportImages, setReportImages] = useState([]);
  const [requestNote, setRequestNote] = useState('');
  const [handover, setHandover] = useState({ carrier: 'ghn', trackingCode: '', note: '', loadingPhoto: null });

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await orderService.getById(id);
      setData(response?.data || null);
      setError('');
    } catch (requestError) {
      setError(requestError?.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingReport = useMemo(
    () => data?.reports?.find((report) => report.status === 'requested'),
    [data?.reports]
  );

  const act = async (work, success) => {
    setActing(true);
    try {
      await work();
      toast.success(success);
      await load(true);
    } catch (actionError) {
      toast.error(actionError?.message || 'Không thể thực hiện thao tác.');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="order-detail-loading"><div className="spinner-border text-primary" role="status" /></div>;
  if (error || !data?.order) return (
    <div className="order-detail-error"><p>{error || 'Không tìm thấy đơn hàng.'}</p><button onClick={() => navigate(basePath)}><FiArrowLeft /> Quay lại</button></div>
  );

  const { order, reports = [], trackingEvents = [] } = data;
  const contract = order.contract || {};
  const canComplete = order.stage === 'delivered' && Number(contract.remainingAmount || 0) <= 0;

  return (
    <div className={`order-detail order-detail--${isFarmer ? 'farmer' : 'enterprise'}`}>
      <div className="order-detail__topbar">
        <button type="button" onClick={() => navigate(basePath)}><FiArrowLeft /> Danh sách đơn hàng</button>
        <button type="button" onClick={() => load()} disabled={loading}><FiRefreshCw /> Làm mới</button>
      </div>

      <header className="order-hero">
        <div>
          <span className="order-eyebrow">{isFarmer ? 'Vận hành đơn hàng' : 'Theo dõi đơn hàng'}</span>
          <h1>{contract.product?.name || 'Đơn hàng nông sản'}</h1>
          <p>{contract.contractCode} · {contract.quantity} {contract.unit || ''}</p>
        </div>
        <span className={`order-stage order-stage--${order.stage}`}>{STAGE_LABEL[order.stage] || order.stage}</span>
      </header>

      <section className="order-card order-progress-card"><Progress stage={order.stage} /></section>

      <div className="order-detail__grid">
        <section className="order-card">
          <div className="order-card__heading"><div><span className="order-eyebrow">Thông tin đơn hàng</span><h2>Thông tin giao nhận</h2></div></div>
          <div className="order-info-grid">
            <div><span>{isFarmer ? 'Doanh nghiệp' : 'Nông dân'}</span><strong>{isFarmer ? contract.enterprise?.name : contract.farmer?.name}</strong></div>
            <div><span>Số lượng</span><strong>{contract.quantity} {contract.unit}</strong></div>
            <div><span>Hạn giao</span><strong>{fmtDate(contract.deliveryDate)}</strong></div>
            <div><span>Giá trị</span><strong>{fmtMoney(contract.totalValue)}</strong></div>
            <div><span>Đã thanh toán</span><strong>{fmtMoney(contract.paidAmount)}</strong></div>
            <div><span>Còn lại</span><strong>{fmtMoney(contract.remainingAmount)}</strong></div>
          </div>
        </section>

        <section className="order-card order-action-card">
          <div className="order-card__heading"><div><span className="order-eyebrow">Hành động tiếp theo</span><h2>Cập nhật tiến độ</h2></div></div>

          {isFarmer && order.stage === 'cultivating' && (
            <>
              <div className="order-field order-field--inline">
                <label>Chu kỳ ảnh định kỳ</label>
                <select value={order.reportIntervalDays} disabled={acting} onChange={(event) => act(() => orderService.setReportSchedule(id, Number(event.target.value)), 'Đã cập nhật chu kỳ báo cáo.')}>
                  {[3, 5, 7, 10, 14, 21, 30].map((day) => <option key={day} value={day}>{day} ngày/lần</option>)}
                </select>
              </div>
              {pendingReport && <div className="order-request-alert"><FiClock /><div><strong>{pendingReport.title}</strong><span>{pendingReport.requestNote || 'Vui lòng gửi ảnh cập nhật thực tế.'} · Hạn {fmtDate(pendingReport.dueAt)}</span></div></div>}
              <div className="order-field"><label>Ảnh tình trạng thực tế (tối đa 6)</label><label className="order-file"><FiCamera /><span>{reportImages.length ? `Đã chọn ${reportImages.length} ảnh` : 'Chụp hoặc chọn ảnh'}</span><input type="file" accept="image/jpeg,image/png" capture="environment" multiple onChange={(e) => setReportImages(Array.from(e.target.files || []).slice(0, 6))} /></label></div>
              <div className="order-field"><label>Ghi chú canh tác</label><textarea rows="3" value={reportNote} onChange={(e) => setReportNote(e.target.value)} placeholder="Cây đang ở giai đoạn nào, sâu bệnh, dự kiến thu hoạch..." /></div>
              <div className="order-actions-row">
                <button className="order-btn order-btn--secondary" disabled={acting || !reportImages.length} onClick={() => act(async () => { await orderService.submitCropReport(id, { reportId: pendingReport?.id, note: reportNote, images: reportImages }); setReportImages([]); setReportNote(''); }, 'Đã gửi báo cáo canh tác.')}><FiSend /> Gửi báo cáo</button>
                <button className="order-btn order-btn--primary" disabled={acting} onClick={() => act(() => orderService.readyToShip(id), 'Đơn hàng đã sẵn sàng giao.')}><FiPackage /> Sẵn sàng giao</button>
              </div>
            </>
          )}

          {!isFarmer && order.stage === 'cultivating' && (
            <>
              <p className="order-action-copy">Nếu cần kiểm tra ngoài lịch định kỳ, hãy gửi yêu cầu trực tiếp cho nông dân.</p>
              <div className="order-field"><label>Nội dung cần cập nhật</label><textarea rows="3" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="Ví dụ: Chụp tổng thể ruộng và cận cảnh trái..." /></div>
              <button className="order-btn order-btn--primary" disabled={acting || !requestNote.trim()} onClick={() => act(async () => { await orderService.requestCropReport(id, { note: requestNote }); setRequestNote(''); }, 'Đã gửi yêu cầu và thông báo cho nông dân.')}><FiSend /> Yêu cầu báo cáo</button>
            </>
          )}

          {isFarmer && order.stage === 'ready_to_ship' && (
            <>
              <div className="order-field"><label>Đơn vị vận chuyển</label><select value={handover.carrier} onChange={(e) => setHandover({ ...handover, carrier: e.target.value })}><option value="ghn">Giao Hàng Nhanh (GHN)</option><option value="manual">Đơn vị khác / tự vận chuyển</option></select></div>
              <div className="order-field"><label>Mã vận đơn</label><input value={handover.trackingCode} onChange={(e) => setHandover({ ...handover, trackingCode: e.target.value })} placeholder="Nhập mã trên phiếu gửi" /></div>
              <div className="order-field"><label>Ảnh hàng đã lên xe</label><label className="order-file"><FiCamera /><span>{handover.loadingPhoto?.name || 'Chụp ảnh xác nhận'}</span><input type="file" accept="image/jpeg,image/png" capture="environment" onChange={(e) => setHandover({ ...handover, loadingPhoto: e.target.files?.[0] || null })} /></label></div>
              <button className="order-btn order-btn--primary" disabled={acting || !handover.trackingCode.trim() || !handover.loadingPhoto} onClick={() => act(() => orderService.handover(id, handover), 'Đã bàn giao hàng và bắt đầu theo dõi vận chuyển.')}><FiTruck /> Xác nhận hàng đã lên xe</button>
            </>
          )}

          {!isFarmer && order.stage === 'in_transit' && <button className="order-btn order-btn--primary" disabled={acting} onClick={() => act(() => orderService.receive(id), 'Đã xác nhận nhận hàng. Khoản thanh toán theo giao hàng đã được mở.')}><FiCheckCircle /> Xác nhận đã nhận hàng</button>}

          {!isFarmer && (
            <div className="order-complete-box">
              <div><strong>Hoàn tất hợp đồng</strong><span>{order.stage !== 'delivered' && order.stage !== 'completed' ? 'Mở sau khi doanh nghiệp xác nhận đã nhận hàng.' : Number(contract.remainingAmount || 0) > 0 ? `Còn ${fmtMoney(contract.remainingAmount)} cần xác nhận thanh toán.` : 'Đã đủ điều kiện kết thúc hợp đồng.'}</span></div>
              <button className="order-btn order-btn--complete" disabled={acting || !canComplete || order.stage === 'completed'} onClick={() => act(() => orderService.complete(id), 'Hợp đồng đã hoàn tất.')}><FiCheck /> {order.stage === 'completed' ? 'Đã hoàn tất' : 'Hoàn tất hợp đồng'}</button>
            </div>
          )}

          {((isFarmer && ['in_transit', 'delivered', 'completed'].includes(order.stage)) || (!isFarmer && ['ready_to_ship', 'delivered', 'completed'].includes(order.stage))) && <p className="order-action-copy">{order.stage === 'ready_to_ship' ? 'Đang chờ nông dân bàn giao đơn vị vận chuyển.' : order.stage === 'in_transit' ? 'Đang chờ doanh nghiệp kiểm tra và xác nhận nhận hàng.' : order.stage === 'delivered' ? 'Hàng đã được doanh nghiệp xác nhận.' : 'Đơn hàng và hợp đồng đã hoàn tất.'}</p>}
        </section>
      </div>

      <RouteMap order={order} events={trackingEvents} />

      <div className="order-detail__grid order-detail__grid--history">
        <section className="order-card">
          <div className="order-card__heading"><div><span className="order-eyebrow">Minh chứng canh tác</span><h2>Báo cáo thực tế</h2></div><FiCamera /></div>
          {!reports.length ? <p className="order-empty">Chưa có báo cáo canh tác.</p> : <div className="order-report-list">{reports.map((report) => <article key={report.id} className="order-report"><div><strong>{report.title}</strong><span>{report.status === 'submitted' ? `Đã gửi ${fmtDate(report.submittedAt, true)}` : `Chờ phản hồi · hạn ${fmtDate(report.dueAt)}`}</span></div>{report.farmerNote && <p>{report.farmerNote}</p>}{report.imageUrls?.length > 0 && <div className="order-report__images">{report.imageUrls.map((url, index) => <a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt={`Báo cáo ${index + 1}`} loading="lazy" /></a>)}</div>}</article>)}</div>}
        </section>

        <section className="order-card">
          <div className="order-card__heading"><div><span className="order-eyebrow">Dòng thời gian</span><h2>Trạng thái vận chuyển</h2></div><FiTruck /></div>
          {order.loadingPhotoUrl && <a className="order-loading-photo" href={order.loadingPhotoUrl} target="_blank" rel="noreferrer"><img src={order.loadingPhotoUrl} alt="Hàng đã được đưa lên xe" /><span>Ảnh xác nhận hàng lên xe</span></a>}
          {!trackingEvents.length ? <p className="order-empty">Chưa có cập nhật vận chuyển.</p> : <div className="order-timeline">{trackingEvents.map((event) => <div className="order-timeline__item" key={event.id}><span className="order-timeline__dot" /><div><strong>{event.description || event.status}</strong><span>{event.location || 'PreOnic'} · {fmtDate(event.occurredAt, true)}</span></div></div>)}</div>}
        </section>
      </div>
    </div>
  );
}
