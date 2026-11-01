import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Phone, 
  User, 
  ArrowRight,
  Loader2,
  FileText,
  MessageSquare,
  Star
} from 'lucide-react';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import BookingChatModal from '../components/chat/BookingChatModal';
import BookingMapModal from '../components/map/BookingMapModal';
import { useAuth } from '../context/AuthContext';
import { getCityDisplayName } from '../data/cities';
import { bookingApi, reviewApi, getAvatarUrl } from '../services/api';
import { connectSocket } from '../services/socket';

/**
 * Status Badge Helpers
 */
const getStatusBadge = (status, booking = null, currentUserId = null) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending Confirmation',
        className: 'badge-pending'
      };
    case 'accepted':
      return {
        label: 'Confirmed',
        className: 'badge-accepted'
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'badge-in-progress'
      };
    case 'completed':
      return {
        label: 'Completed',
        className: 'badge-completed'
      };
    case 'cancelled': {
      const isCancelledByMe = booking?.cancelledBy && currentUserId && (
        String(booking.cancelledBy) === String(currentUserId) ||
        String(booking.cancelledBy?._id) === String(currentUserId)
      );
      return {
        label: isCancelledByMe ? 'Cancelled by You' : 'Cancelled',
        className: 'badge-cancelled'
      };
    }
    case 'rejected':
      return {
        label: 'Declined by Technician',
        className: 'badge-rejected'
      };
    default:
      return {
        label: status || 'Unknown',
        className: 'badge-muted'
      };
  }
};

/**
 * Customer Bookings Page (/customer/bookings)
 */
