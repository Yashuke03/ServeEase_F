import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  Calendar, 
  Star, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Filter,
  Eye,
  Ban,
  RotateCcw,
  Trash2,
  Flag,
  FileText,
  Clock,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Check,
  X,
  TrendingUp,
  BarChart3,
  PieChart,
  IndianRupee,
  Activity,
  Award,
  ArrowUpRight,
  Layers,
  Mail,
  Phone,
  ExternalLink,
  FileCheck,
  History,
  User,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import { adminApi, systemApi } from '../services/api';
import { getCityDisplayName, CITIES } from '../data/cities';
import { getSocket } from '../services/socket';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'providers' | 'bookings' | 'reviews' | 'audit'

  // ========================================================
  // 1. OVERVIEW & HEALTH STATE (System Analytics)
  // ========================================================
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30d');
  const [analyticsCity, setAnalyticsCity] = useState('all');
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);

  const fetchStatsAndHealth = useCallback(async (timeframe = analyticsTimeframe, city = analyticsCity) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        adminApi.getAnalytics({
          timeframe,
          city: city === 'all' ? undefined : city
        }),
        systemApi.getHealth().catch(() => null)
      ]);
      if (analyticsRes.success) {
        setStats(analyticsRes.analytics || analyticsRes.stats);
      } else {
        // Fallback to getStats
        const statsRes = await adminApi.getStats();
        if (statsRes.success) {
          setStats(statsRes.stats);
        } else {
          setStatsError(statsRes.error || 'Failed to load platform statistics.');
        }
      }
      if (healthRes) {
        setHealthData(healthRes);
      }
    } catch (err) {
      setStatsError(err.message || 'Error fetching administrator metrics.');
    } finally {
      setStatsLoading(false);
    }
  }, [analyticsTimeframe, analyticsCity]);

  useEffect(() => {
    fetchStatsAndHealth(analyticsTimeframe, analyticsCity);
  }, [analyticsTimeframe, analyticsCity, fetchStatsAndHealth]);

  // ========================================================
  // 2. USERS MANAGEMENT STATE
  // ========================================================
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userCityFilter, setUserCityFilter] = useState('all');

  // User Action Modals & Comprehensive 360 Profile Inspection
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileModalTab, setProfileModalTab] = useState('overview'); // 'overview' | 'bookings' | 'reviews' | 'documents' | 'audit'

  const handleOpenProfileModal = useCallback(async (targetUser) => {
    if (!targetUser) return;
    const targetId = typeof targetUser === 'string' ? targetUser : (targetUser._id || targetUser.id);
    if (!targetId) return;

    if (typeof targetUser === 'object') {
      setProfileModalUser(targetUser);
    } else {
      setProfileModalUser({ _id: targetId, name: 'Loading user...' });
    }
    setProfileLoading(true);
    setProfileError(null);
    setProfileModalTab('overview');

    try {
      const res = await adminApi.getUserById(targetId);
      if (res?.success && res.user) {
        setProfileModalUser(res.user);
      } else {
        setProfileError(res?.error || 'Failed to retrieve full user profile.');
      }
    } catch (err) {
      console.warn('Error loading full user profile:', err);
      setProfileError(err.message || 'Network error fetching user profile.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setProfileModalUser(null);
    setProfileError(null);
  }, []);

  const [actionTargetUser, setActionTargetUser] = useState(null);
  const [actionStatusType, setActionStatusType] = useState('suspended'); // 'active' | 'suspended'
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers({
        q: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
        city: userCityFilter === 'all' ? undefined : userCityFilter,
        page: usersPage,
        limit: 10
      });
      if (res.success) {
        setUsers(res.users || []);
        setUsersTotal(res.total || 0);
        setUsersTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.warn('Could not fetch users:', err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter, userCityFilter, usersPage]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleUpdateUserStatus = async () => {
    if (!actionTargetUser) return;
    setActionSubmitting(true);
    setActionMessage(null);
    try {
      const res = await adminApi.updateUserStatus(actionTargetUser._id, {
        status: actionStatusType,
        reason: actionReason
      });
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          setActionTargetUser(null);
          setActionReason('');
          setActionMessage(null);
          fetchUsers();
          fetchStatsAndHealth();
        }, 1200);
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to update user status.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Error communicating with server.' });
    } finally {
      setActionSubmitting(false);
    }
  };

  // User Deletion Modal State & Handler
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeleteSubmitting(true);
    setDeleteMessage(null);
    try {
      const res = await adminApi.deleteUser(deleteTargetUser._id, deleteReason);
      if (res.success) {
        setDeleteMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          setDeleteTargetUser(null);
          setDeleteReason('');
          setDeleteMessage(null);
          fetchUsers();
          fetchStatsAndHealth();
        }, 1200);
      } else {
        setDeleteMessage({ type: 'error', text: res.error || 'Failed to delete user account.' });
      }
    } catch (err) {
      setDeleteMessage({ type: 'error', text: err.message || 'Error communicating with server.' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ========================================================
  // 3. PROVIDER VERIFICATION STATE
  // ========================================================
  const [providers, setProviders] = useState([]);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [providersPage, setProvidersPage] = useState(1);
  const [providersTotalPages, setProvidersTotalPages] = useState(1);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerVerifFilter, setProviderVerifFilter] = useState('all'); // 'all' | 'pending' | 'verified'
  const [providerSearch, setProviderSearch] = useState('');
  const [providerCityFilter, setProviderCityFilter] = useState('all');

  // Provider Verification Modal & Document Review
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyDecision, setVerifyDecision] = useState(true);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyRejectionReason, setVerifyRejectionReason] = useState('');
  const [verifyDocs, setVerifyDocs] = useState([]);
  const [verifyDocsLoading, setVerifyDocsLoading] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(null);

  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const res = await adminApi.getProviders({
        verification: providerVerifFilter,
        q: providerSearch,
        city: providerCityFilter === 'all' ? undefined : providerCityFilter,
        page: providersPage,
        limit: 10
      });
      if (res.success) {
        setProviders(res.providers || []);
        setProvidersTotal(res.total || 0);
        setProvidersTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.warn('Could not fetch providers queue:', err.message);
    } finally {
      setProvidersLoading(false);
    }
  }, [providerVerifFilter, providerSearch, providerCityFilter, providersPage]);

  useEffect(() => {
    if (activeTab === 'providers') {
      fetchProviders();
    }
  }, [activeTab, fetchProviders]);

  // Real-time provider availability listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAvailabilityChanged = ({ providerId, isAvailable }) => {
      setProviders((prev) =>
        prev.map((p) => {
          if (p._id === providerId || p.id === providerId) {
            return {
              ...p,
              providerDetails: {
                ...(p.providerDetails || {}),
                isAvailable: isAvailable !== false
              }
            };
          }
          return p;
        })
      );
    };

    socket.on('provider_availability_changed', handleAvailabilityChanged);
    return () => {
      socket.off('provider_availability_changed', handleAvailabilityChanged);
    };
  }, []);

  const openVerifyModal = async (provider, decision) => {
    setVerifyTarget(provider);
    setVerifyDecision(decision);
    setVerifyNotes('');
    setVerifyRejectionReason('');
    setVerifyMessage(null);
    setVerifyDocs([]);
    setVerifyDocsLoading(true);

    try {
      const res = await adminApi.getProviderDocuments(provider._id);
      if (res?.success && Array.isArray(res.documents)) {
        setVerifyDocs(res.documents);
      }
    } catch (err) {
      console.warn('Could not fetch provider documents for admin:', err.message);
    } finally {
      setVerifyDocsLoading(false);
    }
  };

  const handleVerifyProvider = async () => {
    if (!verifyTarget) return;

    if (!verifyDecision && !verifyRejectionReason.trim()) {
      setVerifyMessage({ type: 'danger', text: 'Please specify a rejection reason for the audit trail.' });
      return;
    }

    if (verifyDecision && verifyDocs.length === 0) {
      setVerifyMessage({ type: 'danger', text: 'Cannot approve provider without at least one uploaded verification document.' });
      return;
    }

    setVerifySubmitting(true);
    setVerifyMessage(null);
    try {
      const res = await adminApi.verifyProvider(verifyTarget._id, {
        isVerified: verifyDecision,
        notes: verifyNotes.trim(),
        rejectionReason: verifyDecision ? undefined : verifyRejectionReason.trim()
      });
      if (res.success) {
        setVerifyMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          setVerifyTarget(null);
          setVerifyNotes('');
          setVerifyRejectionReason('');
          setVerifyMessage(null);
          setVerifyDocs([]);
          fetchProviders();
          fetchStatsAndHealth();
        }, 1200);
      } else {
        setVerifyMessage({ type: 'danger', text: res.error || 'Failed to update verification.' });
      }
    } catch (err) {
      setVerifyMessage({ type: 'danger', text: err.message || 'Error submitting verification.' });
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleViewAdminDocument = async (docId) => {
    if (!docId || docId === 'undefined') {
      alert('Document identifier is missing. Cannot view document.');
      return;
    }
    try {
      const blob = await adminApi.getDocumentBlob(docId);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      alert(`Could not open document: ${err.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ========================================================
  // 4. BOOKINGS OVERSIGHT STATE
  // ========================================================
  const [bookings, setBookings] = useState([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingCityFilter, setBookingCityFilter] = useState('all');

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await adminApi.getBookings({
        status: bookingStatusFilter,
        city: bookingCityFilter,
        page: bookingsPage,
        limit: 10
      });
      if (res.success) {
        setBookings(res.bookings || []);
        setBookingsTotal(res.total || 0);
        setBookingsTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.warn('Could not load bookings oversight:', err.message);
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingStatusFilter, bookingCityFilter, bookingsPage]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, fetchBookings]);

  // Booking Moderation & Content Management State
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingMessageText, setBookingMessageText] = useState('');
  const [bookingEditReason, setBookingEditReason] = useState('');
  const [bookingEditSubmitting, setBookingEditSubmitting] = useState(false);
  const [bookingEditError, setBookingEditError] = useState(null);

  const [deletingBooking, setDeletingBooking] = useState(null);
  const [bookingDeleteReason, setBookingDeleteReason] = useState('');
  const [bookingDeleteSubmitting, setBookingDeleteSubmitting] = useState(false);
  const [bookingDeleteError, setBookingDeleteError] = useState(null);

  const handleOpenEditBookingMessage = (booking) => {
    setEditingBooking(booking);
    setBookingMessageText(booking.description || '');
    setBookingEditReason('');
    setBookingEditError(null);
  };

  const handleSaveBookingMessage = async () => {
    if (!editingBooking) return;
    setBookingEditSubmitting(true);
    setBookingEditError(null);
    try {
      const res = await adminApi.updateBookingMessage(editingBooking._id, {
        message: bookingMessageText,
        reason: bookingEditReason
      });
      if (res?.success) {
        setBookings(prev =>
          prev.map(b => (b._id === editingBooking._id ? { ...b, description: bookingMessageText.trim() } : b))
        );
        setEditingBooking(null);
      } else {
        setBookingEditError(res?.error || 'Failed to update booking message.');
      }
    } catch (err) {
      setBookingEditError(err.message || 'Error updating booking message.');
    } finally {
      setBookingEditSubmitting(false);
    }
  };

  const handleOpenDeleteBooking = (booking) => {
    setDeletingBooking(booking);
    setBookingDeleteReason('');
    setBookingDeleteError(null);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!deletingBooking) return;
    setBookingDeleteSubmitting(true);
    setBookingDeleteError(null);
    try {
      const res = await adminApi.deleteBooking(deletingBooking._id, {
        reason: bookingDeleteReason
      });
      if (res?.success) {
        if (bookingStatusFilter === 'cancelled' || bookingStatusFilter === 'all') {
          setBookings(prev => prev.map(b => b._id === deletingBooking._id ? { ...b, status: 'cancelled', cancellationReason: bookingDeleteReason } : b));
        } else {
          setBookings(prev => prev.filter(b => b._id !== deletingBooking._id));
          setBookingsTotal(prev => Math.max(0, prev - 1));
        }
        setDeletingBooking(null);
      } else {
        setBookingDeleteError(res?.error || 'Failed to delete booking.');
      }
    } catch (err) {
      setBookingDeleteError(err.message || 'Error deleting booking.');
    } finally {
      setBookingDeleteSubmitting(false);
    }
  };

  // ========================================================
  // 5. REVIEWS & REPORTS MODERATION STATE
  // ========================================================
  const [reviews, setReviews] = useState([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
  const [reviewReportFilter, setReviewReportFilter] = useState('all'); // 'all' | 'pending_reports' | 'has_reports'

  // Review Moderation Modal
  const [modTargetReview, setModTargetReview] = useState(null);
  const [modStatus, setModStatus] = useState('hidden'); // 'hidden' | 'visible'
  const [modReason, setModReason] = useState('');
  const [modDismissReports, setModDismissReports] = useState(true);
  const [modSubmitting, setModSubmitting] = useState(false);
  const [modMessage, setModMessage] = useState(null);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await adminApi.getReviews({
        status: reviewStatusFilter,
        reported: reviewReportFilter,
        page: reviewsPage,
        limit: 10
      });
      if (res.success) {
        setReviews(res.reviews || []);
        setReviewsTotal(res.total || 0);
        setReviewsTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.warn('Could not fetch reviews for moderation:', err.message);
    } finally {
      setReviewsLoading(false);
    }
  }, [reviewStatusFilter, reviewReportFilter, reviewsPage]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab, fetchReviews]);

  const handleModerateReview = async () => {
    if (!modTargetReview) return;
    setModSubmitting(true);
    setModMessage(null);
    try {
      const res = await adminApi.moderateReview(modTargetReview._id, {
        status: modStatus,
        reason: modReason,
        dismissReports: modDismissReports
      });
      if (res.success) {
        setModMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          setModTargetReview(null);
          setModReason('');
          setModMessage(null);
          fetchReviews();
          fetchStatsAndHealth();
        }, 1200);
      } else {
        setModMessage({ type: 'error', text: res.error || 'Failed to moderate review.' });
      }
    } catch (err) {
      setModMessage({ type: 'error', text: err.message || 'Error moderating review.' });
    } finally {
      setModSubmitting(false);
    }
  };

  // ========================================================
  // 6. AUDIT LOGS TRAIL STATE
  // ========================================================
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await adminApi.getAuditLogs({
        page: auditPage,
        limit: 15
      });
      if (res.success) {
        setAuditLogs(res.logs || []);
        setAuditTotal(res.total || 0);
        setAuditTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.warn('Could not fetch audit trail:', err.message);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  return (
    <DashboardLayout
      title="Administrator Console"
      subtitle="Platform governance, verification review, and moderation audit"
    >
      {/* 1. Header Bar with Administrator Identity */}
      <div className="card" style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={32} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-text-title)' }}>
                {user?.name || 'Platform Administrator'}
              </h1>
              <span className="badge" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-border)', fontWeight: 700 }}>
                System Admin
              </span>
              <span className="badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-border)', fontWeight: 600 }}>
                ● Active Status
              </span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.86rem', marginTop: '0.2rem', margin: 0 }}>
              {user?.email} • Admin ID: <code style={{ fontSize: '0.78rem' }}>{user?._id}</code>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/admin/profile" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} />
              <span>Operator Profile</span>
            </Button>
          </Link>
          <button
            type="button"
            onClick={fetchStatsAndHealth}
            disabled={statsLoading || healthLoading}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
            <span>Refresh Metrics</span>
          </button>
          <Button variant="outline" size="sm" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-danger)', borderColor: 'var(--color-border)' }}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* 2. Primary Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'overview', label: 'Overview & Diagnostics', icon: Sliders },
          { id: 'users', label: 'User Accounts', icon: Users, badge: stats?.users?.totalUsers },
          { id: 'providers', label: 'Verification Queue', icon: UserCheck, badge: stats?.providers?.pendingVerification },
          { id: 'bookings', label: 'Booking Oversight', icon: Calendar, badge: stats?.bookings?.total },
          { id: 'reviews', label: 'Review Moderation', icon: Star, badge: stats?.reviews?.pendingReports },
          { id: 'audit', label: 'Audit Trail', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                color: isActive ? 'var(--primary-700)' : 'var(--color-text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.92rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge != null && Number(tab.badge) > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: tab.id === 'providers' || tab.id === 'reviews' ? 'var(--color-accent-gold-bg)' : 'var(--color-bg-subtle)',
                  color: tab.id === 'providers' || tab.id === 'reviews' ? 'var(--color-accent-gold)' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  fontWeight: 700
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW & SYSTEM METRICS (System Analytics)
          ======================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Analytics Filter & Refresh Toolbar */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-title)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Activity size={16} style={{ color: 'var(--primary-600)' }} />
                <span>Analytics Window:</span>
              </span>
              <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', padding: '3px', gap: '2px' }}>
                {[
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: '90d', label: '90 Days' },
                  { id: 'all', label: 'All Time' }
                ].map(tf => {
                  const isSelected = analyticsTimeframe === tf.id;
                  return (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setAnalyticsTimeframe(tf.id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? 'var(--color-bg-card)' : 'transparent',
                        color: isSelected ? 'var(--primary-600)' : 'var(--color-text-muted)',
                        boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>

              {/* City Filter for Analytics */}
              <select
                value={analyticsCity}
                onChange={(e) => setAnalyticsCity(e.target.value)}
                className="form-control"
                style={{ height: '34px', fontSize: '0.82rem', padding: '0 0.75rem', width: '160px' }}
              >
                <option value="all">All Service Cities</option>
                {CITIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Live MongoDB Aggregations
              </span>
              <button
                type="button"
                onClick={() => fetchStatsAndHealth(analyticsTimeframe, analyticsCity)}
                disabled={statsLoading}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '34px' }}
              >
                <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
                <span>Update</span>
              </button>
            </div>
          </div>

          {statsLoading && !stats ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>Computing real-time platform analytics from database...</p>
            </div>
          ) : statsError ? (
            <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={20} />
              <span>{statsError}</span>
            </div>
          ) : (
            <>
              {/* Metric KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {/* 1. Customers KPI */}
                <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Customers</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                      <Users size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-text-title)' }}>
                    {stats.users?.totalCustomers || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> {stats.users?.activeCustomers ?? stats.users?.totalCustomers ?? 0} Active
                    </span>
                    {(stats.users?.suspendedCustomers || 0) > 0 && (
                      <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Ban size={12} /> {stats.users.suspendedCustomers} Suspended
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Service Providers KPI */}
                <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Service Technicians</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
                      <Briefcase size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-text-title)' }}>
                    {stats.providers?.total || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                      {stats.providers?.verified || 0} Verified
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>
                      • {stats.providers?.pendingVerification || 0} Awaiting
                    </span>
                    {(stats.providers?.suspended || 0) > 0 && (
                      <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                        • {stats.providers.suspended} Suspended
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Bookings KPI */}
                <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Platform Bookings</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-text-title)' }}>
                    {stats.bookings?.total || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                      ₹{(stats.bookings?.totalRevenue || 0).toLocaleString()} Volume
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>
                      • {stats.bookings?.completionRate || 0}% Completion
                    </span>
                  </div>
                </div>

                {/* 4. Customer Reviews KPI */}
                <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Customer Reviews</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                      <Star size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-text-title)' }}>
                    {stats.reviews?.total || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                      {stats.reviews?.visible ?? stats.reviews?.total ?? 0} Published
                    </span>
                    {(stats.reviews?.pendingReports || 0) > 0 ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 700 }}>
                        • {stats.reviews.pendingReports} Flagged Reports
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        • 0 Flagged
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================
                  INTERACTIVE BOOKING TRENDS OVER TIME (SVG Chart)
                  ======================================================== */}
              <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-title)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <TrendingUp size={20} style={{ color: 'var(--primary-600)' }} />
                      <span>Booking Activity & Demand Trends</span>
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Daily service reservation trajectories and completion velocity over the selected window
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>
                      {analyticsTimeframe === 'all' ? 'All-Time Records' : `Window: Last ${analyticsTimeframe.replace('d', ' Days')}`}
                    </span>
                  </div>
                </div>

                {/* Render SVG Chart */}
                {(() => {
                  const trends = stats.bookingTrends || [];
                  if (trends.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                        <Calendar size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                        <h4 style={{ margin: '0 0 0.25rem', color: 'var(--color-text-title)', fontSize: '1rem' }}>
                          No Bookings Recorded In This Window
                        </h4>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                          Try switching to "All Time" or selecting "All Service Cities" to inspect historical appointments.
                        </p>
                      </div>
                    );
                  }

                  const svgWidth = 760;
                  const svgHeight = 220;
                  const padLeft = 45;
                  const padRight = 30;
                  const padTop = 20;
                  const padBottom = 40;
                  const plotWidth = svgWidth - padLeft - padRight;
                  const plotHeight = svgHeight - padTop - padBottom;

                  const maxTotal = Math.max(5, ...trends.map(t => t.total || 0));

                  const points = trends.map((t, idx) => {
                    const x = padLeft + (trends.length > 1 ? (idx / (trends.length - 1)) * plotWidth : plotWidth / 2);
                    const yTotal = padTop + plotHeight - ((t.total || 0) / maxTotal) * plotHeight;
                    const yComp = padTop + plotHeight - ((t.completed || 0) / maxTotal) * plotHeight;
                    return { ...t, x, yTotal, yComp, idx };
                  });

                  const totalPathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yTotal.toFixed(1)}`, '');
                  const areaPathD = points.length > 0 
                    ? `${totalPathD} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`
                    : '';
                  const compPathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yComp.toFixed(1)}`, '');

                  const ticks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
                    val: Math.round(pct * maxTotal),
                    y: padTop + plotHeight - pct * plotHeight
                  }));

                  const labelStep = Math.max(1, Math.ceil(trends.length / 7));

                  return (
                    <div style={{ position: 'relative' }}>
                      <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        style={{ width: '100%', height: 'auto', maxHeight: '250px', overflow: 'visible' }}
                      >
                        <defs>
                          <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {ticks.map((tick, i) => (
                          <g key={i}>
                            <line
                              x1={padLeft}
                              y1={tick.y}
                              x2={svgWidth - padRight}
                              y2={tick.y}
                              stroke="#e2e8f0"
                              strokeDasharray={i === 0 ? undefined : '3 3'}
                              strokeWidth="1"
                            />
                            <text
                              x={padLeft - 8}
                              y={tick.y + 4}
                              fontSize="10"
                              fill="#94a3b8"
                              textAnchor="end"
                              fontWeight="500"
                            >
                              {tick.val}
                            </text>
                          </g>
                        ))}

                        {/* Shaded Area */}
                        {areaPathD && (
                          <path d={areaPathD} fill="url(#trendAreaGrad)" />
                        )}

                        {/* Total Bookings Line */}
                        {totalPathD && (
                          <path
                            d={totalPathD}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Completed Line */}
                        {compPathD && (
                          <path
                            d={compPathD}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Data Points */}
                        {points.map((p, idx) => {
                          const isHovered = hoveredTrendPoint?.date === p.date;
                          return (
                            <g
                              key={idx}
                              onMouseEnter={() => setHoveredTrendPoint(p)}
                              style={{ cursor: 'pointer' }}
                            >
                              <circle cx={p.x} cy={p.yTotal} r="14" fill="transparent" />
                              <circle
                                cx={p.x}
                                cy={p.yTotal}
                                r={isHovered ? 6 : 3.5}
                                fill={isHovered ? '#1d4ed8' : '#3b82f6'}
                                stroke="#ffffff"
                                strokeWidth={isHovered ? 2.5 : 1.5}
                                style={{ transition: 'all 0.15s ease' }}
                              />
                              {(idx % labelStep === 0 || idx === points.length - 1) && (
                                <text
                                  x={p.x}
                                  y={svgHeight - 12}
                                  fontSize="10"
                                  fill="#64748b"
                                  textAnchor="middle"
                                  fontWeight="500"
                                >
                                  {p.date ? p.date.slice(5) : ''}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip Card */}
                      {hoveredTrendPoint && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            padding: '0.65rem 0.95rem',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.25)',
                            fontSize: '0.8rem',
                            zIndex: 10,
                            minWidth: '180px',
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: '0.35rem', borderBottom: '1px solid #334155', paddingBottom: '0.25rem' }}>
                            {hoveredTrendPoint.date}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', margin: '0.2rem 0' }}>
                            <span style={{ color: '#cbd5e1' }}>Total Bookings:</span>
                            <strong style={{ color: '#ffffff' }}>{hoveredTrendPoint.total}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', margin: '0.2rem 0' }}>
                            <span style={{ color: '#86efac' }}>Completed:</span>
                            <strong style={{ color: '#86efac' }}>{hoveredTrendPoint.completed}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', margin: '0.2rem 0' }}>
                            <span style={{ color: '#fed7aa' }}>In-Progress:</span>
                            <strong style={{ color: '#fed7aa' }}>{hoveredTrendPoint.accepted || 0}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', margin: '0.2rem 0' }}>
                            <span style={{ color: '#cbd5e1' }}>Revenue:</span>
                            <strong style={{ color: '#facc15' }}>₹{(hoveredTrendPoint.revenue || 0).toLocaleString()}</strong>
                          </div>
                        </div>
                      )}

                      {/* Chart Legend */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ display: 'inline-block', width: '12px', height: '3px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
                          <span>Total Bookings</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ display: 'inline-block', width: '12px', height: '0', borderTop: '2px dashed #10b981' }} />
                          <span>Completed Jobs</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#facc15' }} />
                          <span>Revenue Generated (₹)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ========================================================
                  APPOINTMENT LIFECYCLE DISTRIBUTION
                  ======================================================== */}
              <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-title)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Layers size={18} style={{ color: 'var(--primary-600)' }} />
                      <span>Appointment Lifecycle Distribution</span>
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Proportional distribution across all booking lifecycle states
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    Total Records: {stats.bookings?.total || 0}
                  </span>
                </div>

                {/* Proportional Stacked Progress Bar */}
                {(() => {
                  const bStatus = stats.bookings?.byStatus || {};
                  const totalLife = (bStatus.pending || 0) + (bStatus.accepted || 0) + (bStatus.completed || 0) + (bStatus.cancelled || 0) + (bStatus.rejected || 0);
                  const getPct = (cnt) => totalLife > 0 ? Math.round((cnt / totalLife) * 100) : 0;

                  return (
                    <>
                      <div style={{
                        display: 'flex',
                        height: '14px',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        backgroundColor: 'var(--color-bg-subtle)',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--color-border)'
                      }}>
                        {bStatus.completed > 0 && (
                          <div
                            title={`Completed: ${bStatus.completed} (${getPct(bStatus.completed)}%)`}
                            style={{ width: `${getPct(bStatus.completed)}%`, backgroundColor: '#16a34a' }}
                          />
                        )}
                        {bStatus.accepted > 0 && (
                          <div
                            title={`In-Progress: ${bStatus.accepted} (${getPct(bStatus.accepted)}%)`}
                            style={{ width: `${getPct(bStatus.accepted)}%`, backgroundColor: '#2563eb' }}
                          />
                        )}
                        {bStatus.pending > 0 && (
                          <div
                            title={`Pending: ${bStatus.pending} (${getPct(bStatus.pending)}%)`}
                            style={{ width: `${getPct(bStatus.pending)}%`, backgroundColor: '#d97706' }}
                          />
                        )}
                        {bStatus.cancelled > 0 && (
                          <div
                            title={`Cancelled: ${bStatus.cancelled} (${getPct(bStatus.cancelled)}%)`}
                            style={{ width: `${getPct(bStatus.cancelled)}%`, backgroundColor: '#dc2626' }}
                          />
                        )}
                        {bStatus.rejected > 0 && (
                          <div
                            title={`Declined: ${bStatus.rejected} (${getPct(bStatus.rejected)}%)`}
                            style={{ width: `${getPct(bStatus.rejected)}%`, backgroundColor: '#64748b' }}
                          />
                        )}
                      </div>

                      {/* Status Breakdown Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        {[
                          { label: 'Pending Requests', count: bStatus.pending || 0, color: '#92400e', bg: '#fef3c7' },
                          { label: 'Confirmed / Active', count: bStatus.accepted || 0, color: '#1e40af', bg: '#dbeafe' },
                          { label: 'Successfully Completed', count: bStatus.completed || 0, color: '#166534', bg: '#dcfce7' },
                          { label: 'Cancelled', count: bStatus.cancelled || 0, color: '#991b1b', bg: '#fee2e2' },
                          { label: 'Declined by Tech', count: bStatus.rejected || 0, color: '#475569', bg: '#f1f5f9' }
                        ].map(item => (
                          <div
                            key={item.label}
                            style={{
                              padding: '1rem',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: item.bg,
                              border: `1px solid ${item.color}25`,
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: item.color }}>
                              {item.count}
                            </div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: item.color, marginTop: '0.2rem' }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: item.color, opacity: 0.85, marginTop: '0.15rem' }}>
                              {getPct(item.count)}% of total
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ========================================================
                  POPULAR SERVICE CATEGORIES BREAKDOWN
                  ======================================================== */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* 1. Demand: Categories by Bookings */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-title)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <BarChart3 size={18} style={{ color: 'var(--primary-600)' }} />
                        <span>Categories by Booking Demand</span>
                      </h3>
                      <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        Highest requested trade specializations
                      </p>
                    </div>
                  </div>

                  {(!stats.categories?.byBookings || stats.categories.byBookings.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      No categorized booking data recorded.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {(() => {
                        const maxCount = Math.max(1, ...stats.categories.byBookings.map(c => c.count));
                        return stats.categories.byBookings.map(c => (
                          <div key={c.category} style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <strong style={{ color: 'var(--color-text-title)' }}>{c.category}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                <strong>{c.count}</strong> jobs • ₹{(c.revenue || 0).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ height: '7px', borderRadius: '4px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.round((c.count / maxCount) * 100)}%`,
                                  height: '100%',
                                  backgroundColor: 'var(--primary-600)',
                                  borderRadius: '4px'
                                }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* 2. Supply: Categories by Providers */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-title)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Award size={18} style={{ color: '#0284c7' }} />
                        <span>Technician Supply by Category</span>
                      </h3>
                      <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        Registered workforce across service verticals
                      </p>
                    </div>
                  </div>

                  {(!stats.categories?.byProviders || stats.categories.byProviders.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      No categorized provider profiles recorded.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {(() => {
                        const maxCount = Math.max(1, ...stats.categories.byProviders.map(c => c.count));
                        return stats.categories.byProviders.map(c => (
                          <div key={c.category} style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <strong style={{ color: 'var(--color-text-title)' }}>{c.category}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                                {c.count} technicians ({c.verified || 0} verified)
                              </span>
                            </div>
                            <div style={{ height: '7px', borderRadius: '4px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.round((c.count / maxCount) * 100)}%`,
                                  height: '100%',
                                  backgroundColor: '#0284c7',
                                  borderRadius: '4px'
                                }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================
                  CITY-WISE GEOGRAPHIC DISTRIBUTION
                  ======================================================== */}
              <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-title)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={18} style={{ color: 'var(--primary-600)' }} />
                      <span>City-Wise Provider & Booking Distribution</span>
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Live geographic distribution and revenue generation across Maharashtra service hubs
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {stats.cityDistribution?.length || 0} Active Hubs
                  </span>
                </div>

                {(!stats.cityDistribution || stats.cityDistribution.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                    No city distribution data recorded yet.
                  </div>
                ) : (
                  <div className="table-responsive-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>City / Service Hub</th>
                          <th>Registered Users</th>
                          <th>Technicians</th>
                          <th>Verified Badge Ratio</th>
                          <th>Total Bookings</th>
                          <th>Completed Jobs</th>
                          <th>Platform Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.cityDistribution.map((cityItem) => {
                          const verifiedPct = cityItem.providers > 0 ? Math.round((cityItem.verifiedProviders / cityItem.providers) * 100) : 0;
                          return (
                            <tr key={cityItem.city} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <strong style={{ color: 'var(--color-text-title)' }}>{cityItem.cityName || cityItem.city}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {cityItem.city}</div>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>{cityItem.totalUsers}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.35rem' }}>({cityItem.customers} seekers)</span>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>{cityItem.providers}</span>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <span style={{
                                  fontSize: '0.78rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: verifiedPct > 50 ? '#dcfce7' : '#fef3c7',
                                  color: verifiedPct > 50 ? '#166534' : '#92400e',
                                  fontWeight: 600
                                }}>
                                  {cityItem.verifiedProviders} / {cityItem.providers} ({verifiedPct}%)
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <strong>{cityItem.totalBookings}</strong>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>{cityItem.completedBookings}</span>
                              </td>
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <strong style={{ color: 'var(--primary-700)' }}>₹{(cityItem.revenue || 0).toLocaleString()}</strong>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ========================================================
                  LIVE SYSTEM HEALTH & TOPOLOGY DIAGNOSTICS CARD
                  ======================================================== */}
              {healthData && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary-600)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text-title)' }}>
                        Live System Health & Infrastructure Diagnostics
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Uptime: {Math.floor(healthData.uptimeSeconds / 60)} minutes • Database: {healthData.services?.database}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.86rem', color: 'var(--color-text-body)' }}>
                    <div><strong>API Server:</strong> Operational (Port 5001)</div>
                    <div><strong>Atlas MongoDB:</strong> Connected & Indexed</div>
                    <div><strong>Access Controls:</strong> JWT & RBAC Enforced</div>
                    <div><strong>Active Session:</strong> {user?.email} ({user?.role})</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: USER ACCOUNTS MANAGEMENT
          ======================================================== */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                Platform Users ({usersTotal})
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Inspect registered customer, provider, and administrative accounts. Suspend or reactivate access.
              </p>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search name, email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  className="form-control"
                  style={{ paddingLeft: '2rem', height: '36px', fontSize: '0.85rem', width: '190px' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '11px', color: '#94a3b8' }} />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUsersPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem', width: '120px' }}
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="provider">Providers</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUsersPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem', width: '120px' }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={userCityFilter}
                onChange={(e) => {
                  setUserCityFilter(e.target.value);
                  setUsersPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem', width: '140px' }}
              >
                <option value="all">All Cities</option>
                {CITIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Loading user accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0 }}>No users found matching the selected filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name & Email</th>
                    <th>Role</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = user?._id === u._id;
                    const isSuspended = u.status === 'suspended';
                    return (
                      <tr key={u._id}>
                        <td>
                          <strong style={{ color: 'var(--color-text-title)', display: 'block' }}>{u.name}</strong>
                          <span style={{ fontSize: 'var(--font-size-xs, 0.78rem)', color: 'var(--color-text-muted)' }}>{u.email}</span>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-prototype' : u.role === 'provider' ? 'badge-primary' : ''}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-body)' }}>
                          {u.cityName || u.city || '—'}
                        </td>
                        <td>
                          <span className={`badge ${isSuspended ? 'badge-cancelled' : 'badge-completed'}`}>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm, 0.82rem)' }}>
                          {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenProfileModal(u)}
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              title="View full account profile & history"
                            >
                              <Eye size={13} />
                              <span>View Profile</span>
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionTargetUser(u);
                                  setActionStatusType(isSuspended ? 'active' : 'suspended');
                                  setActionReason('');
                                  setActionMessage(null);
                                }}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: isSuspended ? '#dcfce7' : '#fee2e2',
                                  color: isSuspended ? '#166534' : '#991b1b',
                                  border: `1px solid ${isSuspended ? '#86efac' : '#fca5a5'}`
                                }}
                                title={isSuspended ? 'Reactivate user account' : 'Suspend user account'}
                              >
                                {isSuspended ? <RotateCcw size={13} /> : <Ban size={13} />}
                                <span style={{ marginLeft: '0.25rem' }}>{isSuspended ? 'Reactivate' : 'Suspend'}</span>
                              </button>
                            )}

                            {!isSelf && isSuspended && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetUser(u);
                                  setDeleteReason('');
                                  setDeleteMessage(null);
                                }}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: '#fee2e2',
                                  color: '#991b1b',
                                  border: '1px solid #f87171'
                                }}
                                title="Permanently delete suspended user"
                              >
                                <Trash2 size={13} />
                                <span style={{ marginLeft: '0.25rem' }}>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Page {usersPage} of {usersTotalPages} ({usersTotal} records)
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                    className="btn btn-outline btn-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                    className="btn btn-outline btn-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: PROVIDER VERIFICATION QUEUE
          ======================================================== */}
      {activeTab === 'providers' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                Provider Verification & Credentials ({providersTotal})
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Review technician qualifications, verify trade credentials, and audit verification badge decisions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search provider, trade..."
                  value={providerSearch}
                  onChange={(e) => {
                    setProviderSearch(e.target.value);
                    setProvidersPage(1);
                  }}
                  className="form-control"
                  style={{ paddingLeft: '2rem', height: '36px', fontSize: '0.85rem', width: '190px' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '11px', color: '#94a3b8' }} />
              </div>

              <select
                value={providerVerifFilter}
                onChange={(e) => {
                  setProviderVerifFilter(e.target.value);
                  setProvidersPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                <option value="all">All Verification States</option>
                <option value="pending">Awaiting Review (Unverified)</option>
                <option value="verified">Verified Badge Granted</option>
              </select>

              <select
                value={providerCityFilter}
                onChange={(e) => {
                  setProviderCityFilter(e.target.value);
                  setProvidersPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem', width: '140px' }}
              >
                <option value="all">All Cities</option>
                {CITIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {providersLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Loading provider queue...</p>
            </div>
          ) : providers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              <UserCheck size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0 }}>No providers found in this verification status.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {providers.map((p) => {
                const isVerified = Boolean(p.providerDetails?.isVerified);
                const isAvail = p.providerDetails?.isAvailable !== false;
                return (
                  <div
                    key={p._id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ minWidth: '260px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-title)' }}>{p.name}</strong>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isVerified ? '#dcfce7' : p.providerDetails?.verificationStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: isVerified ? '#166534' : p.providerDetails?.verificationStatus === 'rejected' ? '#991b1b' : '#92400e',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {isVerified ? <CheckCircle2 size={13} /> : p.providerDetails?.verificationStatus === 'rejected' ? <ShieldAlert size={13} /> : <AlertCircle size={13} />}
                          {isVerified ? 'Verified Professional' : p.providerDetails?.verificationStatus === 'rejected' ? 'Application Rejected' : 'Awaiting Verification'}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: (p.documentCount > 0 || (p.documents && p.documents.length > 0)) ? '#eff6ff' : '#fffbeb',
                          color: (p.documentCount > 0 || (p.documents && p.documents.length > 0)) ? '#1d4ed8' : '#b45309',
                          border: `1px solid ${(p.documentCount > 0 || (p.documents && p.documents.length > 0)) ? '#bfdbfe' : '#fde68a'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <FileText size={12} />
                          {(p.documentCount ?? (p.documents?.length || 0))} Doc(s)
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isAvail ? '#ecfdf5' : '#f1f5f9',
                          color: isAvail ? '#047857' : '#64748b',
                          border: `1px solid ${isAvail ? '#a7f3d0' : '#cbd5e1'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isAvail ? '#10b981' : '#94a3b8'
                          }} />
                          {isAvail ? 'Taking Jobs (Online)' : 'Unavailable (Offline)'}
                        </span>
                      </div>

                      <p style={{ margin: '0.2rem 0', fontSize: '0.88rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                        {p.providerDetails?.title || p.providerDetails?.category || 'Service Technician'} • {p.cityName || p.city}
                      </p>

                      <p style={{ margin: '0.2rem 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {p.email} • {p.phoneNumber || 'No phone recorded'} • {p.providerDetails?.experienceYears || 0} yrs experience
                      </p>

                      {Array.isArray(p.providerDetails?.servicesOffered) && p.providerDetails.servicesOffered.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                          {p.providerDetails.servicesOffered.map((s, idx) => (
                            <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => openVerifyModal(p, true)}
                        className="btn btn-sm btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#16a34a',
                          borderColor: '#16a34a',
                          color: '#ffffff'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>{isVerified ? 'Review / Re-verify' : 'Review & Approve'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openVerifyModal(p, false)}
                        className="btn btn-sm btn-outline"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          borderColor: '#fca5a5',
                          color: '#991b1b'
                        }}
                      >
                        <Ban size={14} />
                        <span>{isVerified ? 'Revoke Verification' : 'Reject Application'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: BOOKINGS OVERSIGHT
          ======================================================== */}
      {activeTab === 'bookings' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                Platform Bookings Oversight ({bookingsTotal})
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Read-only appointment ledger. Customer service addresses are masked to preserve user privacy.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select
                value={bookingStatusFilter}
                onChange={(e) => {
                  setBookingStatusFilter(e.target.value);
                  setBookingsPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={bookingCityFilter}
                onChange={(e) => {
                  setBookingCityFilter(e.target.value);
                  setBookingsPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                <option value="all">All Cities</option>
                {CITIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {bookingsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Loading appointment records...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              <Calendar size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0 }}>No bookings found matching selected filters.</p>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service & Schedule</th>
                    <th>Customer</th>
                    <th>Provider</th>
                    <th>City & Locality</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <strong style={{ color: 'var(--color-text-title)', display: 'block' }}>{b.serviceName}</strong>
                        <span style={{ fontSize: 'var(--font-size-xs, 0.78rem)', color: 'var(--color-text-muted)' }}>
                          {b.bookingDate} at {b.bookingTime}
                        </span>
                        {b.description ? (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#334155', backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', maxWidth: '280px' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>Message: </span>
                            <span style={{ wordBreak: 'break-word' }}>{b.description}</span>
                          </div>
                        ) : (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No message attached
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-body)', fontWeight: 600 }}>{b.customer?.name || 'Customer'}</span>
                        <div style={{ fontSize: 'var(--font-size-2xs, 0.76rem)', color: 'var(--color-text-muted)' }}>{b.customer?.email}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-body)', fontWeight: 600 }}>{b.provider?.name || 'Provider'}</span>
                        <div style={{ fontSize: 'var(--font-size-2xs, 0.76rem)', color: 'var(--color-text-muted)' }}>{b.provider?.providerDetails?.title || b.category}</div>
                      </td>
                      <td>
                        <div>{b.cityName || b.city}</div>
                        <span style={{ fontSize: 'var(--font-size-2xs, 0.76rem)', color: 'var(--color-text-muted)' }}>
                          {b.serviceAddressMasked}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          b.status === 'completed' ? 'badge-completed' :
                          b.status === 'in_progress' ? 'badge-in-progress' :
                          b.status === 'accepted' ? 'badge-accepted' :
                          b.status === 'pending' ? 'badge-pending' : 'badge-cancelled'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {b.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-title)' }}>
                        ₹{b.price}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditBookingMessage(b)}
                            className="btn btn-outline btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.78rem'
                            }}
                            title="Edit or redact customer booking message"
                          >
                            <Edit3 size={12} />
                            <span>Edit Msg</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteBooking(b)}
                            className="btn btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.78rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5'
                            }}
                            title="Permanently delete booking"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Page {bookingsPage} of {bookingsTotalPages} ({bookingsTotal} appointments)
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    disabled={bookingsPage <= 1}
                    onClick={() => setBookingsPage(prev => Math.max(1, prev - 1))}
                    className="btn btn-outline btn-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    disabled={bookingsPage >= bookingsTotalPages}
                    onClick={() => setBookingsPage(prev => Math.min(bookingsTotalPages, prev + 1))}
                    className="btn btn-outline btn-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: REVIEWS & REPORTS MODERATION
          ======================================================== */}
      {activeTab === 'reviews' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                Reviews Moderation & Report Queue ({reviewsTotal})
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Investigate flagged reviews. Hiding a review recalculates the provider’s live average rating immediately.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select
                value={reviewStatusFilter}
                onChange={(e) => {
                  setReviewStatusFilter(e.target.value);
                  setReviewsPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                <option value="all">All Visibility States</option>
                <option value="visible">Visible Only</option>
                <option value="hidden">Hidden by Moderator</option>
              </select>

              <select
                value={reviewReportFilter}
                onChange={(e) => {
                  setReviewReportFilter(e.target.value);
                  setReviewsPage(1);
                }}
                className="form-control"
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                <option value="all">All Feedback</option>
                <option value="pending_reports">Pending Flagged Reports</option>
                <option value="has_reports">All Reported Reviews</option>
              </select>
            </div>
          </div>

          {reviewsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Loading reviews queue...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              <Star size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0 }}>No reviews found matching moderation filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map((r) => {
                const isHidden = r.status === 'hidden';
                const pendingReports = r.reports?.filter(rep => rep.status === 'pending') || [];
                return (
                  <div
                    key={r._id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${pendingReports.length > 0 ? 'var(--color-danger)' : 'var(--color-border)'}`,
                      backgroundColor: isHidden ? 'var(--color-bg-subtle)' : pendingReports.length > 0 ? 'var(--color-danger-bg)' : 'var(--color-bg-card)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                size={14}
                                fill={s <= r.rating ? '#d97706' : '#cbd5e1'}
                                stroke={s <= r.rating ? '#d97706' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                          <strong style={{ color: '#d97706', fontSize: '0.88rem' }}>{r.rating}.0 Stars</strong>

                          <span style={{
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: isHidden ? '#fee2e2' : '#dcfce7',
                            color: isHidden ? '#991b1b' : '#166534'
                          }}>
                            {isHidden ? 'Hidden by Admin' : 'Publicly Visible'}
                          </span>

                          {pendingReports.length > 0 && (
                            <span style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <Flag size={11} /> {pendingReports.length} Flagged Report(s)
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                          By <strong>{r.customer?.name}</strong> for <strong>{r.provider?.name}</strong> ({r.serviceName}) • {new Date(r.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setModTargetReview(r);
                            setModStatus(isHidden ? 'visible' : 'hidden');
                            setModReason('');
                            setModDismissReports(true);
                            setModMessage(null);
                          }}
                          className={`btn btn-sm ${isHidden ? 'btn-outline' : 'btn-primary'}`}
                          style={{
                            backgroundColor: isHidden ? 'transparent' : 'var(--color-danger)',
                            borderColor: isHidden ? '#94a3b8' : 'var(--color-danger)',
                            color: isHidden ? '#334155' : '#ffffff'
                          }}
                        >
                          {isHidden ? <RotateCcw size={13} /> : <Ban size={13} />}
                          <span style={{ marginLeft: '0.25rem' }}>{isHidden ? 'Restore Review' : 'Hide Review'}</span>
                        </button>
                      </div>
                    </div>

                    {r.comment && (
                      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-body)', fontStyle: 'italic', backgroundColor: 'var(--color-bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                        "{r.comment}"
                      </p>
                    )}

                    {isHidden && r.hiddenReason && (
                      <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.4rem' }}>
                        <strong>Moderation Note:</strong> {r.hiddenReason}
                      </div>
                    )}

                    {/* Pending Reports List */}
                    {pendingReports.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #fca5a5' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>User Reports:</span>
                        {pendingReports.map((rep, idx) => (
                          <div key={idx} style={{ fontSize: '0.82rem', color: '#7f1d1d', marginTop: '0.2rem' }}>
                            • <em>"{rep.reason}"</em> — Submitted by {rep.reporter?.name || 'User'} ({rep.reporterRole})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 6: AUDIT TRAIL
          ======================================================== */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                Administrative Audit Trail ({auditTotal})
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Immutable persistent record of all administrative moderation actions, suspensions, and verifications.
              </p>
            </div>
          </div>

          {auditLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              <FileText size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0 }}>No administrative actions recorded yet.</p>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Documented Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-text-title)' }}>{log.adminName || log.adminEmail}</strong>
                      </td>
                      <td>
                        <code style={{
                          backgroundColor: 'var(--color-bg-subtle, #f1f5f9)',
                          padding: '0.2rem 0.45rem',
                          borderRadius: 'var(--radius-sm, 4px)',
                          color: 'var(--color-text-title, #0f172a)',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          border: '1px solid var(--color-border)'
                        }}>
                          {log.action}
                        </code>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-title)' }}>{log.targetType}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {log.targetId}</div>
                      </td>
                      <td style={{ color: 'var(--color-text-body)' }}>
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Page {auditPage} of {auditTotalPages} ({auditTotal} entries)
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                    className="btn btn-outline btn-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage(prev => Math.min(auditTotalPages, prev + 1))}
                    className="btn btn-outline btn-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: COMPREHENSIVE 360-DEGREE USER PROFILE INSPECTION
          ======================================================== */}
      {profileModalUser && (
        <div
          className="modal-backdrop"
          onClick={handleCloseProfileModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '920px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* 1. Header Banner */}
            <div style={{
              padding: '1.5rem 1.75rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-subtle) 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: profileModalUser.role === 'provider' ? '#dcfce7' : profileModalUser.role === 'admin' ? '#f3e8ff' : '#e0f2fe',
                  color: profileModalUser.role === 'provider' ? '#15803d' : profileModalUser.role === 'admin' ? '#7e22ce' : '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  border: `2px solid ${profileModalUser.role === 'provider' ? '#86efac' : profileModalUser.role === 'admin' ? '#d8b4fe' : '#7dd3fc'}`
                }}>
                  {profileModalUser.name ? profileModalUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-text-title)', fontWeight: 800 }}>
                      {profileModalUser.name}
                    </h2>
                    <span className={`badge ${profileModalUser.role === 'admin' ? 'badge-prototype' : profileModalUser.role === 'provider' ? 'badge-primary' : ''}`} style={{ textTransform: 'capitalize' }}>
                      {profileModalUser.role} Account
                    </span>
                    <span className={`badge ${profileModalUser.status === 'suspended' ? 'badge-cancelled' : 'badge-completed'}`}>
                      {profileModalUser.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                    {profileModalUser.emailVerified ? (
                      <span style={{ fontSize: '0.74rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <CheckCircle2 size={12} /> Email Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.74rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <AlertCircle size={12} /> Email Pending
                      </span>
                    )}
                    {profileModalUser.role === 'provider' && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: profileModalUser.providerDetails?.isVerified ? '#dcfce7' : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: profileModalUser.providerDetails?.isVerified ? '#166534' : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? '#991b1b' : '#92400e',
                        border: `1px solid ${profileModalUser.providerDetails?.isVerified ? '#86efac' : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? '#fca5a5' : '#fde68a'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {profileModalUser.providerDetails?.isVerified ? <CheckCircle2 size={12} /> : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? <ShieldAlert size={12} /> : <AlertCircle size={12} />}
                        {profileModalUser.providerDetails?.isVerified ? 'Verified Pro' : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? 'Rejected' : 'Pending Verification'}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {profileModalUser.email} {profileModalUser.phoneNumber ? `• ${profileModalUser.phoneNumber}` : ''} • Registered {new Date(profileModalUser.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {profileLoading && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary-600)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <RefreshCw size={13} className="animate-spin" /> Fetching live data...
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCloseProfileModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    borderRadius: '6px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close inspection"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2. Sub-tab Bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
              padding: '0 1.5rem',
              overflowX: 'auto',
              gap: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setProfileModalTab('overview')}
                style={{
                  padding: '0.75rem 0.9rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: profileModalTab === 'overview' ? 700 : 500,
                  color: profileModalTab === 'overview' ? 'var(--primary-600)' : 'var(--color-text-muted)',
                  borderBottom: `2px solid ${profileModalTab === 'overview' ? 'var(--primary-600)' : 'transparent'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Briefcase size={14} />
                <span>Profile & Stats</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileModalTab('bookings')}
                style={{
                  padding: '0.75rem 0.9rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: profileModalTab === 'bookings' ? 700 : 500,
                  color: profileModalTab === 'bookings' ? 'var(--primary-600)' : 'var(--color-text-muted)',
                  borderBottom: `2px solid ${profileModalTab === 'bookings' ? 'var(--primary-600)' : 'transparent'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Calendar size={14} />
                <span>Bookings ({profileModalUser.stats?.bookingCount ?? (profileModalUser.recentBookings?.length || 0)})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileModalTab('reviews')}
                style={{
                  padding: '0.75rem 0.9rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: profileModalTab === 'reviews' ? 700 : 500,
                  color: profileModalTab === 'reviews' ? 'var(--primary-600)' : 'var(--color-text-muted)',
                  borderBottom: `2px solid ${profileModalTab === 'reviews' ? 'var(--primary-600)' : 'transparent'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Star size={14} />
                <span>Reviews ({profileModalUser.stats?.reviewCount ?? (profileModalUser.recentReviews?.length || 0)})</span>
              </button>

              {profileModalUser.role === 'provider' && (
                <button
                  type="button"
                  onClick={() => setProfileModalTab('documents')}
                  style={{
                    padding: '0.75rem 0.9rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: profileModalTab === 'documents' ? 700 : 500,
                    color: profileModalTab === 'documents' ? 'var(--primary-600)' : 'var(--color-text-muted)',
                    borderBottom: `2px solid ${profileModalTab === 'documents' ? 'var(--primary-600)' : 'transparent'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <FileText size={14} />
                  <span>Documents ({profileModalUser.documents?.length || 0})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setProfileModalTab('audit')}
                style={{
                  padding: '0.75rem 0.9rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: profileModalTab === 'audit' ? 700 : 500,
                  color: profileModalTab === 'audit' ? 'var(--primary-600)' : 'var(--color-text-muted)',
                  borderBottom: `2px solid ${profileModalTab === 'audit' ? 'var(--primary-600)' : 'transparent'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <History size={14} />
                <span>Audit Logs ({profileModalUser.auditHistory?.length || 0})</span>
              </button>
            </div>

            {/* 3. Modal Body (Scrollable) */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              maxHeight: 'calc(92vh - 200px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {profileError && (
                <div className="alert-box alert-danger">
                  <AlertCircle size={15} />
                  <span>{profileError}</span>
                </div>
              )}

              {/* TAB 1: OVERVIEW & PROFILE */}
              {profileModalTab === 'overview' && (
                <>
                  {/* KPI Stat Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        Total Bookings
                      </span>
                      <h4 style={{ margin: '0.35rem 0 0', fontSize: '1.45rem', color: 'var(--color-text-title)', fontWeight: 800 }}>
                        {profileModalUser.stats?.bookingCount ?? 0}
                      </h4>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <span style={{ fontSize: '0.76rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        Completed Bookings
                      </span>
                      <h4 style={{ margin: '0.35rem 0 0', fontSize: '1.45rem', color: '#065f46', fontWeight: 800 }}>
                        {profileModalUser.stats?.completedBookings ?? 0}
                      </h4>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: '#fff1f2', border: '1px solid #fecdd3' }}>
                      <span style={{ fontSize: '0.76rem', color: '#be123c', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        Cancelled / Dropped
                      </span>
                      <h4 style={{ margin: '0.35rem 0 0', fontSize: '1.45rem', color: '#9f1239', fontWeight: 800 }}>
                        {profileModalUser.stats?.cancelledBookings ?? 0}
                      </h4>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '0.76rem', color: '#1d4ed8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        {profileModalUser.role === 'provider' ? 'Total Revenue' : 'Total Spent'}
                      </span>
                      <h4 style={{ margin: '0.35rem 0 0', fontSize: '1.45rem', color: '#1e40af', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                        ₹{Number(profileModalUser.stats?.totalRevenue || 0).toLocaleString('en-IN')}
                      </h4>
                    </div>
                  </div>

                  {/* Account Information Card */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-card)'
                  }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-title)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={16} style={{ color: 'var(--primary-600)' }} />
                      Account Identity & Registration
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Full Legal Name</span>
                        <strong style={{ color: 'var(--color-text-title)' }}>{profileModalUser.name}</strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Email Address</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-title)' }}>{profileModalUser.email}</span>
                          {profileModalUser.emailVerified && <CheckCircle2 size={13} style={{ color: '#16a34a' }} />}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Contact Phone</span>
                        <span style={{ color: 'var(--color-text-title)' }}>{profileModalUser.phoneNumber || 'Not provided'}</span>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Registered Operating City</span>
                        <span style={{ color: 'var(--color-text-title)' }}>{profileModalUser.cityName || profileModalUser.city || 'Sangli'}</span>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Account Status</span>
                        <span className={`badge ${profileModalUser.status === 'suspended' ? 'badge-cancelled' : 'badge-completed'}`}>
                          {profileModalUser.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Database Entity ID</span>
                        <code style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {profileModalUser._id}
                        </code>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Terms Accepted</span>
                        <span style={{ color: 'var(--color-text-body)' }}>
                          {profileModalUser.termsAccepted ? (profileModalUser.termsAcceptedAt ? new Date(profileModalUser.termsAcceptedAt).toLocaleString('en-IN') : 'Yes') : 'No'}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Account Created On</span>
                        <span style={{ color: 'var(--color-text-body)' }}>
                          {profileModalUser.createdAt ? new Date(profileModalUser.createdAt).toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* If Provider: Professional Details Card */}
                  {profileModalUser.role === 'provider' && (
                    <div style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-card)'
                    }}>
                      <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-title)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Briefcase size={16} style={{ color: 'var(--primary-600)' }} />
                        Professional Provider Credentials & Trade Details
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', fontSize: '0.88rem' }}>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Primary Trade / Category</span>
                          <strong style={{ color: 'var(--primary-700)' }}>
                            {profileModalUser.providerDetails?.category || profileModalUser.providerDetails?.title || 'General Services'}
                          </strong>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Years of Experience</span>
                          <span style={{ color: 'var(--color-text-title)', fontWeight: 600 }}>
                            {profileModalUser.providerDetails?.experienceYears || 0} Years
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Service Area / Neighborhoods</span>
                          <span style={{ color: 'var(--color-text-title)' }}>
                            {profileModalUser.providerDetails?.serviceArea || 'City-wide coverage'}
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Pricing Structure</span>
                          <span style={{ color: 'var(--color-text-title)', fontWeight: 600 }}>
                            Starting at ₹{profileModalUser.providerDetails?.startingPrice || 0} • ₹{profileModalUser.providerDetails?.hourlyRate || 0}/hr
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Working Availability Status</span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: profileModalUser.providerDetails?.isAvailable !== false ? '#ecfdf5' : '#f1f5f9',
                            color: profileModalUser.providerDetails?.isAvailable !== false ? '#047857' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: profileModalUser.providerDetails?.isAvailable !== false ? '#10b981' : '#94a3b8'
                            }} />
                            {profileModalUser.providerDetails?.isAvailable !== false ? 'Taking Jobs (Online)' : 'Unavailable (Offline)'}
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Expected Response Time</span>
                          <span style={{ color: 'var(--color-text-title)' }}>
                            {profileModalUser.providerDetails?.responseTime || 'Within 1 hour'}
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Customer Rating</span>
                          <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Star size={13} fill="#d97706" />
                            {profileModalUser.providerDetails?.rating ? `${profileModalUser.providerDetails.rating} / 5` : 'No rating yet'}
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                              ({profileModalUser.providerDetails?.reviewCount || 0} reviews)
                            </span>
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem' }}>Verification State</span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: profileModalUser.providerDetails?.isVerified ? '#166534' : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? '#991b1b' : '#92400e'
                          }}>
                            {profileModalUser.providerDetails?.isVerified ? 'Approved & Badge Active' : profileModalUser.providerDetails?.verificationStatus === 'rejected' ? 'Application Rejected' : 'Under Review'}
                          </span>
                        </div>
                      </div>

                      {/* Bio */}
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Professional Bio</span>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
                          {profileModalUser.providerDetails?.bio || 'No professional bio provided yet.'}
                        </p>
                      </div>

                      {/* Services Offered Chips */}
                      {Array.isArray(profileModalUser.providerDetails?.servicesOffered) && profileModalUser.providerDetails.servicesOffered.length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.78rem', marginBottom: '0.4rem' }}>Services Offered</span>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {profileModalUser.providerDetails.servicesOffered.map((svc, sIdx) => (
                              <span key={sIdx} style={{ fontSize: '0.78rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                                {svc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verification Audit Details if recorded */}
                      {(profileModalUser.providerDetails?.verifiedAt || profileModalUser.providerDetails?.verificationNotes || profileModalUser.providerDetails?.rejectionReason) && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text-title)', display: 'block', marginBottom: '0.25rem' }}>
                            Administrative Verification Record:
                          </span>
                          {profileModalUser.providerDetails.verifiedAt && (
                            <div>Verified Date: {new Date(profileModalUser.providerDetails.verifiedAt).toLocaleString('en-IN')}</div>
                          )}
                          {profileModalUser.providerDetails.verificationNotes && (
                            <div>Notes: {profileModalUser.providerDetails.verificationNotes}</div>
                          )}
                          {profileModalUser.providerDetails.rejectionReason && (
                            <div style={{ color: '#dc2626' }}>Rejection Reason: {profileModalUser.providerDetails.rejectionReason}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: BOOKINGS LEDGER */}
              {profileModalTab === 'bookings' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-title)', fontWeight: 700 }}>
                    Recent Service Appointments ({profileModalUser.recentBookings?.length || 0})
                  </h4>

                  {!profileModalUser.recentBookings || profileModalUser.recentBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                      <Calendar size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                      <p style={{ margin: 0 }}>No bookings recorded for this user.</p>
                    </div>
                  ) : (
                    <div className="table-responsive-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Service & Category</th>
                            <th>{profileModalUser.role === 'customer' ? 'Service Provider' : 'Customer'}</th>
                            <th>Schedule Date</th>
                            <th>City / Address</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileModalUser.recentBookings.map((bk) => {
                            const counterparty = profileModalUser.role === 'customer' ? bk.provider : bk.customer;
                            return (
                              <tr key={bk._id}>
                                <td>
                                  <strong style={{ color: 'var(--color-text-title)', display: 'block' }}>{bk.serviceTitle || bk.category}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{bk.category}</span>
                                </td>
                                <td>
                                  <span style={{ color: 'var(--color-text-body)', fontWeight: 600 }}>{counterparty?.name || 'User'}</span>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{counterparty?.email}</div>
                                </td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                  {bk.scheduledDate ? new Date(bk.scheduledDate).toLocaleDateString('en-IN') : '—'} {bk.scheduledTime ? `at ${bk.scheduledTime}` : ''}
                                </td>
                                <td style={{ fontSize: '0.82rem' }}>
                                  <div>{bk.city || '—'}</div>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{bk.address || '—'}</span>
                                </td>
                                <td style={{ fontWeight: 700, color: 'var(--color-text-title)' }}>
                                  ₹{bk.price || bk.totalAmount || 0}
                                </td>
                                <td>
                                  <span className={`badge ${
                                    bk.status === 'completed' ? 'badge-completed' :
                                    bk.status === 'accepted' ? 'badge-accepted' :
                                    bk.status === 'pending' ? 'badge-pending' : 'badge-cancelled'
                                  }`} style={{ textTransform: 'capitalize' }}>
                                    {bk.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REVIEWS & FEEDBACK */}
              {profileModalTab === 'reviews' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-title)', fontWeight: 700 }}>
                    Reviews & Feedback Ledger ({profileModalUser.recentReviews?.length || 0})
                  </h4>

                  {!profileModalUser.recentReviews || profileModalUser.recentReviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                      <Star size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                      <p style={{ margin: 0 }}>No reviews recorded for this user yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {profileModalUser.recentReviews.map((rev) => {
                        const otherParty = profileModalUser.role === 'customer' ? rev.provider : rev.customer;
                        return (
                          <div key={rev._id} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={14} fill={i < rev.rating ? '#f59e0b' : 'none'} color={i < rev.rating ? '#f59e0b' : '#cbd5e1'} />
                                ))}
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', marginLeft: '0.25rem' }}>{rev.rating}/5</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>

                            <p style={{ margin: '0.25rem 0', fontSize: '0.86rem', color: 'var(--color-text-body)' }}>
                              "{rev.comment}"
                            </p>

                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                              {profileModalUser.role === 'customer' ? 'Reviewed Provider' : 'Reviewed by'}: <strong>{otherParty?.name || 'User'}</strong>
                              {rev.booking?.serviceTitle ? ` • Service: ${rev.booking.serviceTitle}` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: VERIFICATION DOCUMENTS (PROVIDER ONLY) */}
              {profileModalTab === 'documents' && profileModalUser.role === 'provider' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-title)', fontWeight: 700 }}>
                    Uploaded Verification Documents ({profileModalUser.documents?.length || 0})
                  </h4>

                  {!profileModalUser.documents || profileModalUser.documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                      <FileText size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                      <p style={{ margin: 0 }}>No verification documents uploaded by this provider.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {profileModalUser.documents.map((doc) => {
                        const typeNames = {
                          id_proof: 'Government ID Proof',
                          trade_license: 'Trade License / Business Registration',
                          address_proof: 'Address Proof',
                          certification: 'Skill Certification',
                          other: 'Other Credential'
                        };
                        return (
                          <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ color: 'var(--color-text-title)', fontSize: '0.9rem' }}>
                                  {typeNames[doc.documentType] || doc.documentType}
                                </strong>
                                <span className={`badge ${doc.status === 'approved' ? 'badge-completed' : doc.status === 'rejected' ? 'badge-cancelled' : 'badge-pending'}`}>
                                  {doc.status}
                                </span>
                              </div>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', display: 'block', marginTop: '0.2rem' }}>
                                {doc.originalFilename} • {formatFileSize(doc.fileSize)} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleViewAdminDocument(doc._id)}
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                            >
                              <ExternalLink size={13} />
                              <span>Inspect Document</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: AUDIT LOGS */}
              {profileModalTab === 'audit' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-title)', fontWeight: 700 }}>
                    Administrative Audit Events ({profileModalUser.auditHistory?.length || 0})
                  </h4>

                  {!profileModalUser.auditHistory || profileModalUser.auditHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                      <History size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                      <p style={{ margin: 0 }}>No administrative actions recorded for this account.</p>
                    </div>
                  ) : (
                    <div className="table-responsive-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Action Type</th>
                            <th>Reason / Notes</th>
                            <th>Admin Actor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileModalUser.auditHistory.map((item) => (
                            <tr key={item._id}>
                              <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                {new Date(item.createdAt).toLocaleString('en-IN')}
                              </td>
                              <td>
                                <code style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                                  {item.action}
                                </code>
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>
                                {item.reason || item.notes || '—'}
                              </td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                {item.adminName || item.adminEmail || item.adminId || 'System'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Footer */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                <span>
                  <strong>Read-Only Inspection:</strong> You are viewing the complete account profile. In the next step, we will configure which fields can be edited by administrators.
                </span>
              </div>
              <Button variant="outline" onClick={handleCloseProfileModal}>
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: USER SUSPENSION / REACTIVATION CONFIRMATION
          ======================================================== */}
      {actionTargetUser && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: actionStatusType === 'suspended' ? 'var(--color-danger)' : 'var(--color-success)' }}>
              <ShieldAlert size={22} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)' }}>
                Confirm Account {actionStatusType === 'suspended' ? 'Suspension' : 'Reactivation'}
              </h3>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {actionStatusType === 'suspended'
                ? `Are you sure you want to suspend access for ${actionTargetUser.name} (${actionTargetUser.email})? Suspended users are immediately denied access across all platform APIs.`
                : `Reactivate platform access for ${actionTargetUser.name}? The user will regain ability to sign in and use services.`}
            </p>

            {actionMessage && (
              <div className={`alert-box alert-${actionMessage.type}`} style={{ marginBottom: '1.25rem' }}>
                <span>{actionMessage.text}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Administrative Reason (Recorded to Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Terms violation, account verification resolved..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" disabled={actionSubmitting} onClick={() => setActionTargetUser(null)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={handleUpdateUserStatus}
                className="btn btn-primary"
                style={{
                  backgroundColor: actionStatusType === 'suspended' ? 'var(--color-danger)' : 'var(--color-success)',
                  borderColor: actionStatusType === 'suspended' ? 'var(--color-danger)' : 'var(--color-success)'
                }}
              >
                {actionSubmitting ? 'Executing...' : `Confirm ${actionStatusType === 'suspended' ? 'Suspension' : 'Reactivation'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: USER DELETION CONFIRMATION
          ======================================================== */}
      {deleteTargetUser && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--color-danger)' }}>
              <Trash2 size={22} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)' }}>
                Confirm Permanent User Deletion
              </h3>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete the account for <strong>{deleteTargetUser.name}</strong> ({deleteTargetUser.email})? This action cannot be undone. All active sessions will be terminated immediately.
            </p>

            {deleteMessage && (
              <div className={`alert-box alert-${deleteMessage.type === 'error' ? 'danger' : deleteMessage.type}`} style={{ marginBottom: '1.25rem' }}>
                <span>{deleteMessage.text}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Reason for Deletion (Recorded in Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Terms violation, requested account removal..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="form-control"
                disabled={deleteSubmitting}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" disabled={deleteSubmitting} onClick={() => setDeleteTargetUser(null)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteUser}
                className="btn btn-primary"
                style={{
                  backgroundColor: 'var(--color-danger)',
                  borderColor: 'var(--color-danger)',
                  color: '#ffffff'
                }}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PROVIDER VERIFICATION ACTION
          ======================================================== */}
      {verifyTarget && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: verifyDecision ? '#16a34a' : '#dc2626' }}>
              <UserCheck size={22} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)' }}>
                {verifyDecision ? 'Approve Provider Credentials' : 'Reject / Revoke Application'}
              </h3>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {verifyDecision
                ? `Review submitted credentials for ${verifyTarget.name} (${verifyTarget.providerDetails?.title || verifyTarget.providerDetails?.category || 'Provider'}). Approval enables customer bookings.`
                : `Reject verification application or revoke credentials for ${verifyTarget.name}. The provider will not appear in customer searches or receive bookings.`}
            </p>

            {/* Document Review Subsection */}
            <div style={{ marginBottom: '1.25rem', backgroundColor: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-text-title)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={15} style={{ color: 'var(--primary-600)' }} />
                  Verification Documents ({verifyDocs.length})
                </strong>
                {verifyDocsLoading && (
                  <RefreshCw size={13} className="spin-animation" style={{ color: 'var(--primary-600)' }} />
                )}
              </div>

              {verifyDocsLoading ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>Loading provider documents...</p>
              ) : verifyDocs.length === 0 ? (
                <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7', color: '#92400e', fontSize: '0.82rem' }}>
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  <strong>No documents uploaded.</strong> Platform security policy strictly requires at least one uploaded document before an SP can be approved.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {verifyDocs.map(doc => {
                    const docId = doc._id || doc.id;
                    const typeNames = {
                      id_proof: 'Government Photo ID',
                      trade_license: 'Trade License',
                      address_proof: 'Address Proof',
                      certification: 'Skill Certification',
                      other: 'Other Credential'
                    };
                    return (
                      <div key={docId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg-card)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-title)', display: 'block' }}>
                            {typeNames[doc.documentType] || doc.documentType}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {doc.originalFilename} • {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewAdminDocument(docId)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          View Document
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {verifyMessage && (
              <div className={`alert-box alert-${verifyMessage.type}`} style={{ marginBottom: '1.25rem' }}>
                <span>{verifyMessage.text}</span>
              </div>
            )}

            {!verifyDecision && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Incomplete documentation, unreadable photo ID, expired license..."
                  value={verifyRejectionReason}
                  onChange={(e) => setVerifyRejectionReason(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Verification Audit Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Valid trade certification verified against state registry..."
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" disabled={verifySubmitting} onClick={() => setVerifyTarget(null)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={verifySubmitting || (verifyDecision && verifyDocs.length === 0)}
                onClick={handleVerifyProvider}
                className="btn btn-primary"
                style={{
                  backgroundColor: verifyDecision ? (verifyDocs.length === 0 ? '#9ca3af' : '#16a34a') : '#dc2626',
                  borderColor: verifyDecision ? (verifyDocs.length === 0 ? '#9ca3af' : '#16a34a') : '#dc2626',
                  cursor: (verifyDecision && verifyDocs.length === 0) ? 'not-allowed' : 'pointer'
                }}
                title={verifyDecision && verifyDocs.length === 0 ? 'Cannot approve provider without at least one uploaded verification document' : ''}
              >
                {verifySubmitting ? 'Recording...' : verifyDecision ? 'Approve & Verify' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REVIEW MODERATION ACTION
          ======================================================== */}
      {modTargetReview && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: modStatus === 'hidden' ? '#dc2626' : '#16a34a' }}>
              <Star size={22} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)' }}>
                {modStatus === 'hidden' ? 'Hide Inappropriate Review' : 'Restore Review Visibility'}
              </h3>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {modStatus === 'hidden'
                ? `Hiding this review will remove it from public view and automatically recalculate the provider's live average rating. The original review record is preserved for audit history.`
                : `Restoring this review will make it visible to clients again and include its rating in the provider's score calculation.`}
            </p>

            {modMessage && (
              <div className={`alert-box alert-${modMessage.type}`} style={{ marginBottom: '1.25rem' }}>
                <span>{modMessage.text}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Moderation Reason (Required for Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Abusive language, unverified competitor harassment..."
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="dismiss-reports-chk"
                checked={modDismissReports}
                onChange={(e) => setModDismissReports(e.target.checked)}
              />
              <label htmlFor="dismiss-reports-chk" style={{ fontSize: '0.85rem', color: 'var(--color-text-body)', cursor: 'pointer' }}>
                Mark pending user reports as resolved / dismissed
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" disabled={modSubmitting} onClick={() => setModTargetReview(null)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={modSubmitting}
                onClick={handleModerateReview}
                className="btn btn-primary"
                style={{
                  backgroundColor: modStatus === 'hidden' ? 'var(--color-danger)' : '#16a34a',
                  borderColor: modStatus === 'hidden' ? 'var(--color-danger)' : '#16a34a'
                }}
              >
                {modSubmitting ? 'Saving...' : modStatus === 'hidden' ? 'Hide Review' : 'Restore Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT BOOKING MESSAGE / NOTES
          ======================================================== */}
      {editingBooking && (
        <div
          className="modal-backdrop"
          onClick={() => !bookingEditSubmitting && setEditingBooking(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '1.75rem',
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Edit3 size={18} style={{ color: 'var(--primary-600)' }} />
                  Edit Customer Booking Message
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {editingBooking.serviceName} • Customer: {editingBooking.customer?.name || 'Customer'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !bookingEditSubmitting && setEditingBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: '0.75rem',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              lineHeight: 1.4
            }}>
              <strong>Security & Moderation Notice:</strong> Redact direct phone numbers, external payment credentials (UPI/cards), or inappropriate content entered by the customer.
            </div>

            {bookingEditError && (
              <div className="alert-box alert-danger" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={14} />
                <span>{bookingEditError}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Customer Booking Message / Instructions
              </label>
              <textarea
                rows={4}
                value={bookingMessageText}
                onChange={(e) => setBookingMessageText(e.target.value)}
                placeholder="Enter moderated customer instructions (leave empty if removing sensitive text completely)..."
                className="form-control"
                style={{ width: '100%', resize: 'vertical', fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Administrative Reason (Documented in Audit Trail)
              </label>
              <input
                type="text"
                value={bookingEditReason}
                onChange={(e) => setBookingEditReason(e.target.value)}
                placeholder="e.g. Redacted external phone number and payment handle"
                className="form-control"
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" disabled={bookingEditSubmitting} onClick={() => setEditingBooking(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={bookingEditSubmitting}
                onClick={handleSaveBookingMessage}
              >
                {bookingEditSubmitting ? 'Saving...' : 'Save Moderated Message'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DELETE BOOKING CONFIRMATION
          ======================================================== */}
      {deletingBooking && (
        <div
          className="modal-backdrop"
          onClick={() => !bookingDeleteSubmitting && setDeletingBooking(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid #fecdd3',
              boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#991b1b', fontWeight: 800 }}>
                    Cancel / Delete Booking Appointment
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Administrative cancellation with participant notification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !bookingDeleteSubmitting && setDeletingBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: '0.85rem',
              borderRadius: '6px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              color: '#9f1239'
            }}>
              <strong>Notice:</strong> You are about to cancel booking <strong>"{deletingBooking.serviceName}"</strong> for customer <strong>{deletingBooking.customer?.name || 'Customer'}</strong> scheduled on <strong>{deletingBooking.bookingDate}</strong>. Both the customer and technician will be notified immediately, and historical records will be preserved.
            </div>

            {bookingDeleteError && (
              <div className="alert-box alert-danger" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={14} />
                <span>{bookingDeleteError}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Reason for Permanent Deletion <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={bookingDeleteReason}
                onChange={(e) => setBookingDeleteReason(e.target.value)}
                placeholder="e.g. Dangerous content, fraudulent booking request, scam attempt"
                className="form-control"
                style={{ width: '100%', fontSize: '0.85rem' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" disabled={bookingDeleteSubmitting} onClick={() => setDeletingBooking(null)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={bookingDeleteSubmitting || !bookingDeleteReason.trim()}
                onClick={handleConfirmDeleteBooking}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  cursor: (!bookingDeleteReason.trim() || bookingDeleteSubmitting) ? 'not-allowed' : 'pointer'
                }}
              >
                {bookingDeleteSubmitting ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
