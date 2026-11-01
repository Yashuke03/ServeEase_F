import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Lock,
  ArrowRight,
  Sliders,
  Users,
  UserCheck,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import AvatarUpload from '../components/common/AvatarUpload';
import { SUPPORTED_CITIES, getCityDisplayName } from '../data/cities';
import { userApi } from '../services/api';
import { validateIndianMobile } from '../utils/validation';

/**
 * Administrator Profile Page
 * Enables platform administrators to configure their operator profile,
 * update personal contact info, and manage their profile picture.
 */
export default function AdminProfile() {
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

  // Synchronize state with current user
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
      console.warn('Could not refresh admin profile:', err.message);
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

    // Validations
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

      setSuccessMessage(`Administrator profile updated successfully! Changes saved.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update admin profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Administrator Profile"
      subtitle="Manage system operator credentials, personal contact info, and profile portrait"
    >
      <div className="admin-profile-content" style={{ maxWidth: '980px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <AvatarUpload
                  user={user}
                  onAvatarChange={(updatedUser) => setUser(updatedUser)}
                  size="5.5rem"
                  shape="circle"
                />
              </div>

              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{user?.name || 'Administrator'}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                {user?.email}
              </p>

              <div style={{ display: 'inline-flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={12} /> System Admin
                </span>
                <span className="badge badge-verified">
                  <CheckCircle2 size={12} /> Full Clearance
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <Link to="/admin/dashboard" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Sliders size={14} /> Open Admin Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Access to Admin Workbenches */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-title)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Platform Oversight
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/admin/dashboard" style={{ textDecoration: 'none', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-subtle)', fontSize: '0.86rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={15} style={{ color: 'var(--primary-600)' }} /> User Accounts
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </Link>
                <Link to="/admin/dashboard" style={{ textDecoration: 'none', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-subtle)', fontSize: '0.86rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={15} style={{ color: '#f59e0b' }} /> Verification Queue
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </Link>
                <Link to="/admin/dashboard" style={{ textDecoration: 'none', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-subtle)', fontSize: '0.86rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} style={{ color: '#3b82f6' }} /> Bookings Oversight
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Account Details Form */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem', fontWeight: 700 }}>
              Operator Account Details
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
              Your operator credentials and contact details used for audit trails and platform notices.
            </p>

            <form onSubmit={handleSubmit} id="admin-profile-form">
              {/* Full Name */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="admin-name" className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} style={{ color: 'var(--primary-600)' }} /> Full Name *
                </label>
                <input
                  type="text"
                  id="admin-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                  className="form-input"
                  placeholder="e.g., Alex Johnson"
                  disabled={isSubmitting}
                />
              </div>

              {/* Email Address (Read-only System Identity) */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="admin-email" className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} style={{ color: 'var(--color-text-muted)' }} /> Email Address (System Identifier)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    id="admin-email"
                    value={user?.email || ''}
                    readOnly
                    disabled
                    className="form-input"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed', color: 'var(--color-text-muted)' }}
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  System administrator email is immutable for security and audit integrity.
                </span>
              </div>

              {/* Mobile Phone Number */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="admin-phone" className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} style={{ color: 'var(--primary-600)' }} /> Contact Phone (Indian Mobile)
                </label>
                <input
                  type="tel"
                  id="admin-phone"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  maxLength={15}
                  className={`form-input ${phoneError ? 'form-input-error' : ''}`}
                  placeholder="10-digit mobile number (e.g., 9876543210)"
                  disabled={isSubmitting}
                />
                {phoneError ? (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    {phoneError}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Optional mobile number for platform urgent notifications.
                  </span>
                )}
              </div>

              {/* Operational Region / Base City */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label htmlFor="admin-city" className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} style={{ color: 'var(--primary-600)' }} /> Operational Base City *
                </label>
                <select
                  id="admin-city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  {SUPPORTED_CITIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  <RefreshCw size={15} /> Reset
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  id="save-admin-profile-btn"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
