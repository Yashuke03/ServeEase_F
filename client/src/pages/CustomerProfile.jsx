import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Lock,
  MailCheck,
  Home,
  Navigation,
  Crosshair
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import AvatarUpload from '../components/common/AvatarUpload';
import ServiceMap from '../components/map/ServiceMap';
import { SUPPORTED_CITIES, getCityDisplayName } from '../data/cities';
import { userApi } from '../services/api';
import { validateIndianMobile } from '../utils/validation';

/**
 * Customer Profile Page
 * Enables authenticated customers to view account info and edit permitted fields
 * (name, phone number, primary city, and home address with GPS coordinates).
 */
export default function CustomerProfile() {
  const { user, setUser, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    city: 'sangli',
    address: '',
    latitude: '',
    longitude: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState('');

  // Synchronize form state from authenticated user or remote profile
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        name: user.name || prev.name || '',
        phoneNumber: user.phoneNumber || prev.phoneNumber || '',
        city: user.city || prev.city || 'sangli',
        address: user.location?.address || user.address || prev.address || '',
        latitude: user.location?.latitude !== null && user.location?.latitude !== undefined 
          ? String(user.location.latitude) 
          : (prev.latitude || ''),
        longitude: user.location?.longitude !== null && user.location?.longitude !== undefined 
          ? String(user.location.longitude) 
          : (prev.longitude || '')
      }));
      setPhoneError('');
    }
  }, [user]);

  // Optional refresh from backend to ensure latest state
  const reloadProfile = async () => {
    try {
      setFetchError(false);
      const data = await userApi.getProfile();
      if (data?.user) {
        setFormData({
          name: data.user.name || '',
          phoneNumber: data.user.phoneNumber || '',
          city: data.user.city || 'sangli',
          address: data.user.location?.address || data.user.address || '',
          latitude: data.user.location?.latitude !== null && data.user.location?.latitude !== undefined ? String(data.user.location.latitude) : '',
          longitude: data.user.location?.longitude !== null && data.user.location?.longitude !== undefined ? String(data.user.location.longitude) : ''
        });
        setPhoneError('');
      }
    } catch (err) {
      console.warn('Could not refresh profile from server:', err.message);
      setFetchError(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // Auto-extract latitude and longitude if user pastes coordinates or Google Maps link into address
      if (name === 'address' && value) {
        const coordMatch = value.match(/(?:@|q=)?(-?\d{1,2}\.\d{3,8})[,\s]+(-?\d{1,3}\.\d{3,8})/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          if (!isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lng) && lng >= -180 && lng <= 180) {
            next.latitude = String(lat);
            next.longitude = String(lng);
            setGeoStatus(`📍 Extracted coordinates from Google Maps: ${lat}, ${lng}`);
          }
        }
      }
      return next;
    });

    if (name === 'phoneNumber' && phoneError) {
      const check = validateIndianMobile(value);
      if (check.isValid) {
        setPhoneError('');
      }
    }
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleReset = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        city: user.city || 'sangli',
        address: user.location?.address || user.address || '',
        latitude: user.location?.latitude !== null && user.location?.latitude !== undefined ? String(user.location.latitude) : '',
        longitude: user.location?.longitude !== null && user.location?.longitude !== undefined ? String(user.location.longitude) : ''
      });
    }
    setPhoneError('');
    setGeoStatus('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoStatus('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setFormData(prev => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lng)
        }));
        setGeoLoading(false);
        setGeoStatus('GPS coordinates captured successfully from your device.');
      },
      (error) => {
        setGeoLoading(false);
        let msg = 'Could not retrieve your location. Please enter your address or coordinates manually.';
        if (error.code === 1) {
          msg = 'Location permission was denied. You can still enter your street address and coordinates manually.';
        } else if (error.code === 2) {
          msg = 'Location unavailable. Please enter your street address and coordinates manually.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please enter your street address manually.';
        }
        setGeoStatus(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    // Client-side validations
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    if (!formData.city) {
      setErrorMessage('Please select a valid supported city.');
      return;
    }

    const phoneValidation = validateIndianMobile(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Enter a valid 10-digit Indian mobile number.');
      return;
    } else {
      setPhoneError('');
    }

    let parsedLat = null;
    let parsedLng = null;
    if (formData.latitude !== '') {
      const numLat = Number(formData.latitude);
      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        setErrorMessage('Latitude must be a valid number between -90 and 90.');
        return;
      }
      parsedLat = numLat;
    }
    if (formData.longitude !== '') {
      const numLng = Number(formData.longitude);
      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        setErrorMessage('Longitude must be a valid number between -180 and 180.');
        return;
      }
      parsedLng = numLng;
    }

    try {
      setIsSubmitting(true);
      const updatedUser = await updateProfile({
        name: formData.name.trim(),
        phoneNumber: phoneValidation.normalized,
        city: formData.city,
        address: (formData.address || '').trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        location: {
          address: (formData.address || '').trim(),
          latitude: parsedLat,
          longitude: parsedLng
        }
      });

      // Update local storage customer city preference for discoverability
      localStorage.setItem('serveease_customer_city', formData.city);

      setSuccessMessage(`Profile updated successfully! Welcome, ${updatedUser.name}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'C';

  return (
    <DashboardLayout
      title="Customer Profile"
      subtitle="Manage your personal contact details and preferred home city"
    >
      <div className="customer-profile-content" style={{ maxWidth: '960px' }}>
        {/* Network / Fetch Error Alert */}
        {fetchError && (
          <div className="alert-box alert-warning" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <div style={{ flex: 1 }}>
              <span>Could not refresh latest profile from backend. Showing cached session data.</span>
            </div>
            <button 
              onClick={reloadProfile} 
              className="btn btn-outline btn-sm"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="alert-box alert-success" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-box alert-danger" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="profile-grid">
          {/* Left Column: Account Summary Card */}
          <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <AvatarUpload
                user={user}
                onAvatarChange={(updatedUser) => setUser(updatedUser)}
                size="5.25rem"
                shape="circle"
              />
            </div>

            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{user?.name || 'Customer'}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              {user?.email}
            </p>

            <div style={{ display: 'inline-flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="badge badge-verified">
                <CheckCircle2 size={12} /> Active Account
              </span>
              {user?.emailVerified ? (
                <span className="badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Email Verified
                </span>
              ) : (
                <Link to="/verify-email" state={{ email: user?.email }} style={{ textDecoration: 'none' }}>
                  <span className="badge" style={{ backgroundColor: 'var(--color-accent-gold-bg)', color: 'var(--color-accent-gold)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> Verify Email
                  </span>
                </Link>
              )}
              <span className="badge badge-primary">
                Role: Customer
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />

            <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                <span>
                  Primary City:{' '}
                  <strong>{user?.city ? getCityDisplayName(user.city) : 'Not specified'}</strong>
                </span>
              </div>
              <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Home size={15} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Home Address:{' '}
                  <strong>{user?.location?.address || user?.address || 'Not specified'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                <span>
                  Phone: <strong>{user?.phoneNumber || 'Not provided'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Profile Form */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              Edit Profile Information
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full Name <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g. Ramesh S. Patil"
                    disabled={isSubmitting}
                  />
                </div>
                <span className="form-helper">This name is visible when you request home services.</span>
              </div>

              {/* Email (Read-Only) */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontWeight: 'normal' }}>(Read-only)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input"
                    value={user?.email || ''}
                    disabled
                    style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed', color: 'var(--color-text-muted)' }}
                  />
                  <Lock size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
                </div>
                <span className="form-helper">Email is permanent and tied to your authentication credentials.</span>
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="phoneNumber">
                  Contact Phone Number <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    className={`form-input ${phoneError ? 'form-input-error' : ''}`}
                    style={phoneError ? { borderColor: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' } : {}}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="e.g. 98765 43210 or +91 98765 43210"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={phoneError ? 'phoneNumber-error' : undefined}
                  />
                  {phoneError && (
                    <AlertCircle
                      size={16}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-danger)',
                        pointerEvents: 'none'
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                {phoneError ? (
                  <div
                    id="phoneNumber-error"
                    role="alert"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--color-danger)',
                      fontSize: '0.82rem',
                      marginTop: '0.35rem',
                      fontWeight: 500
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{phoneError}</span>
                  </div>
                ) : (
                  <span className="form-helper">Used by service providers to coordinate appointment arrival.</span>
                )}
              </div>

              {/* City Selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="city">
                  Primary Service City <span className="required">*</span>
                </label>
                <select
                  id="city"
                  name="city"
                  className="form-select"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                >
                  {SUPPORTED_CITIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="form-helper">Sets your default city across local provider searches.</span>
              </div>

              {/* Home Address & GPS Coordinates */}
              <div style={{ marginBottom: '1.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}>
                    <Home size={18} style={{ color: 'var(--primary-600)' }} />
                    Home Address & GPS Location
                  </h3>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isSubmitting || geoLoading}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                    title="Capture your device coordinates"
                  >
                    <Crosshair size={14} className={geoLoading ? 'spin-animation' : ''} />
                    {geoLoading ? 'Detecting GPS...' : 'Use Current GPS'}
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  Save your primary home address and coordinates to auto-fill booking requests. Service technicians use this to navigate to your doorstep.
                </p>

                {geoStatus && (
                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '0.82rem',
                      backgroundColor: geoStatus.includes('successfully') || geoStatus.includes('pinned') ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-bg-subtle, #f8fafc)',
                      border: `1px solid ${geoStatus.includes('successfully') || geoStatus.includes('pinned') ? '#bbf7d0' : 'var(--color-border)'}`,
                      color: geoStatus.includes('successfully') || geoStatus.includes('pinned') ? '#166534' : 'var(--color-text-muted)'
                    }}
                  >
                    {geoStatus}
                  </div>
                )}

                {/* Street Address Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="address">
                    Home Street Address / Flat / Building / Landmark
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={2}
                    className="form-textarea"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. Flat 402, Shanti Heights, Near Ganpati Temple, Vishrambag"
                    disabled={isSubmitting}
                  />
                  <span className="form-helper">This address will be pre-filled when you schedule technician appointments.</span>
                </div>

                {/* GPS Coordinates Inputs */}
                <div className="grid-2" style={{ gap: '1rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="latitude">
                      GPS Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="latitude"
                      name="latitude"
                      className="form-input"
                      value={formData.latitude}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. 16.8524"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="longitude">
                      GPS Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="longitude"
                      name="longitude"
                      className="form-input"
                      value={formData.longitude}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. 74.5815"
                    />
                  </div>
                </div>

                {/* Interactive Map Picker */}
                <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md, 8px)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <div style={{ padding: '0.45rem 0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📍 Click or drag pin on map to refine your doorstep location</span>
                    {formData.latitude && formData.longitude && (
                      <span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                        {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                      </span>
                    )}
                  </div>
                  <ServiceMap
                    selectedCity={formData.city || 'sangli'}
                    editable={true}
                    currentLocation={
                      formData.latitude !== '' && formData.longitude !== ''
                        ? { latitude: Number(formData.latitude), longitude: Number(formData.longitude) }
                        : null
                    }
                    onLocationChange={({ latitude, longitude }) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: Number(latitude).toFixed(6),
                        longitude: Number(longitude).toFixed(6)
                      }));
                      setGeoStatus('Location pinned on map.');
                    }}
                    height="240px"
                  />
                </div>
              </div>

              {/* Account Role (Read-Only) */}
              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Account Role</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value="Customer (Service Seeker)"
                    disabled
                    className="form-input"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed', color: 'var(--color-text-muted)' }}
                  />
                  <Lock size={15} style={{ color: 'var(--color-text-subtle)' }} />
                </div>
                <span className="form-helper">Role cannot be altered to prevent unauthorized privilege escalation.</span>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
