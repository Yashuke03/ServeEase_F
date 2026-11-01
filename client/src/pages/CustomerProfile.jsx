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
  MailCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import AvatarUpload from '../components/common/AvatarUpload';
import { SUPPORTED_CITIES, getCityDisplayName } from '../data/cities';
import { userApi } from '../services/api';
import { validateIndianMobile } from '../utils/validation';

/**
 * Customer Profile Page
 * Enables authenticated customers to view account info and edit permitted fields
 * (name, phone number, and primary city). Email and role remain read-only.
 */
export default function CustomerProfile() {
  const { user, setUser, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    city: 'sangli'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [fetchError, setFetchError] = useState(false);

  // Synchronize form state from authenticated user or remote profile
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        city: user.city || 'sangli'
      });
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
          city: data.user.city || 'sangli'
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
        city: user.city || 'sangli'
      });
    }
    setPhoneError('');
    setSuccessMessage('');
    setErrorMessage('');
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

    try {
      setIsSubmitting(true);
      const updatedUser = await updateProfile({
        name: formData.name.trim(),
        phoneNumber: phoneValidation.normalized,
        city: formData.city
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
