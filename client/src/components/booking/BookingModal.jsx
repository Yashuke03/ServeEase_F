import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  FileText,
  DollarSign,
  ArrowRight,
  Home,
  Crosshair
} from 'lucide-react';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { getCityDisplayName } from '../../data/cities';
import { bookingApi } from '../../services/api';
import { getKolkataNow, getAvailableSlotsForDate, STANDARD_TIME_SLOTS } from '../../utils/dateTime';

/**
 * Customer Booking Request Modal
 */
export default function BookingModal({ provider, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Extract available services from provider
  const availableServices = React.useMemo(() => {
    if (!provider) return [];
    let list = [];
    if (Array.isArray(provider.servicesOffered) && provider.servicesOffered.length > 0) {
      list = provider.servicesOffered;
    } else if (Array.isArray(provider.providerDetails?.servicesOffered) && provider.providerDetails.servicesOffered.length > 0) {
      list = provider.providerDetails.servicesOffered;
    } else if (typeof provider.servicesOffered === 'string' && provider.servicesOffered.trim()) {
      list = provider.servicesOffered.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    // Add primary category or title if list is empty
    if (list.length === 0) {
      const fallback = provider.category || provider.providerDetails?.category || provider.title || 'General Consultation';
      list = [fallback];
    }
    return list;
  }, [provider]);

  // Current Asia/Kolkata date string
  const kolkataToday = React.useMemo(() => getKolkataNow().dateStr, [isOpen]);

  const savedHomeAddress = user?.location?.address || user?.address || '';
  const hasSavedHomeCoords = user?.location?.latitude !== null && user?.location?.latitude !== undefined && user?.location?.longitude !== null && user?.location?.longitude !== undefined;

  // Form states
  const [selectedService, setSelectedService] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [addressOption, setAddressOption] = useState('saved'); // 'saved' | 'custom'
  const [serviceAddress, setServiceAddress] = useState('');
  const [bookingLocation, setBookingLocation] = useState(null);
  const [description, setDescription] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState('');
  
  // Workflow states
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState(null);
  const [_createdBooking, setCreatedBooking] = useState(null);

  // Recalculate available slots dynamically in Asia/Kolkata timezone
  const availableSlots = React.useMemo(() => {
    return getAvailableSlotsForDate(bookingDate);
  }, [bookingDate]);

  // Automatically select the first valid slot if current choice is invalid or has passed
  useEffect(() => {
    if (availableSlots.length > 0) {
      if (!availableSlots.includes(bookingTime)) {
        setBookingTime(availableSlots[0]);
      }
    } else {
      setBookingTime('');
    }
  }, [availableSlots, bookingTime]);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (isOpen && provider) {
      setSelectedService(availableServices[0] || '');
      // Default to tomorrow or today if early enough
      const kolkataNow = getKolkataNow();
      const slotsToday = getAvailableSlotsForDate(kolkataNow.dateStr, kolkataNow);
      
      let defaultDate = kolkataNow.dateStr;
      let defaultSlot = slotsToday[0] || '';
      if (slotsToday.length === 0) {
        // If today has no remaining slots, default to tomorrow
        const tomDate = new Date();
        tomDate.setDate(tomDate.getDate() + 1);
        const tomKolkata = getKolkataNow(tomDate);
        defaultDate = tomKolkata.dateStr;
        defaultSlot = STANDARD_TIME_SLOTS[1] || STANDARD_TIME_SLOTS[0];
      }

      setBookingDate(defaultDate);
      setBookingTime(defaultSlot);

      const homeAddr = user?.location?.address || user?.address || '';
      const hasCoords = user?.location?.latitude !== null && user?.location?.latitude !== undefined && user?.location?.longitude !== null && user?.location?.longitude !== undefined;

      if (homeAddr) {
        setAddressOption('saved');
        setServiceAddress(homeAddr);
        setBookingLocation(hasCoords ? { latitude: Number(user.location.latitude), longitude: Number(user.location.longitude) } : null);
      } else {
        setAddressOption('custom');
        setServiceAddress('');
        setBookingLocation(null);
      }

      setGeoStatus('');
      setGeoLoading(false);
      setDescription('');
      setStep('form');
      setError(null);
      setIsSubmitting(false);
      setCreatedBooking(null);
    }
  }, [isOpen, provider, availableServices, user]);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoStatus('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setBookingLocation({ latitude: lat, longitude: lng });
        setGeoLoading(false);
        setGeoStatus(`📍 GPS location attached: ${lat}, ${lng}`);
      },
      (err) => {
        setGeoLoading(false);
        let msg = 'Could not capture GPS location. You can proceed with street address.';
        if (err.code === 1) msg = 'Location permission was denied. You can proceed with street address.';
        setGeoStatus(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (!isOpen || !provider) return null;

  const isProviderAvailable = provider.isAvailable !== false && provider.providerDetails?.isAvailable !== false;
  const cityName = getCityDisplayName(provider.city || provider.providerDetails?.city || 'sangli');
  const startingPrice = Number(provider.startingPrice || provider.providerDetails?.startingPrice) || 0;

  // Validation before proceeding to confirmation
  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    setError(null);

    if (!isProviderAvailable) {
      setError(`Technician "${provider.name}" is currently offline and not accepting new booking requests.`);
      return;
    }

    if (!selectedService) {
      setError('Please select a service trade from the list.');
      return;
    }

    if (!bookingDate) {
      setError('Please select an appointment date.');
      return;
    }

    if (bookingDate < kolkataToday) {
      setError('Appointment date cannot be in the past.');
      return;
    }

    if (!bookingTime || !availableSlots.includes(bookingTime)) {
      setError('The selected time slot is invalid or has already passed. Please select a valid upcoming slot.');
      return;
    }

    if (!serviceAddress || serviceAddress.trim().length < 5) {
      setError('Please provide a complete service delivery address (at least 5 characters).');
      return;
    }

    setStep('confirm');
  };

  // Submit booking request to backend (with synchronous ref locking against double-clicks)
  const handleSubmitBooking = async () => {
    if (isSubmittingRef.current || isSubmitting) return;

    if (user?.role === 'customer' && !user?.emailVerified) {
      setError('Please verify your email address to book service appointments.');
      setStep('form');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        providerId: provider._id || provider.id,
        serviceName: selectedService,
        city: provider.city || provider.providerDetails?.city || 'sangli',
        serviceAddress: serviceAddress.trim(),
        location: bookingLocation,
        bookingDate,
        bookingTime,
        description: description.trim()
      };

      const res = await bookingApi.createBooking(payload);
      if (res.success && res.booking) {
        setCreatedBooking(res.booking);
        setStep('success');
        if (onSuccess) onSuccess(res.booking);
      } else {
        setError(res.error || 'Failed to submit booking request. Please try again.');
        setStep('form');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating your appointment.');
      setStep('form');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
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
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div 
        className="card" 
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close booking modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* ================================================================
            STEP 1: BOOKING FORM
            ================================================================ */}
        {step === 'form' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-700)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                <Calendar size={14} /> Service Appointment Request
              </div>
              <h2 id="booking-modal-title" style={{ fontSize: '1.45rem', color: 'var(--color-text-title)', margin: 0 }}>
                Book {provider.name}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                {provider.title || provider.providerDetails?.title || 'Certified Technician'} • {cityName}
              </p>
            </div>

            {error && (
              <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {!isProviderAvailable && (
              <div className="alert-box alert-error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Technician Currently Offline:</strong> {provider.name} is not accepting new booking requests at this moment.
                </div>
              </div>
            )}

            {user?.role === 'customer' && !user?.emailVerified && (
              <div className="alert-box" style={{
                marginBottom: '1.25rem',
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.86rem', color: 'var(--color-text-title)' }}>
                    <strong>Email verification required:</strong> Please verify your email address to complete booking.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/verify-email', { state: { email: user?.email } });
                  }}
                  style={{
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Verify Now
                </button>
              </div>
            )}

            <form onSubmit={handleProceedToConfirm}>
              {/* Service Selection */}
              <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  Select Service Required <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  required
                >
                  {availableServices.map((srv, idx) => (
                    <option key={idx} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>

              {/* City and Service Area Snapshot */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.15rem'
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    Service City
                  </label>
                  <input
                    type="text"
                    value={cityName}
                    readOnly
                    className="form-control"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed', color: 'var(--color-text-muted)' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    Coverage Area
                  </label>
                  <input
                    type="text"
                    value={provider.serviceArea || provider.providerDetails?.serviceArea || cityName}
                    readOnly
                    className="form-control"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed', color: 'var(--color-text-muted)' }}
                  />
                </div>
              </div>

              {/* Appointment Date and Preferred Time Slot */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.15rem'
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    Preferred Date <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    min={kolkataToday}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    Time Window <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="form-control"
                    disabled={!isProviderAvailable || availableSlots.length === 0}
                    required
                  >
                    {availableSlots.length === 0 ? (
                      <option value="" disabled>No slots available today</option>
                    ) : (
                      availableSlots.map((slot, idx) => (
                        <option key={idx} value={slot}>
                          {slot}
                        </option>
                      ))
                    )}
                  </select>
                  {bookingDate === kolkataToday && availableSlots.length === 0 && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#dc2626', fontWeight: 500 }}>
                      All booking windows for today have passed. Please select a future date.
                    </p>
                  )}
                </div>
              </div>

              {/* Service Address */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>
                    Doorstep Service Address <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>

                  {savedHomeAddress && (
                    <div style={{ display: 'inline-flex', gap: '0.4rem', fontSize: '0.78rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressOption('saved');
                          setServiceAddress(savedHomeAddress);
                          setBookingLocation(hasSavedHomeCoords ? { latitude: Number(user.location.latitude), longitude: Number(user.location.longitude) } : null);
                          setGeoStatus('');
                        }}
                        style={{
                          background: addressOption === 'saved' ? 'var(--primary-50, #eff6ff)' : 'transparent',
                          color: addressOption === 'saved' ? 'var(--primary-700, #1d4ed8)' : 'var(--color-text-muted)',
                          border: `1px solid ${addressOption === 'saved' ? 'var(--primary-300, #93c5fd)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-sm, 4px)',
                          padding: '0.15rem 0.5rem',
                          cursor: 'pointer',
                          fontWeight: addressOption === 'saved' ? 600 : 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        <Home size={12} /> Use Home Address
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAddressOption('custom');
                          setServiceAddress('');
                          setBookingLocation(null);
                          setGeoStatus('');
                        }}
                        style={{
                          background: addressOption === 'custom' ? 'var(--primary-50, #eff6ff)' : 'transparent',
                          color: addressOption === 'custom' ? 'var(--primary-700, #1d4ed8)' : 'var(--color-text-muted)',
                          border: `1px solid ${addressOption === 'custom' ? 'var(--primary-300, #93c5fd)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-sm, 4px)',
                          padding: '0.15rem 0.5rem',
                          cursor: 'pointer',
                          fontWeight: addressOption === 'custom' ? 600 : 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        <MapPin size={12} /> Custom Location
                      </button>
                    </div>
                  )}
                </div>

                {addressOption === 'saved' && savedHomeAddress ? (
                  <div style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    backgroundColor: 'var(--color-bg-subtle)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.86rem',
                    marginBottom: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                      <Home size={16} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-title)', marginBottom: '0.15rem' }}>
                          Saved Home Address:
                        </div>
                        <div style={{ color: 'var(--color-text-body)' }}>{savedHomeAddress}</div>
                        {hasSavedHomeCoords && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--primary-700)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>📍 GPS Coordinates Attached:</span>
                            <strong>{Number(user.location.latitude).toFixed(4)}, {Number(user.location.longitude).toFixed(4)}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={2}
                      value={serviceAddress}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServiceAddress(val);
                        if (val) {
                          const coordMatch = val.match(/(?:@|q=)?(-?\d{1,2}\.\d{3,8})[,\s]+(-?\d{1,3}\.\d{3,8})/);
                          if (coordMatch) {
                            const lat = parseFloat(coordMatch[1]);
                            const lng = parseFloat(coordMatch[2]);
                            if (!isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lng) && lng >= -180 && lng <= 180) {
                              setBookingLocation({ latitude: lat, longitude: lng });
                              setGeoStatus(`📍 Attached coordinates from Google Maps: ${lat}, ${lng}`);
                            }
                          }
                        }
                      }}
                      placeholder="Apartment/Flat, Building name, Street, Landmark..."
                      className="form-control"
                      style={{ width: '100%', resize: 'vertical' }}
                      required
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleDetectGPS}
                        disabled={geoLoading}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.2rem 0.55rem' }}
                      >
                        <Crosshair size={13} className={geoLoading ? 'spin-animation' : ''} />
                        {geoLoading ? 'Detecting GPS...' : 'Attach Current GPS Location'}
                      </button>
                      {geoStatus && (
                        <span style={{ fontSize: '0.78rem', color: geoStatus.includes('📍') ? 'var(--color-success, #16a34a)' : 'var(--color-text-muted)' }}>
                          {geoStatus}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  Problem Description / Special Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Overhead tank valve is leaking; please bring CP pipe replacement fixtures..."
                  className="form-control"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Pricing Transparency Summary */}
              <div style={{
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                border: '1px solid var(--color-border)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                    Inspection / Starting Rate
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                    {startingPrice > 0 ? `₹${startingPrice}` : 'On Inspection Quote'}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'right', maxWidth: '220px' }}>
                  <ShieldCheck size={16} style={{ color: '#16a34a', display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Pay technician directly on inspection. No online prepayment required.
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={!isProviderAvailable || availableSlots.length === 0}
                >
                  Review & Confirm Booking <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================
            STEP 2: CONFIRMATION SUMMARY
            ================================================================ */}
        {step === 'confirm' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-700)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                <ShieldCheck size={14} /> Review Appointment
              </div>
              <h2 style={{ fontSize: '1.45rem', color: 'var(--color-text-title)', margin: 0 }}>
                Confirm Booking Request
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                Please check the appointment summary below before dispatching to {provider.name}.
              </p>
            </div>

            {error && (
              <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Assigned Technician:</span>
                <strong style={{ color: 'var(--color-text-title)' }}>{provider.name}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Requested Service:</span>
                <strong style={{ color: 'var(--color-text-title)' }}>{selectedService}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Scheduled Date & Time:</span>
                <strong style={{ color: 'var(--primary-700)' }}>{bookingDate} • {bookingTime}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>City:</span>
                <strong style={{ color: 'var(--color-text-title)' }}>{cityName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Service Address:</span>
                <span style={{ textAlign: 'right', maxWidth: '280px', color: 'var(--color-text-title)', fontWeight: 500 }}>
                  {serviceAddress}
                </span>
              </div>

              {bookingLocation && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>GPS Coordinates:</span>
                  <span style={{ color: 'var(--primary-700)', fontWeight: 600, fontSize: '0.84rem' }}>
                    📍 {Number(bookingLocation.latitude).toFixed(4)}, {Number(bookingLocation.longitude).toFixed(4)}
                  </span>
                </div>
              )}

              {description && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Instructions:</span>
                  <span style={{ textAlign: 'right', maxWidth: '280px', color: 'var(--color-text-body)' }}>
                    "{description}"
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Starting Visit Charge:</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary-700)' }}>
                  {startingPrice > 0 ? `₹${startingPrice}` : 'On Inspection Quote'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setStep('form')}
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isSubmitting || !isProviderAvailable}
                onClick={handleSubmitBooking}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    Confirm & Send Request <CheckCircle2 size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 3: SUCCESS CONFIRMATION
            ================================================================ */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-title)', marginBottom: '0.5rem' }}>
              Booking Request Submitted!
            </h2>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.75rem' }}>
              Your appointment request for <strong>{selectedService}</strong> has been dispatched to <strong>{provider.name}</strong>.
              The technician will review your request and confirm arrival.
            </p>

            <div style={{
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              border: '1px solid var(--color-border)',
              marginBottom: '1.75rem',
              textAlign: 'left',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status:</span>
                <span className="badge badge-warning" style={{ fontWeight: 700 }}>Pending Technician Confirmation</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Scheduled Date:</span>
                <strong>{bookingDate} ({bookingTime})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Location:</span>
                <span>{serviceAddress}, {cityName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate('/customer/bookings');
                }}
              >
                View in My Bookings <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
