import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BusinessesPage from './pages/BusinessesPage';
import BusinessDetailPage from './pages/BusinessDetailPage';
import AddBusinessPage from './pages/AddBusinessPage';
import BillingPage from './pages/BillingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

const PrivateRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  return admin ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  return !admin ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="businesses" element={<BusinessesPage />} />
              <Route path="businesses/add" element={<AddBusinessPage />} />
              <Route path="businesses/:id" element={<BusinessDetailPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#0f1712', color: '#e2ede5', border: '1px solid #1e2d22' },
            success: { iconTheme: { primary: '#25d366', secondary: '#000' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
