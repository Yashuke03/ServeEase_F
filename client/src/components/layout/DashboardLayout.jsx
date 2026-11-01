import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Wrench, 
  LayoutDashboard, 
  Compass, 
  Calendar, 
  Bell, 
  User, 
  Briefcase, 
  Inbox, 
  Power, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  MapPin, 
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCityDisplayName } from '../../data/cities';
import { providerApi, notificationApi, getAvatarUrl } from '../../services/api';
import { connectSocket } from '../../services/socket';
import ThemeToggle from '../common/ThemeToggle';

/**
 * Professional SaaS Vertical Dashboard Layout
 * 
 * Provides a unified, role-specific vertical application shell for authenticated users:
 * 1. Compact left sidebar with role-aware links and active state indicator
 * 2. Top dashboard header with page title, notifications, and profile dropdown
 * 3. Mobile slide-out navigation drawer
 * 4. Main content region with appropriate spacing
 */
export default function DashboardLayout({ children, title, subtitle }) {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(user?.providerDetails?.isAvailable !== false);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep local availability synchronized when user object changes
  useEffect(() => {
    if (user?.providerDetails?.isAvailable !== undefined) {
      setIsAvailable(user.providerDetails.isAvailable !== false);
    }
  }, [user?.providerDetails?.isAvailable]);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const socket = connectSocket();
    const handleAvailabilityChanged = (payload) => {
      const currentId = (user?._id || user?.id)?.toString();
      if (payload?.providerId && payload.providerId === currentId) {
        setIsAvailable(payload.isAvailable !== false);
      }
    };

    socket.on('provider_availability_changed', handleAvailabilityChanged);
    return () => {
      socket.off('provider_availability_changed', handleAvailabilityChanged);
    };
  }, [user?._id, user?.id]);

  // Poll and refresh unread notifications count
  useEffect(() => {
    let isSubscribed = true;
    const fetchUnread = async () => {
      if (!user) return;
      try {
        const res = await notificationApi.getUnreadCount();
        if (isSubscribed && res.success) {
          setUnreadCount(res.unreadCount || 0);
        }
      } catch (err) {
        // Silent background polling
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    window.addEventListener('focus', fetchUnread);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', fetchUnread);
    };
  }, [user, location.pathname]);

  const dropdownRef = useRef(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener for profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Provider quick availability toggle from topbar
  const toggleProviderAvailability = async () => {
    if (user?.role !== 'provider' || isTogglingAvail) return;
    const nextState = !isAvailable;
    setIsTogglingAvail(true);
    try {
      const updatedUser = await updateProfile({
        providerDetails: { isAvailable: nextState }
      });
      setIsAvailable(updatedUser?.providerDetails?.isAvailable !== false);
    } catch (err) {
      console.warn('Could not toggle availability from topbar:', err.message);
      setIsAvailable(user?.providerDetails?.isAvailable !== false);
    } finally {
      setIsTogglingAvail(false);
    }
  };

  // Determine user initials
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const avatarUrl = getAvatarUrl(user?.avatar || user?.providerDetails?.avatar);

  const userCityDisplay = user?.city ? getCityDisplayName(user.city) : 'Sangli';

  // Navigation Items by Role
  const servicesQuery = user?.city ? `?city=${user.city}` : '';

  const customerNavItems = [
    { label: 'Dashboard', path: '/customer/dashboard', icon: <LayoutDashboard size={18} className="nav-icon" />, end: true },
    { label: 'Discover Services', path: `/services${servicesQuery}`, icon: <Compass size={18} className="nav-icon" /> },
    { label: 'My Bookings', path: '/customer/bookings', icon: <Calendar size={18} className="nav-icon" /> },
    { label: 'Notifications', path: '/customer/notifications', icon: <Bell size={18} className="nav-icon" /> },
    { label: 'My Profile', path: '/customer/profile', icon: <User size={18} className="nav-icon" /> }
  ];

  const providerNavItems = [
    { label: 'Dashboard', path: '/provider/dashboard', icon: <LayoutDashboard size={18} className="nav-icon" />, end: true },
    { label: 'My Services', path: '/provider/services', icon: <Wrench size={18} className="nav-icon" /> },
    { label: 'Explore Directory', path: `/services${servicesQuery}`, icon: <Compass size={18} className="nav-icon" /> },
    { label: 'Booking Requests', path: '/provider/requests', icon: <Inbox size={18} className="nav-icon" /> },
    { label: 'My Bookings', path: '/provider/bookings', icon: <Calendar size={18} className="nav-icon" /> },
    { label: 'Notifications', path: '/provider/notifications', icon: <Bell size={18} className="nav-icon" /> },
    {
      label: 'Availability',
      isAvailabilityButton: true,
      icon: <Power size={18} className="nav-icon" style={{ color: isAvailable ? '#16a34a' : '#94a3b8' }} />
    },
    { label: 'My Business Profile', path: '/provider/profile', icon: <Briefcase size={18} className="nav-icon" /> }
  ];

  const adminNavItems = [
    { label: 'Admin Portal', path: '/admin/dashboard', icon: <Shield size={18} className="nav-icon" />, end: true },
    { label: 'Services Directory', path: '/services', icon: <Compass size={18} className="nav-icon" /> },
    { label: 'Admin Profile', path: '/admin/profile', icon: <User size={18} className="nav-icon" /> }
  ];

  const navItems = 
    user?.role === 'provider' 
      ? providerNavItems 
      : user?.role === 'admin' 
        ? adminNavItems 
        : customerNavItems;

  const brandHomeLink = 
    user?.role === 'provider' 
      ? '/provider/dashboard' 
      : user?.role === 'admin' 
        ? '/admin/dashboard' 
        : '/customer/dashboard';

  const notificationPath = 
    user?.role === 'provider' 
      ? '/provider/notifications' 
      : '/customer/notifications';

  const profilePath = 
    user?.role === 'provider' 
      ? '/provider/profile' 
      : user?.role === 'admin'
        ? '/admin/profile'
        : '/customer/profile';

  return (
    <div className="dashboard-shell">
      {/* Mobile Drawer Overlay */}
      <div 
        className={`dashboard-sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* =====================================================================
          1. STICKY VERTICAL SIDEBAR
          ===================================================================== */}
      <aside className={`dashboard-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Dashboard Sidebar">
        {/* Brand Header */}
        <div className="dashboard-sidebar-header">
          <Link to={brandHomeLink} className="brand-logo" style={{ textDecoration: 'none' }}>
            <div className="brand-logo-icon">
              <img src="/logo.png" alt="ServeEase Logo" />
            </div>
            <span>Serve<span className="brand-name-highlight">Ease</span></span>
          </Link>

          {/* Close button for mobile */}
          <button 
            className="dashboard-mobile-toggle" 
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            style={{ display: mobileOpen ? 'inline-flex' : 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Role Badge Subheader */}
        <div style={{ padding: '0.75rem 1.25rem 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 'var(--font-size-xs, 0.78rem)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-muted)'
          }}>
            {user?.role === 'provider' ? 'Provider Workspace' : user?.role === 'admin' ? 'Admin Workspace' : 'Customer Workspace'}
          </span>
          <span className={`badge ${user?.role === 'provider' ? 'badge-warning' : user?.role === 'admin' ? 'badge-prototype' : 'badge-primary'}`} style={{
            fontSize: 'var(--font-size-xs, 0.76rem)',
            padding: '0.15rem 0.5rem',
            textTransform: 'capitalize'
          }}>
            {user?.role}
          </span>
        </div>

        {/* Navigation Links List */}
        <nav className="dashboard-sidebar-nav" aria-label="Role Navigation">
          {navItems.map((item) => {
            if (item.isAvailabilityButton) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={toggleProviderAvailability}
                  disabled={isTogglingAvail}
                  className="dashboard-nav-item"
                  style={{
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  title="Toggle Working Availability"
                >
                  {item.icon}
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>{item.label}</span>
                    <span className={`badge ${isAvailable ? 'badge-completed' : 'badge-rejected'}`} style={{
                      fontSize: 'var(--font-size-xs, 0.76rem)',
                      padding: '0.15rem 0.5rem'
                    }}>
                      {isAvailable ? 'Taking Jobs' : 'Offline'}
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `dashboard-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="dashboard-sidebar-footer">
          <div className="dashboard-sidebar-user">
            <div className="dashboard-avatar" style={{ overflow: 'hidden' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="dashboard-user-info">
              <span className="dashboard-user-name" title={user?.name}>{user?.name || 'User'}</span>
              <span className="dashboard-user-role">{user?.email || user?.role}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ padding: '0.4rem', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* =====================================================================
          2. MAIN CONTENT AREA
          ===================================================================== */}
      <div className="dashboard-main-area">
        {/* Top Dashboard Header */}
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              className="dashboard-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            <div className="dashboard-title-box">
              <h1 className="dashboard-page-title">{title || 'ServeEase Dashboard'}</h1>
              {subtitle && <p className="dashboard-page-subtitle">{subtitle}</p>}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="dashboard-topbar-actions">
            {/* Customer Active City Chip */}
            {user?.role === 'customer' && (
              <Link 
                to="/customer/profile"
                className="city-indicator-pill" 
                title="Your active service city. Click to edit in profile."
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid var(--primary-100)'
                }}
              >
                <MapPin size={14} style={{ color: 'var(--primary-600)' }} />
                <span>{userCityDisplay}</span>
              </Link>
            )}

            {/* Provider Working Availability Pill */}
            {user?.role === 'provider' && (
              <button
                type="button"
                onClick={toggleProviderAvailability}
                disabled={isTogglingAvail}
                title="Click to toggle working status"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
                className={`badge ${isAvailable ? 'badge-completed' : 'badge-rejected'}`}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isAvailable ? 'var(--primary-500)' : 'var(--color-text-subtle)'
                }} />
                <span>{isAvailable ? 'Taking Jobs' : 'Offline'}</span>
              </button>
            )}

            {/* Notification Bell Icon */}
            <Link 
              to={notificationPath} 
              className="dashboard-icon-btn" 
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
              aria-label="View notifications"
              style={{ position: 'relative' }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: 'var(--color-danger)',
                    color: '#ffffff',
                    fontSize: 'var(--font-size-2xs, 0.72rem)',
                    fontWeight: 700,
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1,
                    border: '2px solid var(--color-bg-card)'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Accessible Theme Toggle */}
            <ThemeToggle id="dashboard-theme-toggle" size="md" />

            {/* Profile Avatar Trigger & Dropdown Menu */}
            <div className="dashboard-profile-menu-container" ref={dropdownRef}>
              <button
                type="button"
                className="dashboard-profile-trigger"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                aria-label="Open user profile menu"
              >
                <div className="dashboard-avatar" style={{ width: '1.85rem', height: '1.85rem', fontSize: '0.8rem', overflow: 'hidden' }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || 'User'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>

              {profileDropdownOpen && (
                <div className="dashboard-profile-dropdown" role="menu">
                  <div className="dropdown-user-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="dashboard-avatar" style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.95rem', overflow: 'hidden', flexShrink: 0 }}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={user?.name || 'User'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div className="dropdown-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                      <div className="dropdown-user-email" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                    </div>
                  </div>

                  <Link 
                    to={profilePath} 
                    className="dropdown-menu-item" 
                    role="menuitem"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <User size={16} />
                    <span>{user?.role === 'provider' ? 'My Business Profile' : 'My Profile'}</span>
                  </Link>

                  {user?.role === 'customer' && (
                    <Link 
                      to="/customer/bookings" 
                      className="dropdown-menu-item" 
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <Calendar size={16} />
                      <span>My Bookings</span>
                    </Link>
                  )}

                  {user?.role === 'provider' && (
                    <Link 
                      to="/provider/services" 
                      className="dropdown-menu-item" 
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <Wrench size={16} />
                      <span>My Services</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="dropdown-menu-item logout"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="dashboard-content-body" id="dashboard-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
