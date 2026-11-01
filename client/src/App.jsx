import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Global Authentication & Theme Providers & Route Guards
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Layout & Global Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';

// Public & Shared Page Views
import Home from './pages/Home';
import Services from './pages/Services';
import FindProviders from './pages/FindProviders';
import ProviderDetail from './pages/ProviderDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtp from './pages/VerifyOtp';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import About from './pages/About';
import Contact from './pages/Contact';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFound from './pages/NotFound';

// Customer Role Views
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerBookings from './pages/CustomerBookings';
import CustomerMessages from './pages/CustomerMessages';
import CustomerNotifications from './pages/CustomerNotifications';
import CustomerProfile from './pages/CustomerProfile';
import CustomerMap from './pages/CustomerMap';

// Provider Role Views
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderMyServices from './pages/ProviderMyServices';
import ProviderExploreServices from './pages/ProviderExploreServices';
import ProviderRequests from './pages/ProviderRequests';
import ProviderBookings from './pages/ProviderBookings';
import ProviderMessages from './pages/ProviderMessages';
import ProviderNotifications from './pages/ProviderNotifications';
import ProviderProfile from './pages/ProviderProfile';
import ProviderMap from './pages/ProviderMap';

// Administrator Role View
import AdminDashboard from './pages/AdminDashboard';
import AdminProfile from './pages/AdminProfile';

/**
 * Smart Profile Router: redirects generic /profile to role-appropriate profile view
 */
function ProfileRedirect() {
  const { user } = useAuth();
  if (user?.role === 'provider') {
    return <Navigate to="/provider/profile" replace />;
  }
  if (user?.role === 'admin') {
    return <Navigate to="/admin/profile" replace />;
  }
  return <Navigate to="/customer/profile" replace />;
}

/**
 * Core Application Shell
 * 
 * Provides role-aware layout management:
 * - Public routes: horizontal Navbar + Page content + Footer
 * - Authenticated dashboards: SaaS vertical DashboardLayout with full viewport height
 */
function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Determine whether current view is rendered within the vertical DashboardLayout
  const isDashboardRoute =
    location.pathname.startsWith('/customer/') ||
    location.pathname.startsWith('/provider/') ||
    location.pathname.startsWith('/admin') ||
    (isAuthenticated && user && location.pathname === '/services');

  return (
    <div className="site-wrapper">
      {!isDashboardRoute && <Navbar />}

      <main className={isDashboardRoute ? 'dashboard-shell-host' : 'main-content'} id="main-content-region">
        <Routes>
          {/* ========================================================
              1. PUBLIC & SHARED DISCOVERY ROUTES
              ======================================================== */}
          {/* Smart Home: Visitor Landing for guests, redirects to dashboard for authenticated customers, providers, admins */}
          <Route path="/" element={<Home />} />
          {/* Unified Discover Services Route */}
          <Route path="/services" element={<Services />} />
          {/* Legacy /providers safely redirects to unified Discover Services page */}
          <Route path="/providers" element={<Navigate to="/services" replace />} />
          <Route path="/provider/:id" element={<ProviderDetail />} />
          <Route path="/providers/:id" element={<ProviderDetail />} />

          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email-otp" element={<Navigate to="/verify-email" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Generic Profile Redirect */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['customer', 'provider']}>
                <ProfileRedirect />
              </ProtectedRoute>
            }
          />

          {/* ========================================================
              2. CUSTOMER-ONLY PROTECTED ROUTES
              ======================================================== */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/bookings"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/messages"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/notifications"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/map"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerMap />
              </ProtectedRoute>
            }
          />

          {/* ========================================================
              3. PROVIDER-ONLY PROTECTED ROUTES
              ======================================================== */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/services"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderMyServices />
              </ProtectedRoute>
            }
          />
          {/* Legacy Provider Explore Services safely redirects to dashboard */}
          <Route
            path="/provider/explore"
            element={<Navigate to="/provider/dashboard" replace />}
          />
          <Route
            path="/provider/requests"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/bookings"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/messages"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/notifications"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/profile"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/map"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderMap />
              </ProtectedRoute>
            }
          />

          {/* ========================================================
              4. ADMINISTRATOR-ONLY PROTECTED ROUTES
              ======================================================== */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProfile />
              </ProtectedRoute>
            }
          />

          {/* Informational & Legal Pages */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />

          {/* Primary Navigation Aliases: Explore Services */}
          <Route path="/explore" element={<Navigate to="/services" replace />} />
          <Route path="/explore-services" element={<Navigate to="/services" replace />} />
          <Route path="/customer/services" element={<Navigate to="/services" replace />} />
          <Route path="/customer/explore" element={<Navigate to="/services" replace />} />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isDashboardRoute && <Footer />}
    </div>
  );
}

/**
 * Main Application Component
 */
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ScrollToTop />
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
