/**
 * ServeEase — Centralized Frontend API Client
 * 
 * Provides unified, typed API wrappers for authentication, provider discovery,
 * user profile management, and health checks.
 * 
 * Configured via Vite environment variable VITE_API_URL.
 * When VITE_API_URL is unset or empty, requests fall back to relative paths
 * which leverage Vite's local proxy (/api -> http://localhost:5001).
 * Credentials (HttpOnly cookies) are consistently sent with credentials: 'include'.
 */

import { getFirebaseIdToken } from './firebaseAuth.js';

// Strip trailing slashes if configured
const rawBase = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || (typeof process !== 'undefined' ? process.env.VITE_API_URL : '') || '');
const resolveApiBaseUrl = () => {
  const trimmed = rawBase.replace(/\/+$/, '');
  // If running in a browser on a secondary device/LAN IP, but rawBase was hardcoded to localhost,
  // fall back to relative path so Vite proxy forwards requests to backend server safely.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return '';
    }
    // Production cloud deployment fallback: automatically connects to Render backend if env var was omitted
    if (!trimmed) {
      return 'https://api-serveease.onrender.com';
    }
  }
  return trimmed;
};

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Normalizes avatar image URLs, prefixing with backend host if relative
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return '';
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://') || avatarPath.startsWith('data:')) {
    return avatarPath;
  }
  return `${API_BASE_URL}${avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`}`;
};

/**
 * Default request timeout in milliseconds (15 seconds)
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

// Inactivity threshold: 15 minutes of zero user actions
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

function isUserIdle() {
  try {
    const last = parseInt(localStorage.getItem('serveease_last_activity') || '0', 10);
    if (last > 0 && Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Singleton Refresh Token Promise to handle concurrent 401s smoothly
 */
let refreshPromise = null;

async function executeTokenRefresh() {
  if (isUserIdle()) {
    throw new Error('Session expired. Please log in again.');
  }

  if (!refreshPromise) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          throw new Error(json.error || 'Session refresh failed');
        }
        return json;
      })
      .finally(() => {
        clearTimeout(timer);
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (!headers['Authorization']) {
    try {
      const fbToken = await getFirebaseIdToken();
      if (fbToken) {
        headers['Authorization'] = `Bearer ${fbToken}`;
      }
    } catch {
      // ignore
    }
  }

  // Configurable request timeout with 15-second default
  const timeoutMs = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  let timerId = null;

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', () => controller.abort(options.signal.reason), { once: true });
    }
  }

  if (timeoutMs > 0 && typeof setTimeout !== 'undefined') {
    timerId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  }

  const { timeout: _unusedTimeout, signal: _unusedSignal, ...restOptions } = options;

  const config = {
    credentials: 'include',
    ...restOptions,
    headers,
    signal: controller.signal
  };

  // Do not set Content-Type if there's no body or if body is FormData (let browser set multipart boundary)
  if (!config.body || (typeof FormData !== 'undefined' && config.body instanceof FormData)) {
    delete config.headers['Content-Type'];
  }

  let res;
  try {
    res = await fetch(url, config);
  } catch (networkErr) {
    const isTimeout = controller.signal.aborted || networkErr.name === 'AbortError' || networkErr.message?.includes('timed out');
    const errorMsg = isTimeout
      ? `Server request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please verify your connection or backend server.`
      : 'ServeEase server is currently unreachable. Please check your network connection or verify the backend service is running.';
    console.error(`[API ${isTimeout ? 'Timeout' : 'Network Error'}] Failed connecting to ${url}:`, networkErr.message);
    const err = new Error(errorMsg);
    err.status = isTimeout ? 504 : 503;
    err.isNetworkError = true;
    err.isTimeout = isTimeout;
    throw err;
  } finally {
    if (timerId) clearTimeout(timerId);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || (data && data.success === false)) {
    const isSilentAuthRoute = url.includes('/api/auth/me') || url.includes('/api/auth/refresh') || url.includes('/api/auth/login');

    // If 401 Unauthorized and not already retrying, attempt silent refresh using Refresh Token
    const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/refresh');
    if (res.status === 401 && !options._isRetry && !isAuthRoute) {
      try {
        await executeTokenRefresh();
        // Retry the original request with the fresh session cookie
        return await request(endpoint, { ...options, _isRetry: true });
      } catch (err) {
        // Refresh token itself expired, invalid, or blocked by 15-minute idle timeout
        if (typeof window !== 'undefined' && !isSilentAuthRoute) {
          window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { message: err?.message || 'Session expired. Please log in again.' } }));
        }
      }
    }

    let errorMsg = data?.error || data?.message;
    if (!errorMsg) {
      if (res.status === 502) {
        errorMsg = 'ServeEase server is currently unavailable (Bad Gateway). Please verify the backend service is running and try again.';
      } else if (res.status === 503) {
        errorMsg = 'ServeEase service is temporarily unavailable. Please try again shortly.';
      } else if (res.status === 504) {
        errorMsg = 'ServeEase server connection timed out. Please try again.';
      } else {
        errorMsg = `Request failed with status ${res.status}`;
      }
    }
    console.error(`[API Error ${res.status}] ${url}:`, errorMsg);

    // If 401 on active application route (excluding background discovery/login routes), notify auth context
    if (res.status === 401 && typeof window !== 'undefined' && !isSilentAuthRoute) {
      window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { message: errorMsg } }));
    }

    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Helper to retrieve binary document blobs (PDFs, images) with authentication
 */
export async function fetchDocumentBlob(endpoint) {
  if (!endpoint || endpoint.includes('/undefined') || endpoint.endsWith('undefined')) {
    throw new Error('Valid document identifier is required.');
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {};
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('token') || sessionStorage.getItem('token'))
    : null;

  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
      signal: controller.signal
    });
  } catch (networkErr) {
    const isTimeout = controller.signal.aborted || networkErr.name === 'AbortError';
    throw new Error(isTimeout ? 'Document request timed out. Please try again.' : 'Unable to reach document server.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let errorMsg = `Failed to retrieve document (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {
      // response is binary or not JSON
    }
    throw new Error(errorMsg);
  }

  return await res.blob();
}

