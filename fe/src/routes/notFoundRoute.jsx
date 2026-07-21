import React from 'react';

const notFoundRoute = {
  path: '*',
  element: (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">
        <h1 className="display-1 text-muted">404</h1>
        <p className="text-muted">Trang không tồn tại</p>
        <a href="/" className="btn btn-success rounded-3">
          Về trang chủ
        </a>
      </div>
    </div>
  ),
};

export default notFoundRoute;
