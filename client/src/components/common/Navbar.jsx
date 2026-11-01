import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Briefcase, 
  Compass, 
  Calendar, 
  Bell, 
  Search, 
  MapPin,
  CheckCircle2,
  Clock,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import { getCityDisplayName } from '../../data/cities';

/**
 * Role-Aware Navigation Bar
 * 
 * Provides distinct navigational experiences based on authentication role:
 * 1. Public Visitors: Landing page, browse services, about, contact, login/register.
 * 2. Customers: Home, Explore Services, Find Providers, My Bookings, Messages, Notifications, Profile.
 * 3. Providers: Dashboard, My Services, Explore Services, Requests, Bookings, Messages, Notifications, Business Profile.
 * 4. Administrators: Admin Portal, System Management.
 * 
 * Clicking the brand logo or "Home" opens the user's role-specific dashboard.
 */
export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
    navigate('/login');
  };

  // Determine brand home target based on authenticated role
  const brandHomeLink = !isAuthenticated || !user
    ? '/'
    : user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'provider'
        ? '/provider/dashboard'
        : '/';

  const customerCityDisplay = user?.city ? getCityDisplayName(user.city) : 'Sangli';
  const isProviderAvailable = user?.providerDetails?.isAvailable !== false;

  return (
    <>
      <header className="navbar">
        <div className="container navbar-container">
          {/* Brand Logo - Links to role dashboard when logged in */}
          <Link to={brandHomeLink} className="brand-logo" onClick={closeMobileMenu} id="brand-logo-link">
            <div className="brand-logo-icon">
              <img src="/logo.png" alt="ServeEase Logo" />
            </div>
            <span>Serve<span className="brand-name-highlight">Ease</span></span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation">
            {/* 1. PUBLIC VISITOR NAVIGATION */}
            {(!isAuthenticated || !user) && (
              <ul className="nav-links">
                <li>
                  <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Discover Services
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    How It Works
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Contact
                  </NavLink>
                </li>
              </ul>
            )}

            {/* 2. CUSTOMER NAVIGATION */}
            {isAuthenticated && user?.role === 'customer' && (
              <ul className="nav-links">
                <li>
                  <NavLink to="/customer/dashboard" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Discover Services
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/customer/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    My Bookings
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/customer/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Notifications
                  </NavLink>
                </li>
              </ul>
            )}

            {/* 3. PROVIDER NAVIGATION */}
            {isAuthenticated && user?.role === 'provider' && (
              <ul className="nav-links">
                <li>
                  <NavLink to="/provider/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    My Services
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Booking Requests
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    My Bookings
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Notifications
                  </NavLink>
                </li>
              </ul>
            )}

            {/* 4. ADMINISTRATOR NAVIGATION */}
            {isAuthenticated && user?.role === 'admin' && (
              <ul className="nav-links">
                <li>
                  <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Shield size={15} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} />
                    Admin Portal
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Services Directory
                  </NavLink>
                </li>
              </ul>
            )}
          </nav>

          {/* Desktop Right Actions */}
          <div className="nav-actions">
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Customer Location Indicator */}
                {user.role === 'customer' && (
                  <Link 
                    to="/customer/profile" 
                    className="city-indicator-pill" 
                    title="Your active service city. Click to edit in profile."
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-50)',
                      color: 'var(--primary-700)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid var(--primary-100)'
                    }}
                  >
                    <MapPin size={13} style={{ color: 'var(--primary-600)' }} />
                    <span>{customerCityDisplay}</span>
                  </Link>
                )}

                {/* Provider Availability Badge */}
                {user.role === 'provider' && (
                  <Link
                    to="/provider/dashboard"
                    className="provider-avail-pill"
                    title="Live technician working status"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isProviderAvailable ? 'var(--color-success-bg)' : 'var(--color-bg-subtle)',
                      color: isProviderAvailable ? 'var(--color-success)' : 'var(--color-text-muted)',
                      fontSize: 'var(--font-size-xs, 0.8rem)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: isProviderAvailable ? 'var(--color-success)' : 'var(--color-text-subtle)'
                    }} />
                    <span>{isProviderAvailable ? 'Taking Jobs' : 'Unavailable'}</span>
                  </Link>
                )}

                {/* Role Profile Shortcut */}
                {user.role === 'customer' && (
                  <Button to="/customer/profile" variant="outline" size="sm">
                    <User size={15} />
                    My Profile
                  </Button>
                )}

                {user.role === 'provider' && (
                  <Button to="/provider/profile" variant="outline" size="sm">
                    <Briefcase size={15} />
                    Business Profile
                  </Button>
                )}

                {user.role === 'admin' && (
                  <Button to="/admin/profile" variant="outline" size="sm">
                    <Shield size={15} />
                    Admin Profile
                  </Button>
                )}

                <button
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                  title="Sign Out"
                  id="nav-logout-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem' }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>

                <ThemeToggle id="navbar-theme-toggle-auth" size="sm" />
              </div>
            ) : (
              <>
                <ThemeToggle id="navbar-theme-toggle-guest" size="sm" />
                <Button to="/login" variant="outline" size="sm" id="nav-login-btn">
                  <User size={15} />
                  Login
                </Button>
                <Button to="/register" variant="primary" size="sm" id="nav-register-btn">
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="mobile-nav-links">
            {(!isAuthenticated || !user) && (
              <>
                <li>
                  <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Discover Services
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    How It Works
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Contact
                  </NavLink>
                </li>
              </>
            )}

            {isAuthenticated && user?.role === 'customer' && (
              <>
                <li>
                  <NavLink to="/customer/dashboard" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Discover Services
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/customer/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    My Bookings
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/customer/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Notifications
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/customer/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    My Profile
                  </NavLink>
                </li>
              </>
            )}

            {isAuthenticated && user?.role === 'provider' && (
              <>
                <li>
                  <NavLink to="/provider/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    My Services
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Booking Requests
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    My Bookings
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Notifications
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/provider/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Business Profile
                  </NavLink>
                </li>
              </>
            )}

            {isAuthenticated && user?.role === 'admin' && (
              <>
                <li>
                  <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Admin Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Services Directory
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Admin Profile
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <div className="mobile-nav-actions">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-title)' }}>Theme</span>
              <ThemeToggle id="navbar-theme-toggle-mobile" size="sm" />
            </div>

            {isAuthenticated && user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg-page)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Signed in as </span>
                  <strong>{user.name}</strong> ({user.role})
                </div>
                <Button variant="outline" size="sm" block onClick={handleLogout}>
                  <LogOut size={16} /> Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button to="/login" variant="outline" size="sm" block onClick={closeMobileMenu}>
                  <User size={16} /> Login
                </Button>
                <Button to="/register" variant="primary" size="sm" block onClick={closeMobileMenu}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
