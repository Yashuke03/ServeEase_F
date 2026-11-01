import React, { useState, useRef } from 'react';
import { Pencil, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { userApi, getAvatarUrl } from '../../services/api';

/**
 * AvatarUpload Component
 * 
 * Provides an interactive profile avatar with:
 * - Smart face-centered WebP compression via backend Sharp attention algorithm
 * - Transparent glassmorphic pencil button for changing photo
 * - Direct image validation and immediate optimistic preview
 * - Remove photo option
 */
export default function AvatarUpload({
  user,
  onAvatarChange,
  size = '5.5rem',
  shape = 'circle',
  showRemove = true
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const currentAvatar = previewUrl || getAvatarUrl(user?.avatar || user?.providerDetails?.avatar);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const borderRadius = shape === 'circle' ? '50%' : 'var(--radius-lg, 12px)';

  const handlePencilClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading || isRemoving) return;
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    // 1. Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a JPG, PNG, or WebP photo.');
      return;
    }

    // 2. Validate file size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5 MB. Please choose a smaller file.');
      return;
    }

    // 3. Create local preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // 4. Send to backend for face-centered cropping and WebP compression
    try {
      setIsUploading(true);
      const res = await userApi.uploadAvatar(file);
      if (res && res.success) {
        setPreviewUrl(null);
        if (onAvatarChange) {
          onAvatarChange(res.user);
        }
      } else {
        throw new Error(res?.error || 'Failed to update avatar.');
      }
    } catch (err) {
      setPreviewUrl(null);
      setErrorMessage(err.message || 'Avatar upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleRemoveAvatar = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading || isRemoving) return;

    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    try {
      setIsRemoving(true);
      setErrorMessage('');
      const res = await userApi.deleteAvatar();
      if (res && res.success) {
        setPreviewUrl(null);
        if (onAvatarChange) {
          onAvatarChange(res.user);
        }
      } else {
        throw new Error(res?.error || 'Failed to remove avatar.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove avatar.');
    } finally {
      setIsRemoving(false);
    }
  };

  const hasPhoto = Boolean(user?.avatar || user?.providerDetails?.avatar);

  return (
    <div className="avatar-upload-wrapper" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        aria-label="Upload profile photo"
      />

      {/* Main Avatar Container */}
      <div
        className="avatar-container"
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius,
          margin: '0 auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          backgroundColor: 'var(--primary-100, #e0e7ff)',
          color: 'var(--primary-700, #4338ca)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          border: '3px solid var(--color-surface, #ffffff)'
        }}
      >
        {/* Inner Image or Initials */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={user?.name || 'Profile photo'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
              onError={(e) => {
                // If image fails loading, fallback to initial
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <span style={{ fontSize: `calc(${size} * 0.42)`, fontWeight: 800, userSelect: 'none' }}>
              {userInitial}
            </span>
          )}
        </div>

        {/* Loading overlay when uploading */}
        {(isUploading || isRemoving) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              zIndex: 3
            }}
          >
            <Loader2 size={22} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.68rem', marginTop: '4px', fontWeight: 600 }}>
              {isUploading ? 'Optimizing...' : 'Removing...'}
            </span>
          </div>
        )}

        {/* Transparent Glassmorphic Pencil Button */}
        <button
          type="button"
          onClick={handlePencilClick}
          disabled={isUploading || isRemoving}
          aria-label="Change profile photo"
          title="Change profile picture (auto-centered on face)"
          className="avatar-pencil-btn"
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '2.1rem',
            height: '2.1rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255, 255, 255, 0.55)',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 4,
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.75)';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.45)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.55)';
          }}
        >
          <Pencil size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* Remove photo option if user has uploaded avatar */}
      {showRemove && hasPhoto && !isUploading && (
        <button
          type="button"
          onClick={handleRemoveAvatar}
          disabled={isRemoving}
          style={{
            marginTop: '0.65rem',
            background: 'none',
            border: 'none',
            color: 'var(--color-danger, #ef4444)',
            fontSize: '0.76rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
            opacity: 0.85,
            transition: 'opacity 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
        >
          <Trash2 size={12} /> Remove photo
        </button>
      )}

      {/* Inline Upload Error Notice */}
      {errorMessage && (
        <div
          style={{
            marginTop: '0.5rem',
            color: 'var(--color-danger, #ef4444)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            maxWidth: '180px',
            textAlign: 'center'
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
