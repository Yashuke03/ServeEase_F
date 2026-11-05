import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, 
  AlertCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Phone, 
  User, 
  Calendar, 
  RefreshCw,
  Loader2,
  Check,
  X,
  FileText
} from 'lucide-react';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { getCityDisplayName } from '../data/cities';
import { bookingApi } from '../services/api';

/**
 * Provider Booking Requests Page (/provider/requests)
 */
export default function ProviderRequests() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('pending'); // 'pending' | 'accepted' | 'declined' | 'all'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const actionLoadingRef = useRef(false);
  const [actionNotice, setActionNotice] = useState(null);

  const city = user?.city ? getCityDisplayName(user.city) : 'Sangli';

  // Fetch provider booking requests
  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getProviderBookings();
      if (res.success && Array.isArray(res.bookings)) {
        setRequests(res.bookings);
      } else {
        setError(res.error || 'Failed to load booking requests.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to bookings server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle Accept request
  const handleAcceptRequest = async (bookingId) => {
    if (actionLoadingRef.current || actionLoading) return;
    actionLoadingRef.current = true;
    setActionLoading(true);
    setActionNotice(null);
    try {
      const res = await bookingApi.acceptBooking(bookingId);
      if (res.success && res.booking) {
        setRequests(prev => prev.map(b => (b._id === bookingId ? res.booking : b)));
        setActionNotice({ type: 'success', message: 'Booking request accepted and scheduled.' });
      } else {
        setActionNotice({ type: 'error', message: res.error || 'Could not accept booking request.' });
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message || 'Error executing accept action.' });
    } finally {
      actionLoadingRef.current = false;
      setActionLoading(false);
    }
  };

  // Handle Reject request
  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    setActionLoading(true);
    setActionNotice(null);
    try {
      const res = await bookingApi.rejectBooking(rejectingId, rejectReason);
      if (res.success && res.booking) {
        setRequests(prev => prev.map(b => (b._id === rejectingId ? res.booking : b)));
        setActionNotice({ type: 'info', message: 'Booking request declined.' });
        setRejectingId(null);
        setRejectReason('');
      } else {
        setActionNotice({ type: 'error', message: res.error || 'Could not decline booking request.' });
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message || 'Error executing decline action.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'accepted') return r.status === 'accepted';
    if (filter === 'declined') return r.status === 'rejected';
    return true;
  });

  return (
    <DashboardLayout
      title="Booking Requests"
      subtitle="Review incoming customer consultation inquiries and confirm appointments"
    >
      <div className="provider-requests-content">

        {/* Global Action Banner */}
        {actionNotice && (
          <div
            className={`alert-box alert-${actionNotice.type === 'error' ? 'error' : actionNotice.type === 'info' ? 'info' : 'success'}`}
            style={{ marginBottom: '1.5rem' }}
          >
            {actionNotice.type === 'error' ? (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{actionNotice.message}</span>
            <button
              onClick={() => setActionNotice(null)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'pending', label: `Pending Action (${requests.filter(r => r.status === 'pending').length})` },
              { id: 'accepted', label: `Accepted (${requests.filter(r => r.status === 'accepted').length})` },
              { id: 'declined', label: `Declined (${requests.filter(r => r.status === 'rejected').length})` },
              { id: 'all', label: `All Inquiries (${requests.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0.6rem 1rem',
                  fontSize: '0.88rem',
                  fontWeight: filter === tab.id ? 700 : 500,
                  color: filter === tab.id ? 'var(--primary-700)' : 'var(--color-text-muted)',
                  borderBottom: filter === tab.id ? '2px solid var(--primary-600)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchRequests}
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
              Checking incoming booking requests...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={36} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', marginBottom: '0.5rem' }}>
              Unable to Load Requests
            </h3>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.92rem' }}>
              {error}
            </p>
            <Button variant="primary" onClick={fetchRequests}>
              <RefreshCw size={16} /> Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRequests.length === 0 && (
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
              <Inbox size={28} />
            </div>

            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-text-title)', marginBottom: '0.5rem' }}>
              {filter === 'pending'
                ? 'No Pending Booking Requests'
                : `No ${filter} requests`}
            </h3>

            <p style={{ color: 'var(--color-text-muted)', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {filter === 'pending'
                ? `When customers in ${city} request appointments for your trade services, they will appear here with customer contact details and navigation instructions.`
                : `You currently have no inquiries matching the "${filter}" filter.`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Button to="/provider/services" variant="primary">
                Review Services Catalog
              </Button>
              <Button to="/provider/dashboard" variant="outline">
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Requests List */}
        {!loading && !error && filteredRequests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredRequests.map(req => {
              const customer = req.customer || {};
              const isPending = req.status === 'pending';

              return (
                <article
                  key={req._id}
                  id={`request-card-${req._id}`}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)'
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
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-title)' }}>
                          {req.serviceName}
                        </h4>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                          {req.cityName || getCityDisplayName(req.city)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                        Customer: <strong style={{ color: 'var(--color-text-body)' }}>{customer.name || 'Registered Customer'}</strong>
                        {customer.phoneNumber && (
                          <span style={{ marginLeft: '0.75rem', color: 'var(--primary-700)' }}>
                            <Phone size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                            {customer.phoneNumber}
                          </span>
                        )}
                        {customer.email && (
                          <span style={{ marginLeft: '0.75rem', color: 'var(--color-text-muted)' }}>
                            • {customer.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.3rem 0.8rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        backgroundColor: req.status === 'pending' ? 'var(--color-accent-gold-bg)' : req.status === 'accepted' ? 'var(--color-info-blue-bg)' : 'var(--color-bg-subtle)',
                        color: req.status === 'pending' ? 'var(--color-accent-gold)' : req.status === 'accepted' ? 'var(--color-info-blue)' : 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)'
                      }}>
                        {req.status === 'pending' ? 'Pending Action' : req.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                    fontSize: '0.88rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Requested Date & Time
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-title)', fontWeight: 600, marginTop: '0.2rem' }}>
                        <Calendar size={15} style={{ color: 'var(--primary-600)' }} />
                        <span>{req.bookingDate}</span>
                        <Clock size={15} style={{ color: 'var(--primary-600)', marginLeft: '0.35rem' }} />
                        <span>{req.bookingTime}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Service Address
                      </span>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--color-text-body)', marginTop: '0.2rem' }}>
                        <MapPin size={15} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '2px' }} />
                        <span>{req.serviceAddress}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Consultation / Starting Rate
                      </span>
                      <div style={{ marginTop: '0.2rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary-700)' }}>
                        {req.price > 0 ? `₹${req.price}` : 'On Inspection Quote'}
                      </div>
                    </div>
                  </div>

                  {/* Customer Description */}
                  {req.description && (
                    <div style={{
                      backgroundColor: 'var(--color-bg-subtle)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-body)',
                      marginBottom: '1rem',
                      border: '1px solid var(--color-border)'
                    }}>
                      <strong>Customer Problem Notes:</strong> "{req.description}"
                    </div>
                  )}

                  {/* Actions for Pending Inquiries */}
                  {isPending && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '0.85rem',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          setRejectingId(req._id);
                          setRejectReason('');
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--color-danger)', borderColor: 'var(--color-border)' }}
                      >
                        <X size={15} /> Decline Request
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAcceptRequest(req._id)}
                        className="btn btn-primary btn-sm"
                      >
                        <Check size={15} /> Accept Appointment
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Decline Confirmation Modal */}
        {rejectingId && (
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
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
                <AlertCircle size={22} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-title)' }}>
                  Decline Service Request?
                </h3>
              </div>

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Please provide a brief reason so the customer understands why you cannot take this job (e.g. fully booked, outside immediate coverage area).
              </p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Decline Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule fully booked for this time slot..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setRejectingId(null)}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmReject}
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                >
                  {actionLoading ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
