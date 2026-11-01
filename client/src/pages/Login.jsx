import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, LogIn, CheckCircle2, Mail } from 'lucide-react';
import PasswordInput from '../components/common/PasswordInput';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { validateEmail } from '../utils/validation';

/**
 * Login Page Component
 * Connects with Express JWT Authentication & MongoDB Atlas
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, authError, setAuthError } = useAuth();

  const [role, setRole] = useState('customer'); // 'customer' | 'provider' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Clear stale auth errors on fresh direct visits to /login
  useEffect(() => {
    if (!location.state?.from && setAuthError) {
      setAuthError(null);
    }
  }, [location.state, setAuthError]);

  const handleTabChange = (selectedRole) => {
    setRole(selectedRole);
    setFormError('');
    if (setAuthError) setAuthError(null);
  };

  const handleSuccessfulAuth = (authenticatedUser) => {
    const requestedFrom = location.state?.from?.pathname;
    const isCompatibleRedirect =
      requestedFrom &&
      requestedFrom !== '/login' &&
      ((authenticatedUser.role === 'customer' && !requestedFrom.startsWith('/provider') && !requestedFrom.startsWith('/admin')) ||
       (authenticatedUser.role === 'provider' && !requestedFrom.startsWith('/customer') && !requestedFrom.startsWith('/admin')) ||
       (authenticatedUser.role === 'admin' && !requestedFrom.startsWith('/customer') && !requestedFrom.startsWith('/provider')));

    if (isCompatibleRedirect) {
      navigate(requestedFrom, { replace: true });
      return;
    }

    if (authenticatedUser.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (authenticatedUser.role === 'provider') {
      navigate('/provider/dashboard', { replace: true });
    } else {
      navigate('/customer/dashboard', { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isLoading) return;
    setFormError('');
    try {
      setIsGoogleLoading(true);
      const user = await loginWithGoogle(role, {}, rememberMe);
      handleSuccessfulAuth(user);
    } catch (err) {
      setFormError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || isGoogleLoading) return;
    setFormError('');

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email address and password.');
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setFormError(emailCheck.error);
      return;
    }

    try {
      setIsLoading(true);
      const user = await login(emailCheck.normalized, password, role, rememberMe);
      handleSuccessfulAuth(user);
    } catch (err) {
      setFormError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem', color: 'var(--color-text-title)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Sign in to continue
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="auth-tabs" role="tablist" aria-label="Select Account Type" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'customer'}
            className={`auth-tab-btn ${role === 'customer' ? 'active' : ''}`}
            onClick={() => handleTabChange('customer')}
            disabled={isLoading || isGoogleLoading}
          >
            Customer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'provider'}
            className={`auth-tab-btn ${role === 'provider' ? 'active' : ''}`}
            onClick={() => handleTabChange('provider')}
            disabled={isLoading || isGoogleLoading}
          >
            Provider
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'admin'}
            className={`auth-tab-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => handleTabChange('admin')}
            disabled={isLoading || isGoogleLoading}
          >
            Admin
          </button>
        </div>

        {/* Validation & Session Inactivity Error Message */}
        {(formError || authError) && (
          <div className="alert-box alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{formError || authError}</span>
          </div>
        )}

        {/* Google Sign-In Option for Customer & Provider */}
        {role !== 'admin' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1rem',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: 'var(--color-bg-card, #ffffff)',
                color: 'var(--color-text-body, #1e293b)',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {isGoogleLoading ? 'Connecting with Google...' : 'Sign in with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: 'var(--color-text-muted)' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border, #e2e8f0)' }} />
              <span style={{ padding: '0 0.75rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or sign in with email
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border, #e2e8f0)' }} />
            </div>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address <span className="required">*</span>
            </label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder={
                  role === 'admin' 
                    ? 'e.g. admin@serveease.com' 
                    : role === 'provider' 
                      ? 'e.g. provider@example.com' 
                      : 'e.g. rahul@example.com'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="login-password">
                Password <span className="required">*</span>
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
                Min 6 characters
              </span>
            </div>
            <PasswordInput
              id="login-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading || isGoogleLoading}
              required
              autoComplete="current-password"
            />
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            <label htmlFor="remember-me" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-text-body)', cursor: 'pointer', userSelect: 'none', margin: 0, fontWeight: 500 }}>
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--primary-600)', width: '1rem', height: '1rem', cursor: 'pointer' }}
                disabled={isLoading || isGoogleLoading}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" block disabled={isLoading || isGoogleLoading} loading={isLoading}>
            <LogIn size={18} />
            Sign In as {role === 'admin' ? 'Administrator' : role === 'provider' ? 'Provider' : 'Customer'}
          </Button>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
