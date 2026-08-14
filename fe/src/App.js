import React, { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { MessagingWidgetProvider } from './contexts/MessagingWidgetContext';
import ServiceStatusBanner from './component/Common/ServiceStatusBanner/ServiceStatusBanner';
import AppErrorBoundary from './component/Common/AppErrorBoundary/AppErrorBoundary';
import AppRoutes from './routes';

// Chat không cần nằm trong critical path của lần render đầu tiên. Tách chunk riêng
// giúp public/login/dashboard shell hiển thị trước, widget được tải ngay sau đó.
const FloatingChatWidget = lazy(() => import('./component/Messaging/FloatingChatWidget'));

const App = () => (
  <AppErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <MessagingWidgetProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Suspense fallback={null}>
            <FloatingChatWidget />
          </Suspense>
          <ServiceStatusBanner />
        </MessagingWidgetProvider>
      </ToastProvider>
    </AuthProvider>
  </AppErrorBoundary>
);

export default App;
