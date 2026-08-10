import React from 'react';
import './AppErrorBoundary.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Giữ log ở console để dev có thể chẩn đoán, nhưng không lộ stack trace trên UI.
    // eslint-disable-next-line no-console
    console.error('PreOnic UI error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-boundary" role="alert">
        <div className="app-error-boundary__card">
          <span className="app-error-boundary__badge">PREONIC</span>
          <h1>Giao diện đang gặp sự cố tạm thời</h1>
          <p>
            Dữ liệu của bạn không bị xóa. Hãy tải lại trang hoặc quay về trang chủ để tiếp tục.
          </p>
          <div className="app-error-boundary__actions">
            <button type="button" onClick={this.handleRetry}>Thử lại</button>
            <button type="button" className="is-secondary" onClick={() => window.location.assign('/')}>Về trang chủ</button>
          </div>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
