import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Lock, 
  Power,
  FileText,
  UploadCloud,
  Trash2,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import AvatarUpload from '../components/common/AvatarUpload';
import Autocomplete from '../components/common/Autocomplete';
import { SUPPORTED_CITIES, getCityDisplayName, getCityById } from '../data/cities';
import { SERVICE_CATEGORIES } from '../data/sampleData';
import { providerApi } from '../services/api';
import { validateIndianMobile } from '../utils/validation';

/**
 * Service Provider Profile Page
 * Comprehensive workbench for technicians to configure their contact details,
 * primary trade, service areas, offered packages, pricing, and active availability.
 */
export default function ProviderProfile() {
  const { user, setUser, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    city: 'sangli',
    category: 'Plumbing Services',
    title: '',
    servicesOffered: '',
    experienceYears: 3,
    serviceArea: '',
    startingPrice: 299,
    hourlyRate: 350,
    isAvailable: true,
    bio: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [startingPriceError, setStartingPriceError] = useState('');
  const [hourlyRateError, setHourlyRateError] = useState('');
  const [fetchError, setFetchError] = useState(false);

  // Initialize form state from user object
  useEffect(() => {
    if (user) {
      const details = user.providerDetails || {};
      const servicesString = Array.isArray(details.servicesOffered)
        ? details.servicesOffered.join(', ')
        : (details.servicesOffered || '');

      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        city: user.city || details.city || 'sangli',
        category: details.category || 'Plumbing Services',
        title: details.title || '',
        servicesOffered: servicesString,
        experienceYears: details.experienceYears !== undefined ? details.experienceYears : 3,
        serviceArea: details.serviceArea || '',
        startingPrice: details.startingPrice !== undefined ? details.startingPrice : 299,
        hourlyRate: details.hourlyRate !== undefined ? details.hourlyRate : 350,
        isAvailable: details.isAvailable !== false,
        bio: details.bio || '',
        latitude: details.location?.latitude ?? '',
        longitude: details.location?.longitude ?? '',
        locationAddress: details.location?.address || ''
      });
      setPhoneError('');
      setStartingPriceError('');
      setHourlyRateError('');
    }
  }, [user]);

  // Optional server reload
  const reloadProfile = async () => {
    try {
      setFetchError(false);
      const data = await providerApi.getProfile();
      if (data?.user) {
        const u = data.user;
        const details = u.providerDetails || {};
        const servicesString = Array.isArray(details.servicesOffered)
          ? details.servicesOffered.join(', ')
          : (details.servicesOffered || '');

        setFormData({
          name: u.name || '',
          phoneNumber: u.phoneNumber || '',
          city: u.city || details.city || 'sangli',
          category: details.category || 'Plumbing Services',
          title: details.title || '',
          servicesOffered: servicesString,
          experienceYears: details.experienceYears !== undefined ? details.experienceYears : 3,
          serviceArea: details.serviceArea || '',
          startingPrice: details.startingPrice !== undefined ? details.startingPrice : 299,
          hourlyRate: details.hourlyRate !== undefined ? details.hourlyRate : 350,
          isAvailable: details.isAvailable !== false,
          bio: details.bio || '',
          latitude: details.location?.latitude ?? '',
          longitude: details.location?.longitude ?? '',
          locationAddress: details.location?.address || ''
        });
        setPhoneError('');
        setStartingPriceError('');
        setHourlyRateError('');
      }
    } catch (err) {
      console.warn('Could not refresh provider profile:', err.message);
      setFetchError(true);
    }
  };

  // ========================================================
  // Document Management & Verification State
  // ========================================================
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');
  const [docUploadSuccess, setDocUploadSuccess] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('id_proof');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const res = await providerApi.getDocuments();
      if (res?.success && Array.isArray(res.documents)) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.warn('Could not load documents:', err.message);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setDocUploadError('');
    setDocUploadSuccess('');

    if (!selectedFile) {
      setDocUploadError('Please select a file to upload.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setDocUploadError('File exceeds the 5 MB limit. Please select a smaller document.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setDocUploadError('Unsupported format. Allowed formats: PDF, JPEG, PNG.');
      return;
    }

    try {
      setDocUploadLoading(true);
      const payload = new FormData();
      payload.append('document', selectedFile);
      payload.append('documentType', selectedDocType);

      const res = await providerApi.uploadDocument(payload);
      if (res?.success) {
        setDocUploadSuccess('Verification document uploaded successfully! It is now pending administrator review.');
        setSelectedFile(null);
        const fileEl = document.getElementById('provider-doc-file-input');
        if (fileEl) fileEl.value = '';
        await fetchDocuments();
      } else {
        setDocUploadError(res?.error || 'Failed to upload document.');
      }
    } catch (err) {
      setDocUploadError(err.message || 'Error uploading document.');
    } finally {
      setDocUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      setDocUploadError('');
      const res = await providerApi.deleteDocument(docId);
      if (res?.success) {
        setDocUploadSuccess('Document removed.');
        await fetchDocuments();
      } else {
        setDocUploadError(res?.error || 'Failed to delete document.');
      }
    } catch (err) {
      setDocUploadError(err.message || 'Error deleting document.');
    }
  };

  const handleViewDocument = async (docId) => {
    if (!docId || docId === 'undefined') {
      alert('Document identifier is missing. Cannot view document.');
      return;
    }
    try {
      const blob = await providerApi.getDocumentBlob(docId);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'phoneNumber' && phoneError) {
      const check = validateIndianMobile(value);
      if (check.isValid) setPhoneError('');
    }

    if (name === 'startingPrice' && startingPriceError) {
      if (value !== '') {
        const num = Number(value);
        if (!isNaN(num) && num >= 0 && Number.isFinite(num) && num <= 100000) {
          setStartingPriceError('');
        }
      }
    }

    if (name === 'hourlyRate' && hourlyRateError) {
      if (value === '') {
        setHourlyRateError('');
      } else {
        const num = Number(value);
        if (!isNaN(num) && num >= 0 && Number.isFinite(num) && num <= 100000) {
          setHourlyRateError('');
        }
      }
    }

    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleReset = () => {
    if (user) {
      const details = user.providerDetails || {};
      const servicesString = Array.isArray(details.servicesOffered)
        ? details.servicesOffered.join(', ')
        : (details.servicesOffered || '');

      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        city: user.city || details.city || 'sangli',
        category: details.category || 'Plumbing Services',
        title: details.title || '',
        servicesOffered: servicesString,
        experienceYears: details.experienceYears !== undefined ? details.experienceYears : 3,
        serviceArea: details.serviceArea || '',
        startingPrice: details.startingPrice !== undefined ? details.startingPrice : 299,
        hourlyRate: details.hourlyRate !== undefined ? details.hourlyRate : 350,
        isAvailable: details.isAvailable !== false,
        bio: details.bio || ''
      });
    }
    setPhoneError('');
    setStartingPriceError('');
    setHourlyRateError('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Approved locality suggestions for provider's chosen city
  const activeCityMeta = useMemo(() => getCityById(formData.city), [formData.city]);
  const localityOptions = useMemo(() => {
    if (!activeCityMeta?.popularLocalities) return [];
    return activeCityMeta.popularLocalities.map(loc => ({
      id: loc,
      label: loc,
      description: `${activeCityMeta.name} Area`
    }));
  }, [activeCityMeta]);

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
      setErrorMessage('Please select your primary base city.');
      return;
    }

    const phoneValidation = validateIndianMobile(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Enter a valid 10-digit Indian mobile number.');
      return;
    } else {
      setPhoneError('');
    }

    if (!formData.category.trim()) {
      setErrorMessage('Primary service category is required.');
      return;
    }

    if (Number(formData.experienceYears) < 0) {
      setErrorMessage('Experience years cannot be negative.');
      return;
    }

    const startingPriceNum = Number(formData.startingPrice);
    if (formData.startingPrice === '' || isNaN(startingPriceNum) || startingPriceNum < 0 || !Number.isFinite(startingPriceNum) || startingPriceNum > 100000) {
      setStartingPriceError('Starting fee must be a valid non-negative number up to ₹1,00,000.');
      return;
    } else {
      setStartingPriceError('');
    }

    let hourlyRateVal = 0;
    if (formData.hourlyRate !== '' && formData.hourlyRate !== undefined && formData.hourlyRate !== null) {
      const hourlyRateNum = Number(formData.hourlyRate);
      if (isNaN(hourlyRateNum) || hourlyRateNum < 0 || !Number.isFinite(hourlyRateNum) || hourlyRateNum > 100000) {
        setHourlyRateError('Hourly rate must be a valid non-negative number up to ₹1,00,000.');
        return;
      } else {
        setHourlyRateError('');
        hourlyRateVal = Math.round(hourlyRateNum);
      }
    } else {
      setHourlyRateError('');
    }

    // Convert comma-separated string to array
    const parsedServices = formData.servicesOffered
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const updatePayload = {
        name: formData.name.trim(),
        phoneNumber: phoneValidation.normalized,
        city: formData.city,
        providerDetails: {
          category: formData.category.trim(),
          title: formData.title.trim(),
          servicesOffered: parsedServices,
          experienceYears: Number(formData.experienceYears) || 0,
          serviceArea: formData.serviceArea.trim(),
          startingPrice: Math.round(startingPriceNum),
          hourlyRate: hourlyRateVal,
          isAvailable: Boolean(formData.isAvailable),
          bio: formData.bio.trim(),
          location: (formData.latitude !== '' && formData.longitude !== '')
            ? {
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude),
                address: (formData.locationAddress || '').trim()
              }
            : null
        }
      };

      await updateProfile(updatePayload);
      setSuccessMessage(`Provider profile updated successfully! Changes are live across provider discovery for ${getCityDisplayName(formData.city)}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update provider profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = Boolean(user?.providerDetails?.isVerified);
  const isDemo = Boolean(user?.providerDetails?.isDemo);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'P';

  return (
    <DashboardLayout
      title="Business Profile"
      subtitle="Configure contact details, trade category, service areas, and pricing packages"
    >
      <div className="provider-profile-content" style={{ maxWidth: '1040px' }}>

        {/* Network / Fetch Warning Alert */}
        {fetchError && (
          <div className="alert-box alert-warning" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <div style={{ flex: 1 }}>
              <span>Could not refresh latest profile from backend. Showing local session data.</span>
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
          {/* Left Column: Public Badge & Security Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Account Card */}
            <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <AvatarUpload
                  user={user}
                  onAvatarChange={(updatedUser) => setUser(updatedUser)}
                  size="5.5rem"
                  shape="circle"
                />
              </div>

              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{user?.name || 'Service Provider'}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                <Briefcase size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {formData.category || 'Tradesperson'}
              </p>

              {/* Status Pill */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: formData.isAvailable ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: formData.isAvailable ? 'var(--primary-600)' : 'var(--color-danger)',
                border: `1px solid ${formData.isAvailable ? 'var(--primary-600)' : 'var(--color-danger)'}`,
                fontWeight: 700,
                fontSize: '0.8rem',
                marginBottom: '1.25rem'
              }}>
                <Power size={13} />
                <span>{formData.isAvailable ? "Online • Accepting Calls" : "Offline • Taking a Break"}</span>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />

              <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>Base City: <strong>{getCityDisplayName(formData.city)}</strong></span>
                </div>
                <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>Tel: <strong>{user?.phoneNumber || 'Not set'}</strong></span>
                </div>
                <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span style={{ wordBreak: 'break-all' }}>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>Experience: <strong>{formData.experienceYears} Years</strong></span>
                </div>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={18} style={{ color: isVerified ? 'var(--color-success)' : user?.providerDetails?.verificationStatus === 'rejected' ? 'var(--color-danger)' : 'var(--color-accent-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-title)' }}>Verification Status</h3>
              </div>

              {isVerified ? (
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.7rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    marginBottom: '0.5rem'
                  }}>
                    <CheckCircle2 size={14} />
                    <span>Verified Professional</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Your credentials have been approved by an administrator. Your profile is active and receiving customer bookings in {getCityDisplayName(formData.city)}.
                  </p>
                </div>
              ) : user?.providerDetails?.verificationStatus === 'rejected' ? (
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.7rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    marginBottom: '0.5rem'
                  }}>
                    <ShieldAlert size={14} />
                    <span>Verification Rejected</span>
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-danger-bg)', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-danger)', display: 'block' }}>Rejection Reason:</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-body)' }}>{user?.providerDetails?.rejectionReason || 'Uploaded documents did not meet verification criteria.'}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Please upload valid replacement documents to submit for re-review.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.7rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-accent-gold-bg)',
                    color: 'var(--color-accent-gold)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    marginBottom: '0.5rem'
                  }}>
                    <Clock size={14} />
                    <span>Pending Verification</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Your application is awaiting administrative review. Ensure at least one government ID or trade license is uploaded below. Bookings are enabled once approved.
                  </p>
                </div>
              )}
            </div>

            {/* Platform Security Rules Callout */}
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-text-title)', fontWeight: 700, fontSize: '0.9rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--primary-600)' }} />
                <span>Verification & Integrity Rules</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', lineHeight: 1.5, margin: 0 }}>
                Verification badges, average platform ratings, and account status are strictly audited by ServeEase administrators. Providers cannot self-verify or forge review scores.
              </p>
            </div>
          </div>

          {/* Right Column: Comprehensive Edit Form & Verification Documents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <form onSubmit={handleSubmit}>
              {/* SECTION 1: Personal & Contact Details */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  1. Personal & Contact Details
                </h3>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">
                      Business or Full Name <span className="required">*</span>
                    </label>
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
                      disabled={isSubmitting}
                      placeholder="e.g. Sunil Patil Plumbing"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="phoneNumber">
                      Primary Phone Number <span className="required">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        className={`form-input ${phoneError ? 'form-input-error' : ''}`}
                        style={phoneError ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : {}}
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        placeholder="e.g. 98765 43210 or +91 98765 43210"
                        aria-invalid={Boolean(phoneError)}
                        aria-describedby={phoneError ? 'provider-phone-error' : undefined}
                      />
                      {phoneError && (
                        <AlertCircle
                          size={16}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#dc2626',
                            pointerEvents: 'none'
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    {phoneError && (
                      <div
                        id="provider-phone-error"
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#dc2626',
                          fontSize: '0.82rem',
                          marginTop: '0.35rem',
                          fontWeight: 500
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{phoneError}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  {/* Email (Read-Only) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">
                      Account Email <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontWeight: 'normal' }}>(Read-only)</span>
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
                  </div>

                  {/* Base City */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="city">
                      Base City <span className="required">*</span>
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
                  </div>
                </div>
              </div>

              {/* SECTION 2: Trade & Service Details */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  2. Trade & Service Details
                </h3>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  {/* Category */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="category">
                      Primary Service Category <span className="required">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="form-select"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    >
                      {SERVICE_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="Carpentry Services">Carpentry Services</option>
                      <option value="Painting Services">Painting Services</option>
                      <option value="Appliance Repair">Appliance Repair</option>
                      <option value="Mechanic Services">Mechanic Services</option>
                      <option value="Driver & Transport">Driver & Transport</option>
                    </select>
                  </div>

                  {/* Experience in Years */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="experienceYears">
                      Experience in Years <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="experienceYears"
                      name="experienceYears"
                      className="form-input"
                      value={formData.experienceYears}
                      onChange={handleChange}
                      min={0}
                      max={60}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Professional Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="title">
                    Professional Headline / Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className="form-input"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="e.g. Senior Pipe Fitting & Leakage Specialist"
                  />
                  <span className="form-helper">Displayed under your name on search listings and cards.</span>
                </div>

                {/* Service Area */}
                <div className="form-group">
                  <label className="form-label" htmlFor="serviceArea">
                    Specific Service Localities <span className="required">*</span>
                  </label>
                  <Autocomplete
                    id="serviceArea"
                    name="serviceArea"
                    value={formData.serviceArea}
                    onChange={(val) => setFormData(prev => ({ ...prev, serviceArea: val }))}
                    onSelect={(opt) => setFormData(prev => ({ ...prev, serviceArea: opt ? (opt.label || opt.id) : '' }))}
                    options={localityOptions}
                    placeholder={activeCityMeta ? `e.g. ${activeCityMeta.popularLocalities.slice(0, 3).join(', ')}` : 'Enter neighborhoods or localities'}
                    disabled={isSubmitting}
                    allowCustom={true}
                    clearable={true}
                    emptyMessage={activeCityMeta ? `No known localities for ${activeCityMeta.name}. You can type any locality manually.` : 'Select base city.'}
                  />
                  <span className="form-helper">Neighborhoods and suburbs where you travel for client appointments.</span>
                </div>

                {/* Services Offered */}
                <div className="form-group">
                  <label className="form-label" htmlFor="servicesOffered">
                    Services Offered (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="servicesOffered"
                    name="servicesOffered"
                    className="form-input"
                    value={formData.servicesOffered}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="e.g. Pipe leak repair, tap replacement, drainage unclogging, geyser fitting"
                  />
                  <span className="form-helper">Separate multiple services with commas.</span>
                </div>
              </div>

              {/* SECTION 3: Pricing & Working Availability */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  3. Pricing & Working Availability
                </h3>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  {/* Starting Price */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="startingPrice">
                      Starting Inspection / Visit Fee (₹) <span className="required">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        id="startingPrice"
                        name="startingPrice"
                        className={`form-input ${startingPriceError ? 'form-input-error' : ''}`}
                        style={startingPriceError ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : {}}
                        value={formData.startingPrice}
                        onChange={handleChange}
                        min={0}
                        max={100000}
                        step="1"
                        required
                        disabled={isSubmitting}
                        aria-invalid={Boolean(startingPriceError)}
                        aria-describedby={startingPriceError ? 'startingPrice-error' : undefined}
                      />
                      {startingPriceError && (
                        <AlertCircle
                          size={16}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#dc2626',
                            pointerEvents: 'none'
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    {startingPriceError ? (
                      <div
                        id="startingPrice-error"
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#dc2626',
                          fontSize: '0.82rem',
                          marginTop: '0.35rem',
                          fontWeight: 500
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{startingPriceError}</span>
                      </div>
                    ) : (
                      <span className="form-helper">Base service or visiting charge.</span>
                    )}
                  </div>

                  {/* Hourly Rate */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="hourlyRate">
                      Hourly Labor Rate (₹)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        id="hourlyRate"
                        name="hourlyRate"
                        className={`form-input ${hourlyRateError ? 'form-input-error' : ''}`}
                        style={hourlyRateError ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : {}}
                        value={formData.hourlyRate}
                        onChange={handleChange}
                        min={0}
                        max={100000}
                        step="1"
                        disabled={isSubmitting}
                        aria-invalid={Boolean(hourlyRateError)}
                        aria-describedby={hourlyRateError ? 'hourlyRate-error' : undefined}
                      />
                      {hourlyRateError && (
                        <AlertCircle
                          size={16}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#dc2626',
                            pointerEvents: 'none'
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    {hourlyRateError ? (
                      <div
                        id="hourlyRate-error"
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#dc2626',
                          fontSize: '0.82rem',
                          marginTop: '0.35rem',
                          fontWeight: 500
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{hourlyRateError}</span>
                      </div>
                    ) : (
                      <span className="form-helper">Approximate hourly rate for extended repairs.</span>
                    )}
                  </div>
                </div>

                {/* Availability Toggle */}
                <div style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-text-title)' }}>
                      Accept Incoming Service Bookings
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      When enabled, your profile appears as "Available" in customer search filters.
                    </span>
                  </div>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isAvailable"
                      checked={formData.isAvailable}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary-600)' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: formData.isAvailable ? 'var(--primary-700)' : 'var(--color-text-muted)' }}>
                      {formData.isAvailable ? 'Online' : 'Offline'}
                    </span>
                  </label>
                </div>
              </div>

              {/* SECTION 4: Professional Bio */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  4. Professional Bio & Background
                </h3>

                <div className="form-group">
                  <label className="form-label" htmlFor="bio">
                    About Your Experience & Working Standards
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    className="form-textarea"
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                    maxLength={500}
                    disabled={isSubmitting}
                    placeholder="Briefly describe your years of trade experience, special tools used, emergency availability, or warranty guarantees..."
                  />
                  <span className="form-helper">
                    {formData.bio.length}/500 characters. Shown on your public technician detail page.
                  </span>
                </div>
              </div>

              {/* SECTION 5: Optional Public Service Location & Map Pin */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  5. Map Pin & Geographic Coordinates (Optional)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  Provide GPS coordinates if you wish to display an interactive pin on the customer discovery map. Leave blank if you only offer doorstep visits.
                </p>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="latitude">
                      Latitude (-90 to 90)
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
                      Longitude (-180 to 180)
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

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label" htmlFor="locationAddress">
                    Public Landmark / Service Office Address
                  </label>
                  <input
                    type="text"
                    id="locationAddress"
                    name="locationAddress"
                    className="form-input"
                    value={formData.locationAddress}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="e.g. Near Vishrambag Chowk, Sangli"
                  />
                  <span className="form-helper">This address will be visible on the public map popup.</span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" /> Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Provider Profile
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  Cancel / Revert
                </button>
              </div>
            </form>
          </div>

          {/* Verification Documents Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-text-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} style={{ color: 'var(--primary-600)' }} />
                  Verification Documents & Credentials
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                  Upload government IDs, trade licenses, or certifications for administrator review. Max 5 MB per file (PDF, PNG, JPEG).
                </p>
              </div>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: documents.length > 0 ? '#dcfce7' : '#fef3c7',
                color: documents.length > 0 ? '#166534' : '#92400e'
              }}>
                {documents.length} Document(s) Uploaded
              </div>
            </div>

            {/* Upload Alerts */}
            {docUploadSuccess && (
              <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
                <CheckCircle2 size={16} />
                <span>{docUploadSuccess}</span>
              </div>
            )}
            {docUploadError && (
              <div className="alert-box alert-danger" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={16} />
                <span>{docUploadError}</span>
              </div>
            )}

            {/* Upload Form Box */}
            <form onSubmit={handleFileUpload} style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 1rem', color: 'var(--color-text-title)' }}>
                Upload New Document
              </h4>

              <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="provider-doc-type" style={{ fontSize: '0.85rem' }}>
                    Document Type <span className="required">*</span>
                  </label>
                  <select
                    id="provider-doc-type"
                    className="form-control"
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    disabled={docUploadLoading}
                    style={{ fontSize: '0.85rem', height: '38px' }}
                  >
                    <option value="id_proof">Government Photo ID (Aadhaar, PAN, Voter ID)</option>
                    <option value="trade_license">Trade License / Shop Act Registration</option>
                    <option value="address_proof">Address Proof (Utility Bill, Rent Agreement)</option>
                    <option value="certification">Professional / Technical Certification</option>
                    <option value="other">Other Official Credential</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="provider-doc-file-input" style={{ fontSize: '0.85rem' }}>
                    Select File (PDF, PNG, JPEG, max 5 MB) <span className="required">*</span>
                  </label>
                  <input
                    type="file"
                    id="provider-doc-file-input"
                    className="form-control"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    disabled={docUploadLoading}
                    style={{ fontSize: '0.85rem', height: '38px', padding: '0.35rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={docUploadLoading || !selectedFile}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                >
                  {docUploadLoading ? (
                    <>
                      <RefreshCw size={14} className="spin-animation" /> Uploading Document...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} /> Upload for Verification
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Uploaded Documents List */}
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem', color: 'var(--color-text-title)' }}>
              Uploaded Verification Files
            </h4>

            {documentsLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
                <RefreshCw size={20} className="spin-animation" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>Loading verification documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                <FileText size={28} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--color-text-title)', fontSize: '0.9rem' }}>
                  No verification documents uploaded yet
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Upload your government ID or trade license using the form above to become eligible for customer bookings.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map((doc) => {
                  const typeLabels = {
                    id_proof: 'Government Photo ID',
                    trade_license: 'Trade License',
                    address_proof: 'Address Proof',
                    certification: 'Professional Certification',
                    other: 'Other Credential'
                  };
                  const statusConfig = {
                    approved: { label: 'Approved', bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: CheckCircle2 },
                    rejected: { label: 'Rejected', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', icon: ShieldAlert },
                    pending: { label: 'Pending Review', bg: 'var(--color-accent-gold-bg)', color: 'var(--color-accent-gold)', icon: Clock }
                  };
                  const sc = statusConfig[doc.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;

                  const docId = doc._id || doc.id;
                  return (
                    <div
                      key={docId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-card)',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ minWidth: '220px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-title)' }}>
                            {typeLabels[doc.documentType] || doc.documentType}
                          </strong>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: sc.bg,
                            color: sc.color
                          }}>
                            <StatusIcon size={12} />
                            {sc.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {doc.originalFilename} • {formatFileSize(doc.fileSize)} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        {doc.rejectionReason && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-danger)' }}>
                            <strong>Reason:</strong> {doc.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(docId)}
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                        >
                          <ExternalLink size={13} /> View
                        </button>

                        {doc.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(docId)}
                            className="btn btn-outline btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--color-danger)', borderColor: 'var(--color-border)' }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
);
}