export default function CustomerBookings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'accepted' | 'completed' | 'cancelled'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation modal state
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Review modal state & customer reviews cache
  const [myReviews, setMyReviews] = useState({});
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [viewingReview, setViewingReview] = useState(null);

  // Booking chat modal state & URL deep-linking
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChatBookingId = searchParams.get('chatBookingId');
  const urlMapBookingId = searchParams.get('mapBookingId');
  const legacyBookingId = searchParams.get('bookingId');
  const [activeChatBooking, setActiveChatBooking] = useState(null);
  const [activeMapBooking, setActiveMapBooking] = useState(null);

  // Auto-open chat modal if query parameter specifies booking ID
  useEffect(() => {
    const targetId = urlChatBookingId || (!urlMapBookingId ? legacyBookingId : null);
    if (targetId && bookings.length > 0) {
      const target = bookings.find((b) => String(b._id) === String(targetId));
      if (target) {
        setActiveChatBooking(target);
      }
    }
  }, [urlChatBookingId, legacyBookingId, urlMapBookingId, bookings]);

  // Auto-open map modal if query parameter specifies map booking ID
  useEffect(() => {
    const targetMapId = urlMapBookingId || (legacyBookingId && !urlChatBookingId ? legacyBookingId : null);
    if (targetMapId && bookings.length > 0) {
      const target = bookings.find((b) => String(b._id) === String(targetMapId));
      if (target) {
        setActiveMapBooking(target);
      }
    }
  }, [urlMapBookingId, legacyBookingId, urlChatBookingId, bookings]);

  const handleCloseChat = () => {
    setActiveChatBooking(null);
    if (urlChatBookingId || legacyBookingId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('chatBookingId');
      nextParams.delete('bookingId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleCloseMap = () => {
    setActiveMapBooking(null);
    if (urlMapBookingId || legacyBookingId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('mapBookingId');
      nextParams.delete('bookingId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const userCityDisplay = user?.city ? getCityDisplayName(user.city) : 'Sangli';

  // Fetch customer's submitted reviews
  const fetchReviews = async () => {
    try {
      const res = await reviewApi.getMyReviews();
      if (res.success && Array.isArray(res.reviews)) {
        const map = {};
        res.reviews.forEach(r => {
          const bId = r.booking?._id || r.booking;
          if (bId) map[String(bId)] = r;
        });
        setMyReviews(map);
      }
    } catch (err) {
      console.warn('Could not load customer reviews:', err.message);
    }
  };

  // Fetch bookings from server
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getMyBookings();
      if (res.success && Array.isArray(res.bookings)) {
        setBookings(res.bookings);
      } else {
        setError(res.error || 'Failed to load service bookings.');
      }
    } catch (err) {
      setError(err.message || 'Network error while fetching bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchReviews();
  }, []);

  // Real-time booking status updates via Socket.IO
  useEffect(() => {
    const socket = connectSocket();
    const handleStatusUpdate = ({ bookingId, status, completedAt, booking }) => {
      setBookings(prev =>
        prev.map(b => (b._id === bookingId ? { ...b, status, completedAt: completedAt || booking?.completedAt || b.completedAt, ...(booking || {}) } : b))
      );
    };

    socket.on('booking_status_updated', handleStatusUpdate);

    return () => {
      socket.off('booking_status_updated', handleStatusUpdate);
    };
  }, []);

  // Handle Review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewingBooking) return;
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Please select a rating between 1 and 5 stars.');
      return;
    }
    setIsSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      const res = await reviewApi.createReview({
        bookingId: reviewingBooking._id,
        rating: reviewRating,
        comment: reviewComment
      });

      if (res.success && res.review) {
        setReviewSuccess('Review submitted successfully! Thank you for rating the service.');
        setMyReviews(prev => ({
          ...prev,
          [String(reviewingBooking._id)]: res.review
        }));
        setTimeout(() => {
          setReviewingBooking(null);
          setReviewSuccess(null);
        }, 1500);
      } else {
        setReviewError(res.error || 'Failed to submit review.');
      }
    } catch (err) {
      setReviewError(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Cancellation submission
  const handleConfirmCancel = async () => {
    if (!cancellingId) return;
    setIsCancelling(true);
    setActionError(null);

    try {
      const res = await bookingApi.cancelBooking(cancellingId, cancelReason);
      if (res.success && res.booking) {
        // Update local state with the returned updated booking
        setBookings(prev => prev.map(b => (b._id === cancellingId ? res.booking : b)));
        setCancellingId(null);
        setCancelReason('');
      } else {
        setActionError(res.error || 'Could not cancel booking.');
      }
    } catch (err) {
      setActionError(err.message || 'Error executing cancellation.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter bookings based on activeTab (Consolidated Option A)
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status);
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return ['cancelled', 'rejected'].includes(b.status);
    // Legacy direct fallbacks
    if (activeTab === 'pending') return b.status === 'pending';
    if (activeTab === 'accepted') return b.status === 'accepted';
    if (activeTab === 'in_progress') return b.status === 'in_progress';
    if (activeTab === 'rejected') return b.status === 'rejected';
    return true;
  });

  return (
    <DashboardLayout
      title="Service Bookings"
      subtitle="Track and manage your appointments"
    >
      <div className="customer-bookings-content">

        {/* Global Feedback Banner */}
        {actionError && (
          <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Header toolbar with refresh button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'all', label: `All (${bookings.length})` },
              { id: 'active', label: `Active (${bookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status)).length})` },
              { id: 'completed', label: `Completed (${bookings.filter(b => b.status === 'completed').length})` },
              { id: 'cancelled', label: `Cancelled (${bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0.6rem 1rem',
                  fontSize: '0.88rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--primary-700)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary-600)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchBookings}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              Loading your service appointments...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={36} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', marginBottom: '0.5rem' }}>
              Unable to Load Bookings
            </h3>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.92rem' }}>
              {error}
            </p>
            <Button variant="primary" onClick={fetchBookings}>
              <RefreshCw size={16} /> Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBookings.length === 0 && (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Calendar size={28} />
            </div>

            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-text-title)', marginBottom: '0.5rem' }}>
              {activeTab === 'all' ? 'No Service Bookings Found' : `No ${activeTab} bookings`}
            </h3>

            <p style={{ color: 'var(--color-text-muted)', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {activeTab === 'all'
                ? `You haven't requested any home repair visits in ${userCityDisplay} yet. Discover verified technicians and book doorstep service.`
                : `You currently have no appointments categorized under "${activeTab}".`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Button to="/services" variant="primary">
                <Search size={16} /> Discover Services in {userCityDisplay}
              </Button>
            </div>
          </div>
        )}

        {/* Bookings List Grid */}
        {!loading && !error && filteredBookings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredBookings.map((b) => {
              const statusBadge = getStatusBadge(b.status, b, user?._id);
              const providerObj = b.provider || {};
              const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';
              const canCancel = ['pending', 'accepted', 'in_progress'].includes(b.status);

              return (
                <article
                  key={b._id}
                  id={`booking-card-${b._id}`}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'box-shadow 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {/* Provider Info & Service Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img
                        src={getAvatarUrl(providerObj.avatar || providerObj.providerDetails?.avatar) || defaultAvatar}
                        alt={providerObj.name || 'Technician'}
                        style={{
                          width: '3.25rem',
                          height: '3.25rem',
                          borderRadius: 'var(--radius-lg)',
                          objectFit: 'cover',
                          border: '2px solid var(--primary-100)'
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultAvatar;
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-title)' }}>
                            {b.serviceName}
                          </h4>
                          {b.category && (
                            <span style={{ fontSize: 'var(--font-size-xs, 0.76rem)', backgroundColor: 'var(--color-bg-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)', color: 'var(--color-text-muted)', fontWeight: 600, border: '1px solid var(--color-border)' }}>
                              {b.category}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm, 0.88rem)', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                          Technician: <strong style={{ color: 'var(--color-text-body)' }}>{providerObj.name || 'Assigned Technician'}</strong>
                          {providerObj.phoneNumber && (
                            <span style={{ marginLeft: '0.75rem', color: 'var(--primary-700)' }}>
                              <Phone size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                              {providerObj.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`badge ${statusBadge.className}`} style={{
                      padding: '0.3rem 0.8rem',
                      fontSize: 'var(--font-size-xs, 0.78rem)',
                      fontWeight: 700
                    }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor'
                      }} />
                      {statusBadge.label}
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    fontSize: '0.88rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Scheduled Date & Time
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-title)', fontWeight: 600, marginTop: '0.2rem' }}>
                        <Calendar size={15} style={{ color: 'var(--primary-600)' }} />
                        <span>{b.bookingDate}</span>
                        <Clock size={15} style={{ color: 'var(--primary-600)', marginLeft: '0.35rem' }} />
                        <span>{b.bookingTime}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Service Address
                      </span>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--color-text-body)', marginTop: '0.2rem' }}>
                        <MapPin size={15} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '2px' }} />
                        <span>{b.serviceAddress}, {b.cityName || getCityDisplayName(b.city)}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Visit / Quoted Price
                      </span>
                      <div style={{ marginTop: '0.2rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary-700)' }}>
                        {b.price && Number(b.price) > 0 ? `₹${b.price}` : 'On Inspection Quote'}
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>
                          (Pay on site)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Optional Customer Description or Rejection Reason */}
                  {b.description && (
                    <div style={{
                      backgroundColor: 'var(--color-bg-subtle)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-body)',
                      marginBottom: '1rem',
                      border: '1px solid var(--color-border)'
                    }}>
                      <strong>Special Instructions:</strong> "{b.description}"
                    </div>
                  )}

                  {/* Technician Declined Indicator */}
                  {b.status === 'rejected' && (
                    <div style={{
                      backgroundColor: 'var(--color-danger-bg, #fef2f2)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md, 8px)',
                      fontSize: '0.86rem',
                      color: 'var(--color-danger, #b91c1c)',
                      marginBottom: '1rem',
                      border: '1px solid var(--color-border, #fecaca)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem'
                    }}>
                      <XCircle size={17} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Declined by Technician</strong>
                        {b.rejectionReason ? (
                          <span> — Reason: "{b.rejectionReason}"</span>
                        ) : (
                          <span style={{ opacity: 0.9 }}> — The technician was unavailable to accept this appointment.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cancelled Indicator (Distinguishes between user vs technician cancellation) */}
                  {b.status === 'cancelled' && (
                    <div style={{
                      backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md, 8px)',
                      fontSize: '0.86rem',
                      color: 'var(--color-text-body, #334155)',
                      marginBottom: '1rem',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem'
                    }}>
                      <AlertCircle size={17} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                      <div>
                        <strong>
                          {b.cancelledBy && user?._id && (String(b.cancelledBy) === String(user._id) || String(b.cancelledBy?._id) === String(user._id))
                            ? 'Cancelled by You'
                            : 'Appointment Cancelled'}
                        </strong>
                        {b.cancellationReason && (
                          <span style={{ color: 'var(--color-text-muted)' }}> — Note: "{b.cancellationReason}"</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Technician Arrival Verification OTP Display (Customer Only) */}
                  {b.status === 'accepted' && b.arrivalOtp && !b.arrivalOtpVerified && !b.arrivedAt && (
                    <div
                      id={`arrival-otp-card-${b._id}`}
                      style={{
                        backgroundColor: 'var(--color-success-bg)',
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--primary-600)',
                        marginBottom: '1rem',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.92rem' }}>
                          <ShieldCheck size={18} style={{ color: 'var(--primary-600)' }} />
                          <span>Technician Arrival Verification Code</span>
                        </div>
                        <span className="badge badge-completed" style={{ fontSize: '0.75rem' }}>
                          Share only after arrival
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                        <div
                          id={`arrival-otp-code-${b._id}`}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '1.65rem',
                            fontWeight: 800,
                            letterSpacing: '0.35em',
                            color: 'var(--primary-600)',
                            backgroundColor: 'var(--color-bg-card)',
                            padding: '0.4rem 1.1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px dashed var(--primary-600)',
                            display: 'inline-block'
                          }}
                        >
                          {b.arrivalOtp}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-body)', maxWidth: '440px', lineHeight: 1.45 }}>
                          Please share this 6-digit code with the technician <strong>only after they arrive</strong> at your location to confirm arrival.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Technician Arrival Confirmed Banner */}
                  {(b.arrivalOtpVerified || b.arrivedAt) && b.status !== 'completed' && (
                    <div
                      id={`arrival-verified-banner-${b._id}`}
                      style={{
                        backgroundColor: 'var(--color-success-bg)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                        color: 'var(--color-success)',
                        marginBottom: '1rem',
                        border: '1px solid var(--primary-600)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <CheckCircle2 size={18} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                      <div>
                        <strong>Technician Arrival Verified</strong>
                        {b.arrivedAt && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            — technician confirmed arrival on {new Date(b.arrivedAt).toLocaleDateString()} at {new Date(b.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Service Completed Banner */}
                  {b.status === 'completed' && (
                    <div
                      id={`service-completed-banner-${b._id}`}
                      style={{
                        backgroundColor: 'var(--color-success-bg)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                        color: 'var(--color-success)',
                        marginBottom: '1rem',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                      <div>
                        <strong>Service Completed</strong>
                        {b.completedAt && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: 'var(--color-success)' }}>
                            — finished on {new Date(b.completedAt).toLocaleDateString()} at {new Date(b.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: canCancel ? 'space-between' : 'flex-end',
                    alignItems: 'center',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '0.85rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingId(b._id);
                          setCancelReason('');
                          setActionError(null);
                        }}
                        className="btn btn-outline btn-sm"
                        style={{
                          color: 'var(--color-danger)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <XCircle size={14} /> Cancel Appointment
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: canCancel ? '0' : 'auto' }}>

                      {/* Booking-based Map & Location Sharing Action */}
                      {(() => {
                        const isMapEligible = b.status === 'accepted' || b.status === 'in_progress';
                        const isCompleted = b.status === 'completed';
                        const isPending = b.status === 'pending';

                        if (isMapEligible) {
                          return (
                            <button
                              type="button"
                              id={`view-map-btn-${b._id}`}
                              onClick={() => setActiveMapBooking(b)}
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              title="View service destination and technician base location"
                            >
                              <MapPin size={14} style={{ color: 'var(--color-primary-600)' }} /> Map Location
                            </button>
                          );
                        }

                        if (isCompleted) {
                          return (
                            <button
                              type="button"
                              id={`view-map-btn-${b._id}`}
                              onClick={() => setActiveMapBooking(b)}
                              className="btn btn-outline btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                opacity: 0.7,
                                color: 'var(--color-text-muted)'
                              }}
                              title="Service completed. Precise tracking is revoked."
                            >
                              <MapPin size={14} /> Location (Ended)
                            </button>
                          );
                        }

                        if (isPending) {
                          return (
                            <button
                              type="button"
                              disabled
                              className="btn btn-outline btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                color: 'var(--color-text-muted)'
                              }}
                              title="Location sharing unlocks when technician accepts"
                            >
                              <MapPin size={14} /> Location (Pending)
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              opacity: 0.45,
                              cursor: 'not-allowed',
                              color: 'var(--color-text-muted)'
                            }}
                            title="Location sharing unavailable for cancelled or declined appointments"
                          >
                            <MapPin size={14} /> Location Inactive
                          </button>
                        );
                      })()}

                      {/* Booking-based messaging action */}
                      {(() => {
                        const isChatEligible = b.status === 'accepted' || b.status === 'in_progress';
                        const isPending = b.status === 'pending';
                        const isCompleted = b.status === 'completed';

                        if (isChatEligible) {
                          return (
                            <button
                              type="button"
                              id={`message-provider-btn-${b._id}`}
                              onClick={() => setActiveChatBooking(b)}
                              className="btn btn-primary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <MessageSquare size={14} /> Message Provider
                            </button>
                          );
                        }

                        if (isPending) {
                          return (
                            <button
                              type="button"
                              disabled
                              title="Chat messaging unlocks once the provider accepts your booking request"
                              className="btn btn-outline btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                opacity: 0.65,
                                cursor: 'not-allowed',
                                color: 'var(--color-text-muted)'
                              }}
                            >
                              <MessageSquare size={14} /> Message Provider (Unlocks when accepted)
                            </button>
                          );
                        }

                        if (isCompleted) {
                          return (
                            <button
                              type="button"
                              id={`message-history-btn-${b._id}`}
                              onClick={() => setActiveChatBooking(b)}
                              className="btn btn-outline btn-sm"
                              title="View chat history for this completed service"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <MessageSquare size={14} /> View Chat History
                            </button>
                          );
                        }

                        return (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--color-text-muted)',
                              padding: '0.3rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--color-bg-subtle)'
                            }}
                          >
                            Chat Unavailable ({b.status === 'cancelled' ? 'Cancelled' : 'Declined'})
                          </span>
                        );
                      })()}

                      {/* Review Action for Completed Bookings */}
                      {b.status === 'completed' && (
                        myReviews[b._id] ? (
                          <button
                            type="button"
                            id={`view-review-btn-${b._id}`}
                            onClick={() => setViewingReview(myReviews[b._id])}
                            className="btn btn-outline btn-sm"
                            style={{
                              color: 'var(--color-accent-gold)',
                              borderColor: 'var(--color-border)',
                              backgroundColor: 'var(--color-accent-gold-bg)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Star size={14} fill="var(--color-accent-gold)" stroke="var(--color-accent-gold)" />
                            <span>Rated {myReviews[b._id].rating}★ (View)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`rate-booking-btn-${b._id}`}
                            onClick={() => {
                              setReviewingBooking(b);
                              setReviewRating(5);
                              setHoverRating(0);
                              setReviewComment('');
                              setReviewError(null);
                              setReviewSuccess(null);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{
                              backgroundColor: '#d97706',
                              borderColor: '#d97706',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Star size={14} fill="#ffffff" stroke="#ffffff" />
                            <span>Rate & Review</span>
                          </button>
                        )
                      )}

                      {b.provider?._id && (
                        <Button
                          to={`/provider/${b.provider._id}`}
                          variant="outline"
                          size="sm"
                        >
                          View Technician
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Cancellation Confirmation Dialog Modal */}
        {cancellingId && (
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
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '460px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
                <AlertCircle size={22} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)' }}>
                  Cancel Appointment?
                </h3>
              </div>

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Are you sure you want to cancel this service visit? The technician will be notified immediately.
              </p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Reason for Cancellation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule conflict, problem resolved..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button
                  variant="outline"
                  disabled={isCancelling}
                  onClick={() => setCancellingId(null)}
                >
                  Keep Booking
                </Button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="btn btn-danger"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Submission Dialog Modal */}
        {reviewingBooking && (
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
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-text-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={22} fill="#d97706" stroke="#d97706" /> Rate & Review Service
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                    {reviewingBooking.serviceName} • {reviewingBooking.provider?.name || 'Technician'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmittingReview && setReviewingBooking(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              {reviewError && (
                <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
                  <AlertCircle size={18} />
                  <span>{reviewError}</span>
                </div>
              )}

              {reviewSuccess && (
                <div className="alert-box alert-success" style={{ marginBottom: '1.25rem' }}>
                  <CheckCircle2 size={18} />
                  <span>{reviewSuccess}</span>
                </div>
              )}

              <form onSubmit={handleReviewSubmit}>
                {/* 1-5 Star Selector */}
                <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    How would you rate your overall experience?
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = (hoverRating || reviewRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          id={`star-btn-${star}`}
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            transform: isActive ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          <Star
                            size={32}
                            fill={isActive ? '#d97706' : '#e2e8f0'}
                            stroke={isActive ? '#d97706' : '#cbd5e1'}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706', minHeight: '1.2rem' }}>
                    {['1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent!'][((hoverRating || reviewRating) || 5) - 1]}
                  </div>
                </div>

                {/* Review Text Area */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                      Written Review / Feedback (Optional)
                    </label>
                    <span style={{ fontSize: '0.78rem', color: reviewComment.length > 900 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {reviewComment.length} / 1000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Share helpful feedback about punctuality, problem resolution, pricing fairness, and quality..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <Button
                    variant="outline"
                    disabled={isSubmittingReview}
                    onClick={() => setReviewingBooking(null)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview || Boolean(reviewSuccess)}
                    id="submit-review-btn"
                    className="btn btn-primary"
                    style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      'Submit Verified Review'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Review Details Modal */}
        {viewingReview && (
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
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} style={{ color: '#16a34a' }} /> Your Verified Review
                </h3>
                <button
                  type="button"
                  onClick={() => setViewingReview(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--color-accent-gold-bg)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      fill={s <= viewingReview.rating ? 'var(--color-accent-gold)' : 'var(--color-border)'}
                      stroke={s <= viewingReview.rating ? 'var(--color-accent-gold)' : 'var(--color-border)'}
                    />
                  ))}
                </div>
                <strong style={{ marginLeft: '0.5rem', color: 'var(--color-accent-gold)', fontSize: '0.95rem' }}>
                  {viewingReview.rating} out of 5 stars
                </strong>
              </div>

              {viewingReview.comment ? (
                <div style={{ marginBottom: '1.5rem', color: 'var(--color-text-body)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  "{viewingReview.comment}"
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                  No written comments provided.
                </p>
              )}

              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Submitted on {new Date(viewingReview.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="outline" onClick={() => setViewingReview(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Booking-based Real-time Chat Modal */}
        {activeChatBooking && (
          <BookingChatModal
            booking={activeChatBooking}
            role="customer"
            onClose={handleCloseChat}
          />
        )}

        {/* Booking-based Location & Map Modal */}
        {activeMapBooking && (
          <BookingMapModal
            booking={activeMapBooking}
            role="customer"
            onClose={handleCloseMap}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
