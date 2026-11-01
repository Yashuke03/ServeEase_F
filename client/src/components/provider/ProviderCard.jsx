import React from 'react';
import { Star, MapPin, Clock, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import { getAvatarUrl } from '../../services/api';

/**
 * Provider Card Component
 * Presents verified provider info, ratings, area, pricing, and profile link.
 * Strictly avoids fabricating verification or ratings.
 */
export default function ProviderCard({ provider }) {
  const providerId = provider._id || provider.id;
  const isVerified = Boolean(provider.isVerified);
  const isDemo = Boolean(provider.isDemo);
  const isAvailable = provider.isAvailable !== false;
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

  // Location display
  const cityName = provider.cityName || provider.city || '';
  const locationText = [provider.serviceArea, cityName].filter(Boolean).join(', ');

  // Default avatar fallback
  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

  return (
    <article className="provider-card" id={`provider-card-${providerId}`}>
      {/* Header with Avatar & Details */}
      <div className="provider-card-header">
        <img
          src={getAvatarUrl(provider.avatar) || defaultAvatar}
          alt={`Profile portrait of ${provider.name}`}
          className="provider-avatar"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultAvatar;
          }}
        />

        <div className="provider-meta">
          <div className="provider-meta-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{provider.name}</span>

            {/* Verification Badge ONLY when verified */}
            {isVerified && (
              <span title="Verified Professional" style={{ color: 'var(--primary-600)', display: 'inline-flex' }}>
                <ShieldCheck size={16} />
              </span>
            )}

            {/* College Demo Indicator */}
            {isDemo && (
              <span
                style={{
                  fontSize: 'var(--font-size-xs, 0.75rem)',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)'
                }}
                title="Sample demonstration profile for academic testing"
              >
                Demo Profile
              </span>
            )}
          </div>

          <div className="provider-specialty">{provider.title || provider.category}</div>

          <div className="provider-rating-row" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {hasReviews ? (
              <>
                <span className="rating-star-badge">
                  <Star size={12} fill="var(--color-accent-gold)" stroke="var(--color-accent-gold)" />
                  {Number(provider.rating).toFixed(1)}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm, 0.84rem)' }}>({provider.reviewCount} reviews)</span>
              </>
            ) : (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm, 0.82rem)' }}>
                {isDemo ? 'Unrated demo profile' : 'New professional'}
              </span>
            )}

            {provider.experienceYears !== undefined && provider.experienceYears !== null && (
              <>
                <span style={{ color: 'var(--color-text-subtle)' }}>•</span>
                <span style={{ color: 'var(--primary-700)', fontWeight: 600, fontSize: 'var(--font-size-sm, 0.84rem)' }}>
                  {provider.experienceYears} yrs exp
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body with Location & Skills */}
      <div className="provider-card-body">
        {locationText && (
          <div className="provider-location">
            <MapPin size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
            <span>{locationText}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {provider.responseTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} style={{ color: 'var(--primary-600)' }} />
              <span>Response: {provider.responseTime}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isAvailable ? '#16a34a' : '#94a3b8'
            }} />
            <span style={{ fontSize: '0.75rem', color: isAvailable ? '#15803d' : '#64748b', fontWeight: 500 }}>
              {isAvailable ? 'Available Now' : 'Currently Busy'}
            </span>
          </div>
        </div>

        {displaySkills.length > 0 && (
          <div className="provider-skills-list">
            {displaySkills.slice(0, 3).map((skill, index) => (
              <span key={index} className="skill-tag">
                {skill}
              </span>
            ))}
            {displaySkills.length > 3 && (
              <span className="skill-tag" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                +{displaySkills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Data-Backed Transparent Match Reasons */}
        {Array.isArray(provider.matchReasons) && provider.matchReasons.length > 0 && (
          <div 
            className="provider-match-reasons" 
            style={{ 
              marginTop: '0.65rem',
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.35rem' 
            }}
          >
            {provider.matchReasons.slice(0, 3).map((reason, idx) => (
              <span 
                key={idx} 
                style={{
                  fontSize: 'var(--font-size-xs, 0.76rem)',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-full, 9999px)',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-800)',
                  border: '1px solid var(--primary-100)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <CheckCircle2 size={12} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                <span>{reason}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Price and View Action */}
      <div className="provider-card-footer">
        <div className="provider-pricing-info">
          {provider.startingPrice && Number(provider.startingPrice) > 0 ? (
            <>
              <span className="price-label">Visit / Consultation</span>
              <span className="price-amount">₹{provider.startingPrice}</span>
            </>
          ) : (
            <>
              <span className="price-label">Pricing</span>
              <span className="price-amount" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>On Inspection</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button to={`/provider/${providerId}`} variant="outline" size="sm">
            View Details
          </Button>
          <Button to={`/provider/${providerId}`} variant="primary" size="sm">
            Book Service
          </Button>
        </div>
      </div>
    </article>
  );
}
