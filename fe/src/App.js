import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { MessagingWidgetProvider } from './contexts/MessagingWidgetContext';
import FloatingChatWidget from './component/Messaging/FloatingChatWidget';
import ServiceStatusBanner from './component/Common/ServiceStatusBanner/ServiceStatusBanner';
import AppErrorBoundary from './component/Common/AppErrorBoundary/AppErrorBoundary';
import AppRoutes from './routes';

const App = () => (
  <AppErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <MessagingWidgetProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <FloatingChatWidget />
          <ServiceStatusBanner />
        </MessagingWidgetProvider>
      </ToastProvider>
    </AuthProvider>
  </AppErrorBoundary>
);

export default App;