/**
 * Authentication Endpoints (/api/auth)
 */
export const authApi = {
  login: async (email, password, role, rememberMe = false) => {
    const payload = { email, password, rememberMe: Boolean(rememberMe) };
    if (role) {
      payload.role = role;
    }
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  firebaseLogin: async (idToken, profileData = {}) => {
    return request('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ idToken, ...profileData })
    });
  },

  register: async (userData) => {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  getMe: async () => {
    return request('/api/auth/me', {
      method: 'GET'
    });
  },

  refreshToken: async () => {
    return request('/api/auth/refresh', {
      method: 'POST'
    });
  },

  logout: async () => {
    return request('/api/auth/logout', {
      method: 'POST'
    });
  },

  forgotPassword: async (email) => {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  verifyOtp: async (email, otp) => {
    return request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  resetPassword: async (email, resetToken, newPassword) => {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, newPassword })
    });
  },

  verifyEmailOtp: async (email, otp) => {
    return request('/api/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  resendEmailOtp: async (email) => {
    return request('/api/auth/resend-verification-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }
};

/**
 * User Profile Management Endpoints (/api/users)
 */
export const userApi = {
  getProfile: async () => {
    return request('/api/users/me', {
      method: 'GET'
    });
  },

  updateProfile: async (profileData) => {
    return request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData)
    });
  },

  uploadAvatar: async (fileOrFormData) => {
    const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();
    if (!(fileOrFormData instanceof FormData)) {
      formData.append('avatar', fileOrFormData);
    }
    return request('/api/users/profile/avatar', {
      method: 'POST',
      body: formData
    });
  },

  deleteAvatar: async () => {
    return request('/api/users/profile/avatar', {
      method: 'DELETE'
    });
  }
};

/**
 * Provider Discovery Endpoints (/api/providers)
 */
