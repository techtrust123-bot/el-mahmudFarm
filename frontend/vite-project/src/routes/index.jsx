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
import VerifyOtpPage from '../pages/VerifyOtpPage';
import ForbiddenPage from '../pages/ForbiddenPage';
import ResetOtp from '../pages/ResetOtp';
import SupportPage from '../pages/SupportPage';
import EggInventoryPage from '../pages/EggInventoryPage';
import AdminSubscriptionsPage from '../pages/admin/AdminSubscriptionsPage';
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage';
import AdminSupportPage from '../pages/admin/AdminSupportPage';
import ProfilePage from '../pages/ProfilePage';
import LandingPage from '../pages/LandingPage';
import PublicSupportPage from '../pages/PublicSupportPage';
import LegalPage from '../pages/LegalPage';

/**
 * Routes Configuration
 */
export const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/reset-password" element={<ResetOtp/>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/support/contact" element={<PublicSupportPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy-policy" element={<LegalPage />} />

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
          path="/eggInventory"
          element={
            <ProtectedRoute requiredPermission="eggInventory">
              <EggInventoryPage />
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
            <ProtectedRoute requiredPermission="staff">
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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/manage"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment/verify" element={<PaymentVerifyPage />} />
        <Route path="/sub" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
       
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/vet" element={<VetBookingPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSubscriptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminNotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSupportPage />
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
