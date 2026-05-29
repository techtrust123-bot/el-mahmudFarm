import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Auth Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

// Dashboard Pages
import FarmerDashboardPage from '../pages/dashboard/FarmerDashboard';
import AdminDashboardPage from '../pages/admin/AdminDashboard';

// helper component to pick correct dashboard based on role
const DashboardWrapper = () => {
  const { userData } = useContext(AuthContext);
  return userData?.role?.toLowerCase() === 'admin' ? <AdminDashboardPage /> : <FarmerDashboardPage />;
};

// Management Pages
import InventoryPage from '../pages/management/InventoryPage';

// Marketplace & Vet
import MarketplacePage from '../pages/marketplace/MarketplacePage';
import VetBookingPage from '../pages/vet/VetBookingPage';
import ExpensePage from '../pages/ExpensePage';

// Subscription
import SubscriptionPage from '../pages/subscription/SubscriptionPage';
import PaymentPage from '../pages/PaymentPage';
import PaymentVerifyPage from '../pages/PaymentVerifyPage';
import PoultryPage from '../pages/PoultryPage';
import LivestockPage from '../pages/LivestockPage';
import FeedPage from '../pages/FeedPage';
import SalesPage from '../pages/SalesPage';
import StaffPage from '../pages/StaffPage';
import SettingsPage from '../pages/SettingsPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ForbiddenPage from '../pages/ForbiddenPage';
import ResetOtp from '../pages/ResetOtp';
/**
 * Routes Configuration
 */
export const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetOtp/>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardWrapper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/livestock"
          element={
            <ProtectedRoute requiredPermission="livestock">
                <LivestockPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/poultry"
          element={
            <ProtectedRoute requiredPermission="poultry">
                <PoultryPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/feed"
          element={
            <ProtectedRoute requiredPermission="feed">
              <FeedPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute requiredPermission="sales">
              <SalesPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute requiredPermission="expenses">
              <ExpensePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute requiredRole="manager">
              <StaffPage />
            </ProtectedRoute>
          }
        />

         <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment/verify" element={<PaymentVerifyPage />} />
          <Route path="/sub" element={
              <SubscriptionPage />
          } />
          <Route path="/marketplace" element={
              <MarketplacePage />
          } />
          <Route path="/inventory" element={
              <InventoryPage />
          } />

          <Route path="/vet" element={
              <VetBookingPage />
          } />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