export const providerApi = {
  getProviders: async ({ 
    city, 
    category, 
    serviceArea,
    available, 
    verified,
    minRating,
    minPrice,
    maxPrice,
    q, 
    sort,
    page = 1, 
    limit = 20 
  } = {}) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (category && category !== 'all') params.set('category', category);
    if (serviceArea && serviceArea.trim()) params.set('serviceArea', serviceArea.trim());
    if (available) params.set('available', 'true');
    if (verified === true || verified === 'true') {
      params.set('verified', 'true');
    } else if (verified === false || verified === 'false') {
      params.set('verified', 'all');
    }
    if (minRating !== undefined && minRating !== null && minRating !== '') params.set('minRating', String(minRating));
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') params.set('minPrice', String(minPrice));
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') params.set('maxPrice', String(maxPrice));
    if (q && q.trim()) params.set('q', q.trim());
    if (sort) params.set('sort', sort);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));

    const queryString = params.toString();
    const endpoint = `/api/providers${queryString ? `?${queryString}` : ''}`;
    return request(endpoint, { method: 'GET' });
  },

  getProviderById: async (id) => {
    return request(`/api/providers/${encodeURIComponent(id)}`, {
      method: 'GET'
    });
  },

  getCities: async () => {
    return request('/api/providers/cities', {
      method: 'GET'
    });
  },

  getCategories: async () => {
    return request('/api/providers/categories', {
      method: 'GET'
    });
  },

  getProfile: async () => {
    return request('/api/providers/profile', {
      method: 'GET'
    });
  },

  updateProfile: async (profileData) => {
    return request('/api/providers/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData)
    });
  },

  getMyServices: async () => {
    return request('/api/providers/my-services', {
      method: 'GET'
    });
  },

  addMyService: async (service) => {
    return request('/api/providers/my-services', {
      method: 'POST',
      body: JSON.stringify({ service })
    });
  },

  updateMyService: async (serviceData, serviceName) => {
    const endpoint = serviceName 
      ? `/api/providers/my-services/${encodeURIComponent(serviceName)}`
      : '/api/providers/my-services';
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(serviceData)
    });
  },

  deleteMyService: async (serviceName) => {
    return request(`/api/providers/my-services/${encodeURIComponent(serviceName)}`, {
      method: 'DELETE'
    });
  },

  uploadDocument: async (formData) => {
    return request('/api/providers/documents', {
      method: 'POST',
      body: formData
    });
  },

  getDocuments: async () => {
    return request('/api/providers/documents', {
      method: 'GET'
    });
  },

  deleteDocument: async (id) => {
    return request(`/api/providers/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  getDocumentBlob: async (id) => {
    if (!id || id === 'undefined') {
      throw new Error('Valid document identifier is required.');
    }
    return fetchDocumentBlob(`/api/providers/documents/${encodeURIComponent(id)}`);
  }
};

/**
 * Booking Management Endpoints (/api/bookings)
 */
export const bookingApi = {
  createBooking: async (bookingData) => {
    return request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  },

  getMyBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/bookings/my${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  getProviderBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/bookings/provider${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  getBookingById: async (id) => {
    return request(`/api/bookings/${encodeURIComponent(id)}`, {
      method: 'GET'
    });
  },

  cancelBooking: async (id, reason = '') => {
    return request(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  },

  acceptBooking: async (id) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/accept`, {
      method: 'PATCH'
    });
  },

  rejectBooking: async (id, reason = '') => {
    return request(`/api/bookings/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  },

  startBooking: async (id) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/start`, {
      method: 'PATCH'
    });
  },

  completeBooking: async (id) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/complete`, {
      method: 'PATCH'
    });
  },

  updateLocation: async (id, location) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/location`, {
      method: 'PATCH',
      body: JSON.stringify(location)
    });
  },

  getBookingLocation: async (id) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/location`, {
      method: 'GET'
    });
  },

  getArrivalOtp: async (id) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/arrival-otp`, {
      method: 'GET'
    });
  },

  verifyArrival: async (id, otp) => {
    return request(`/api/bookings/${encodeURIComponent(id)}/verify-arrival`, {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
  }
};

/**
 * Notification Management Endpoints (/api/notifications)
 */
export const notificationApi = {
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/notifications${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  getUnreadCount: async () => {
    return request('/api/notifications/unread-count', {
      method: 'GET'
    });
  },

  markAsRead: async (id) => {
    return request(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    });
  },

  markAllAsRead: async () => {
    return request('/api/notifications/read-all', {
      method: 'PATCH'
    });
  }
};

/**
 * Real-Time Chat & Conversation Endpoints (/api/conversations)
 */
export const chatApi = {
  getConversations: async () => {
    return request('/api/conversations', {
      method: 'GET'
    });
  },

  createOrGetConversation: async (data) => {
    return request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getConversationById: async (id) => {
    return request(`/api/conversations/${encodeURIComponent(id)}`, {
      method: 'GET'
    });
  },

  getMessages: async (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/conversations/${encodeURIComponent(id)}/messages${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  sendMessage: async (id, text) => {
    return request(`/api/conversations/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  markAsRead: async (id) => {
    return request(`/api/conversations/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    });
  },

  getUnreadCount: async () => {
    return request('/api/conversations/unread-count', {
      method: 'GET'
    });
  }
};

/**
 * Customer Reviews & Ratings Endpoints (/api/reviews)
 */
export const reviewApi = {
  createReview: async ({ bookingId, rating, comment }) => {
    return request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating, comment })
    });
  },

  getProviderReviews: async (providerId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/reviews/provider/${encodeURIComponent(providerId)}${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  getMyReviews: async () => {
    return request('/api/reviews/my', {
      method: 'GET'
    });
  },

  getBookingReview: async (bookingId) => {
    return request(`/api/reviews/booking/${encodeURIComponent(bookingId)}`, {
      method: 'GET'
    });
  },

  getProviderReviewStats: async (providerId) => {
    return request(`/api/reviews/provider/${encodeURIComponent(providerId)}/stats`, {
      method: 'GET'
    });
  },

  reportReview: async (id, reason) => {
    return request(`/api/reviews/${encodeURIComponent(id)}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
};

/**
 * Administrator Management & Moderation Endpoints (/api/admin)
 */
export const adminApi = {
  getStats: async () => {
    return request('/api/admin/stats', {
      method: 'GET'
    });
  },

  getAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/analytics${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/users${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  getUserById: async (id) => {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'GET'
    });
  },

  updateUserStatus: async (id, data) => {
    return request(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteUser: async (id, reason) => {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  },

  getProviders: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/providers${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  verifyProvider: async (id, data) => {
    return request(`/api/admin/providers/${encodeURIComponent(id)}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getProviderDocuments: async (providerId) => {
    return request(`/api/admin/providers/${encodeURIComponent(providerId)}/documents`, {
      method: 'GET'
    });
  },

  getDocumentBlob: async (documentId) => {
    if (!documentId || documentId === 'undefined') {
      throw new Error('Valid document identifier is required.');
    }
    return fetchDocumentBlob(`/api/admin/documents/${encodeURIComponent(documentId)}`);
  },

  getBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/bookings${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  updateBookingMessage: async (id, data) => {
    return request(`/api/admin/bookings/${encodeURIComponent(id)}/message`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteBooking: async (id, data = {}) => {
    return request(`/api/admin/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify(data)
    });
  },

  getReviews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/reviews${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  moderateReview: async (id, data) => {
    return request(`/api/admin/reviews/${encodeURIComponent(id)}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/audit-logs${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  }
};

/**
 * System Health & Diagnostics Endpoints (/api/health)
 */
export const systemApi = {
  getHealth: async () => {
    return request('/api/health', {
      method: 'GET'
    });
  }
};

export default {
  API_BASE_URL,
  getAvatarUrl,
  authApi,
  userApi,
  providerApi,
  bookingApi,
  notificationApi,
  chatApi,
  reviewApi,
  adminApi,
  systemApi
};

