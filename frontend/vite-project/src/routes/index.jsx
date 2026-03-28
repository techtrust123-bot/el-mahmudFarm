import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

// Auth Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

// Dashboard Pages
import FarmerDashboardPage from '../pages/dashboard/FarmerDashboard';
import AdminDashboardPage from '../pages/admin/AdminDashboard';

// helper component to pick correct dashboard based on role
const DashboardWrapper = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboardPage /> : <FarmerDashboardPage />;
};

// Management Pages
import InventoryPage from '../pages/management/InventoryPage';

// Marketplace & Vet
import MarketplacePage from '../pages/marketplace/MarketplacePage';
import VetBookingPage from '../pages/vet/VetBookingPage';
import ExpensePage from '../pages/ExpensePage';

// Subscription
import SubscriptionPage from '../pages/subscription/SubscriptionPage';
import PoultryPage from '../pages/PoultryPage';
import LivestockPage from '../pages/LivestockPage';
import FeedPage from '../pages/FeedPage';
import SalesPage from '../pages/SalesPage';
import StaffPage from '../pages/StaffPage';
import SettingsPage from '../pages/SettingsPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
/**
 * Routes Configuration
 */
export const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
            <ProtectedRoute>
                <LivestockPage/>
              {/* <div>Livestock Management (Coming Soon)</div> */}
            </ProtectedRoute>
          }
        />

        <Route
          path="/poultry"
          element={
            <ProtectedRoute>
                <PoultryPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage/>
            </ProtectedRoute>
          }
        />      
            {/* </ProtectedRoute>
          }
        /> */}

        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <SalesPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ExpensePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
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
          <Route path="/admin" element={
              <AdminDashboardPage />
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
