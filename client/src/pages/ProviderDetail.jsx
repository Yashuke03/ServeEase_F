import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  ArrowLeft, 
  Info,
  RefreshCw,
  Wrench,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import BookingModal from '../components/booking/BookingModal';
import ServiceMap from '../components/map/ServiceMap';
import { useAuth } from '../context/AuthContext';
import { SAMPLE_PROVIDERS } from '../data/sampleData';
import { providerApi, reviewApi, getAvatarUrl } from '../services/api';
import { connectSocket } from '../services/socket';
import { getCityDisplayName } from '../data/cities';

/**
 * Provider Details Page (/provider/:id)
 * 
 * Comprehensive view of an individual technician's profile, ratings,
 * pricing packages, offered services, and direct booking request flow.
 * Customers are strictly read-only and cannot edit provider details.
 */
export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const initialSample = SAMPLE_PROVIDERS.find((p) => p.id === id) || null;
  const [provider, setProvider] = useState(initialSample);
  const [loading, setLoading] = useState(!initialSample);
  const [error, setError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingNotice, setBookingNotice] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    providerApi.getProviderById(id)
      .then((data) => {
        if (isSubscribed && data.success && data.provider) {
          setProvider(data.provider);
        }
      })
      .catch((err) => {
        if (isSubscribed && !initialSample) {
          setError(err.message || 'Provider profile not found.');
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setLoading(false);
        }
      });

    // Fetch live verified reviews
    reviewApi.getProviderReviews(id)
      .then((data) => {
        if (isSubscribed && data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch((err) => {
        console.warn('Could not load reviews:', err.message);
      })
      .finally(() => {
        if (isSubscribed) {
          setReviewsLoading(false);
        }
      });

    return () => { isSubscribed = false; };
  }, [id, initialSample]);

  // Real-time provider availability listener
  useEffect(() => {
    const socket = connectSocket();
    const handleAvailabilityChanged = ({ providerId, isAvailable: newAvail }) => {
      const currentId = (provider?._id || provider?.id || id)?.toString();
      if (currentId === providerId?.toString()) {
        setProvider((prev) => prev ? { ...prev, isAvailable: newAvail !== false } : prev);
      }
    };

    socket.on('provider_availability_changed', handleAvailabilityChanged);
    return () => {
      socket.off('provider_availability_changed', handleAvailabilityChanged);
    };
  }, [provider?._id, provider?.id, id]);

  if (loading) {
    return (
      <div className="section-spacing container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem' }}>Loading specialist profile...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="section-spacing container">
        <EmptyState
          title="Provider Profile Not Found"
          message={error || "We could not find a provider with this identification code. They may have been unlisted or the URL is incorrect."}
          actionText="Back to All Services"
          onAction={() => navigate('/services')}
        />
      </div>
    );
  }

  const isVerified = Boolean(provider.isVerified);
  const isDemo = Boolean(provider.isDemo);
  const isAvailable = provider.isAvailable !== false && provider.providerDetails?.isAvailable !== false;
  const hasReviews = Number(provider.reviewCount) > 0 && Number(provider.rating) > 0;

  // Extract skills/services offered cleanly
  let displaySkills = [];
  if (Array.isArray(provider.servicesOffered) && provider.servicesOffered.length > 0) {
    displaySkills = provider.servicesOffered;
  } else if (Array.isArray(provider.skills) && provider.skills.length > 0) {
    displaySkills = provider.skills;
  } else if (typeof provider.servicesOffered === 'string' && provider.servicesOffered.trim()) {
    displaySkills = provider.servicesOffered.split(',').map(s => s.trim()).filter(Boolean);
  }

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';
  const cityName = provider.cityName || getCityDisplayName(provider.city);
  const locationText = [provider.serviceArea, cityName].filter(Boolean).join(', ');

  return (
    <div className="provider-detail-page section-spacing">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
          <Link to={`/services?city=${provider.city || 'sangli'}`} style={{ color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowLeft size={16} /> Back to Services in {cityName}
          </Link>
          <span style={{ color: 'var(--color-text-subtle)' }}>/</span>
          <span style={{ color: 'var(--color-text-title)', fontWeight: 600 }}>{provider.name}</span>
        </div>

        {/* Demo Notice Banner */}
        {isDemo && (
          <div className="alert-box alert-info" style={{ marginBottom: '2rem' }}>
            <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Demonstration Profile:</strong> This profile is part of the ServeEase five-city academic evaluation dataset.
            </div>
          </div>
        )}

        {/* Provider Profile Hero Card */}
        <div className="provider-detail-hero" style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            <img
              src={getAvatarUrl(provider.avatar) || defaultAvatar}
              alt={provider.name}
              style={{
                width: '7.5rem',
                height: '7.5rem',
                borderRadius: 'var(--radius-lg)',
                objectFit: 'cover',
                border: '3px solid var(--primary-100)',
                flexShrink: 0
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultAvatar;
              }}
            />

            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <h1 style={{ fontSize: '1.85rem', color: 'var(--color-text-title)', margin: 0 }}>
                  {provider.name}
                </h1>

                {isVerified && (
                  <span title="Verified Professional" style={{ color: 'var(--primary-600)', display: 'inline-flex' }}>
                    <ShieldCheck size={22} />
                  </span>
                )}

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isAvailable ? 'var(--color-success-bg)' : 'var(--color-bg-subtle)',
                  color: isAvailable ? 'var(--primary-600)' : 'var(--color-text-muted)',
                  border: `1px solid ${isAvailable ? 'var(--primary-600)' : 'var(--color-border)'}`
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: isAvailable ? 'var(--primary-600)' : 'var(--color-text-subtle)'
                  }} />
                  {isAvailable ? 'Available Now' : 'Currently Busy'}
                </span>
              </div>

              <p style={{ fontSize: '1.05rem', color: 'var(--color-text-title)', fontWeight: 600, marginBottom: '0.75rem' }}>
                {provider.title || provider.category}
              </p>

              {/* Meta Row: Rating, Experience, City, Response Time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--color-text-body)' }}>
                {hasReviews ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Star size={16} fill="#d97706" stroke="#d97706" />
                    <strong>{Number(provider.rating).toFixed(1)}</strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>({provider.reviewCount} reviews)</span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {isDemo ? 'Unrated demo profile' : 'New professional — no reviews yet'}
                  </span>
                )}

                {provider.experienceYears !== undefined && provider.experienceYears !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Wrench size={16} style={{ color: 'var(--primary-600)' }} />
                    <span><strong>{provider.experienceYears}</strong> years experience</span>
                  </div>
                )}

                {locationText && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={16} style={{ color: 'var(--primary-600)' }} />
                    <span>{locationText}</span>
                  </div>
                )}

                {provider.responseTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={16} style={{ color: 'var(--primary-600)' }} />
                    <span>Responds {provider.responseTime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Content Layout: Left Details / Right Booking Actions */}
        <div className="provider-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1.2fr)', gap: '2rem' }}>
          {/* Left Column: Bio, Offered Services & Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Bio Card */}
            {provider.bio && (
              <div className="card" style={{ padding: '1.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', marginBottom: '0.85rem' }}>
                  About the Specialist
                </h2>
                <p style={{ color: 'var(--color-text-body)', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
                  {provider.bio}
                </p>
              </div>
            )}

            {/* Offered Services Card */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', marginBottom: '0.5rem' }}>
                Offered Services & Scope of Work
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Specific repair, maintenance, and installation tasks provided by this technician
              </p>

              {displaySkills.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {displaySkills.map((service, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        color: 'var(--color-text-title)'
                      }}
                    >
                      <CheckCircle2 size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                      <span>{service}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Consultation on inspection available across {locationText || cityName}.
                </p>
              )}
            </div>

            {/* Service Location & Coverage Section */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                    Service Location & Coverage
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginTop: '2px', margin: 0 }}>
                    Operating across {cityName} ({provider.serviceArea || 'Doorstep visits'})
                  </p>
                </div>

                {provider.location?.latitude != null && provider.location?.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${provider.location.latitude},${provider.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>Get Directions</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {provider.location?.latitude != null && provider.location?.longitude != null ? (
                <div style={{ marginTop: '1rem' }}>
                  <ServiceMap
                    providers={[provider]}
                    selectedCity={provider.city || 'sangli'}
                    height="260px"
                  />
                  {provider.location.address && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} style={{ color: 'var(--primary-600)' }} />
                      <span>{provider.location.address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.88rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <MapPin size={20} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--color-text-title)', display: 'block', marginBottom: '2px' }}>
                      Doorstep Mobile Service
                    </strong>
                    This specialist travels to customer addresses across {locationText || cityName}. No fixed retail GPS marker is published.
                  </div>
                </div>
              )}
            </div>

            {/* Customer Reviews Section */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', margin: 0 }}>
                  Verified Customer Reviews
                </h2>
                {reviews.length > 0 && (
                  <span className="badge badge-primary">{reviews.length} Verified Feedbacks</span>
                )}
              </div>

              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: 0 }}>Loading verified feedback...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {reviews.map((rev) => (
                    <div key={rev._id || rev.id} style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--color-bg-page)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ color: 'var(--color-text-title)' }}>{rev.customer?.name || 'Verified Customer'}</strong>
                          {rev.serviceName && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--primary-600)', marginLeft: '0.5rem', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              {rev.serviceName}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.5rem' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < rev.rating ? "#d97706" : "#cbd5e1"}
                            stroke={i < rev.rating ? "#d97706" : "#cbd5e1"}
                          />
                        ))}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706', marginLeft: '0.35rem' }}>
                          {rev.rating}.0
                        </span>
                      </div>

                      {rev.comment ? (
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', margin: 0, lineHeight: 1.5 }}>
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                          Rating submitted without written comment.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                  <Star size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem', strokeWidth: 1.5 }} />
                  <h4 style={{ margin: '0 0 0.35rem', color: 'var(--color-text-title)', fontSize: '1rem' }}>No Reviews Yet</h4>
                  <p style={{ fontSize: '0.88rem', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                    Real customer reviews and star ratings are published exclusively by verified customers after completing a booked service appointment.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pricing & Booking Action */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '5.5rem', padding: '1.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Doorstep Inspection & Diagnostic
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {provider.startingPrice && Number(provider.startingPrice) > 0 ? (
                    <>
                      <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-600)', fontFamily: 'var(--font-family-heading)' }}>
                        ₹{provider.startingPrice}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>/ visit charge</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-title)' }}>
                      On Inspection Quote
                    </span>
                  )}
                </div>
                {provider.hourlyRate && Number(provider.hourlyRate) > 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-body)', marginTop: '0.35rem' }}>
                    Hourly labor estimate: <strong>₹{provider.hourlyRate}/hour</strong>
                  </div>
                )}
              </div>

              {/* Verified Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-body)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>Transparent consultation rates before work begins</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>Service area coverage across {cityName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>Identity and contact verification</span>
                </div>
              </div>

              {/* Active Booking Action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {!isAvailable && (
                  <div className="alert-box alert-warning" style={{ fontSize: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>Technician is currently offline and not accepting new booking requests.</span>
                  </div>
                )}

                {bookingNotice && (
                  <div className="alert-box alert-warning" style={{ fontSize: '0.85rem', padding: '0.75rem 1rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{bookingNotice}</span>
                  </div>
                )}

                <button
                  type="button"
                  id="book-service-btn"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) {
                      setBookingNotice('Technician is currently offline and not accepting new bookings.');
                      return;
                    }
                    if (!user) {
                      navigate('/login', { state: { from: location.pathname } });
                      return;
                    }
                    if (user.role === 'provider') {
                      setBookingNotice('Provider accounts cannot request bookings from other providers. Please sign in with a customer account.');
                      return;
                    }
                    if (user.role === 'admin') {
                      setBookingNotice('Administrator accounts cannot request customer bookings.');
                      return;
                    }
                    setBookingNotice(null);
                    setIsBookingModalOpen(true);
                  }}
                  className="btn btn-primary btn-block btn-lg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    opacity: isAvailable ? 1 : 0.65,
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    backgroundColor: isAvailable ? 'var(--primary-600)' : '#94a3b8'
                  }}
                >
                  <Calendar size={18} />
                  <span>{isAvailable ? 'Request Booking' : 'Technician Offline'}</span>
                </button>

                <div style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', marginBottom: '0.25rem' }}>
                    <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                    <strong style={{ color: 'var(--color-text-title)' }}>Transparent Booking Policy</strong>
                  </div>
                  No upfront advance required. Review details, pick your slot, and pay the technician directly upon service inspection.
                  {provider.phoneNumber && (
                    <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px dashed var(--color-border)' }}>
                      Direct Coordination: <strong style={{ color: 'var(--color-text-title)' }}>{provider.phoneNumber}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Booking Request Modal */}
      <BookingModal
        provider={provider}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
