import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%)' }}
    >
      <div className="text-center">

        {/* Brand */}
        <div style={{ fontSize: 64 }}>🌾</div>
        <h1 className="fw-bold mt-3 mb-2">PreOnic</h1>
        <p className="text-muted mb-5">
          Nền tảng kết nối Nông dân & Doanh nghiệp bao tiêu nông sản
        </p>

        {/* Buttons */}
        <div className="d-flex gap-3 justify-content-center">
          <Link to="/register" className="btn btn-success btn-lg px-5 rounded-3 fw-semibold">
            Đăng ký
          </Link>
          <Link to="/auth" className="btn btn-outline-success btn-lg px-5 rounded-3 fw-semibold">
            Đăng nhập
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Home;