import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiUploadCloud } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import { productCategories, provinces, standards } from '../data/farmerMockData';
import { saveStoredProduct } from '../utils';

const initialForm = {
  name: '',
  category: productCategories[0],
  location: provinces[0],
  quantity: '',
  unit: 'tấn',
  price: '',
  standard: standards[0],
  harvestDate: '',
  description: '',
};

function FarmerCreateProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const product = {
      id: `NS-DEMO-${Date.now().toString().slice(-5)}`,
      name: form.name.trim(),
      category: form.category,
      location: form.location,
      quantity: `${form.quantity} ${form.unit}`,
      price: Number(form.price || 0),
      standard: form.standard,
      harvestDate: form.harvestDate,
      progress: 15,
      status: 'Mới đăng bán',
      description: form.description,
    };

    saveStoredProduct(product);
    setSuccess(true);
    setForm(initialForm);

    window.setTimeout(() => {
      navigate('/farmer/crops');
    }, 900);
  };

  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Đăng bán nông sản"
          title="Tạo thông tin nông sản cho doanh nghiệp xem"
          desc="Form hiện lưu vào localStorage để demo frontend. Sau này đổi handleSubmit thành gọi product API."
        />

        {success && (
          <div className="farmer-success-message">
            <FiCheckCircle /> Đã tạo nông sản demo. Đang chuyển về trang Mùa vụ của tôi...
          </div>
        )}

        <form className="farmer-form" onSubmit={handleSubmit}>
          <div className="farmer-form__grid">
            <label>
              <span>Tên nông sản</span>
              <input
                required
                type="text"
                value={form.name}
                placeholder="Ví dụ: Gạo hữu cơ ST25"
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label>
              <span>Nhóm sản phẩm</span>
              <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {productCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              <span>Khu vực canh tác</span>
              <select value={form.location} onChange={(event) => updateField('location', event.target.value)}>
                {provinces.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              <span>Tiêu chuẩn</span>
              <select value={form.standard} onChange={(event) => updateField('standard', event.target.value)}>
                {standards.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              <span>Sản lượng</span>
              <input
                required
                type="number"
                min="0"
                value={form.quantity}
                placeholder="Ví dụ: 12"
                onChange={(event) => updateField('quantity', event.target.value)}
              />
            </label>

            <label>
              <span>Đơn vị</span>
              <select value={form.unit} onChange={(event) => updateField('unit', event.target.value)}>
                <option>tấn</option>
                <option>kg</option>
                <option>thùng</option>
                <option>bao</option>
              </select>
            </label>

            <label>
              <span>Giá chào bán / đơn vị</span>
              <input
                required
                type="number"
                min="0"
                value={form.price}
                placeholder="Ví dụ: 18500000"
                onChange={(event) => updateField('price', event.target.value)}
              />
            </label>

            <label>
              <span>Ngày thu hoạch dự kiến</span>
              <input
                required
                type="date"
                value={form.harvestDate}
                onChange={(event) => updateField('harvestDate', event.target.value)}
              />
            </label>
          </div>

          <label className="farmer-form__full">
            <span>Mô tả nông sản</span>
            <textarea
              rows="5"
              value={form.description}
              placeholder="Mô tả quy trình canh tác, chất lượng, chứng nhận, điều kiện bảo quản..."
              onChange={(event) => updateField('description', event.target.value)}
            />
          </label>

          <div className="farmer-upload-box">
            <FiUploadCloud />
            <div>
              <strong>Ảnh sản phẩm / chứng nhận</strong>
              <p>UI demo cho bước upload. Chưa upload file thật khi backend chưa có endpoint.</p>
            </div>
          </div>

          <div className="farmer-form__actions">
            <button className="farmer-button" type="button" onClick={() => navigate('/farmer/crops')}>Hủy</button>
            <button className="farmer-button farmer-button--primary" type="submit">Lưu nông sản</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default FarmerCreateProduct;
