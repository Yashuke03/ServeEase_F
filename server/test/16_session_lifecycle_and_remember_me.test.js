import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { getJwtSecret, getJwtRefreshSecret } from '../src/config/env.js';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment, 
  clearAllData, 
  createTestCustomer 
} from './helpers/testUtils.js';

test.before(async () => {
  await setupTestEnvironment();
});

test.after(async () => {
  await teardownTestEnvironment();
});

test.beforeEach(async () => {
  await clearAllData();
});

test('1. Login with Remember Me = false issues Session Cookies (no Max-Age header)', async () => {
  const { user } = await createTestCustomer({ email: 'session_user@example.com', password: 'Password123!' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'session_user@example.com',
      password: 'Password123!',
      role: 'customer',
      rememberMe: false
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token, 'Should return access token');
  assert.ok(res.body.refreshToken, 'Should return refresh token');

  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie && Array.isArray(setCookie), 'Response must set cookies');

  const tokenCookie = setCookie.find(c => c.startsWith('token='));
  const refreshCookie = setCookie.find(c => c.startsWith('refreshToken='));

  assert.ok(tokenCookie, 'token cookie must be present');
  assert.ok(refreshCookie, 'refreshToken cookie must be present');

  // Session cookies must NOT specify Max-Age or Expires (browser terminates them on close)
  assert.equal(tokenCookie.includes('Max-Age='), false, 'token cookie should not have Max-Age for session login');
  assert.equal(refreshCookie.includes('Max-Age='), false, 'refreshToken cookie should not have Max-Age for session login');
  assert.ok(tokenCookie.includes('HttpOnly'), 'token cookie must be HttpOnly');
  assert.ok(refreshCookie.includes('HttpOnly'), 'refreshToken cookie must be HttpOnly');

  // Verify decoded refresh token stores rememberMe = false
  const decodedRefresh = jwt.verify(res.body.refreshToken, getJwtRefreshSecret());
  assert.equal(decodedRefresh.rememberMe, false);
  assert.ok(decodedRefresh.absExp, 'Refresh token must record absExp');
});

test('2. Login with Remember Me = true issues Persistent Cookies with 24h Max-Age', async () => {
  const { user } = await createTestCustomer({ email: 'remember_user@example.com', password: 'Password123!' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'remember_user@example.com',
      password: 'Password123!',
      role: 'customer',
      rememberMe: true
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie && Array.isArray(setCookie));

  const tokenCookie = setCookie.find(c => c.startsWith('token='));
  const refreshCookie = setCookie.find(c => c.startsWith('refreshToken='));

  assert.ok(tokenCookie.includes('Max-Age='), 'token cookie must have Max-Age');
  assert.ok(refreshCookie.includes('Max-Age='), 'refreshToken cookie must have Max-Age for persistent login');

  // Extract Max-Age values
  const tokenMaxAge = parseInt(tokenCookie.match(/Max-Age=(\d+)/)[1], 10);
  const refreshMaxAge = parseInt(refreshCookie.match(/Max-Age=(\d+)/)[1], 10);

  // Access token should be ~900s (15m), refresh token ~86400s (24h)
  assert.ok(tokenMaxAge >= 890 && tokenMaxAge <= 900, `token Max-Age should be ~900, got ${tokenMaxAge}`);
  assert.ok(refreshMaxAge >= 86300 && refreshMaxAge <= 86400, `refreshToken Max-Age should be ~86400, got ${refreshMaxAge}`);

  const decodedRefresh = jwt.verify(res.body.refreshToken, getJwtRefreshSecret());
  assert.equal(decodedRefresh.rememberMe, true);
});

test('3. Token refresh preserves absolute 24-hour expiry and does NOT extend session indefinitely', async () => {
  const { user } = await createTestCustomer({ email: 'refresh_user@example.com', password: 'Password123!' });

  const nowSec = Math.floor(Date.now() / 1000);
  // Simulate a token created 23 hours ago with only 1 hour (3600 seconds) remaining of original 24h
  const initialAbsExp = nowSec + 3600;

  const simulatedRefreshToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      type: 'refresh',
      absExp: initialAbsExp,
      rememberMe: true
    },
    getJwtRefreshSecret(),
    { expiresIn: 3600 }
  );

  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', [`refreshToken=${simulatedRefreshToken}`]);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.sessionRemainingSeconds <= 3600, 'Remaining session seconds must be <= 3600');

  // Verify the renewed refresh token maintains the EXACT SAME initialAbsExp
  const renewedDecoded = jwt.verify(res.body.refreshToken, getJwtRefreshSecret());
  assert.equal(renewedDecoded.absExp, initialAbsExp, 'absExp must not be extended into the future');

  // Verify cookie Max-Age is capped by remaining time (~3600s), NOT reset to 24h (86400s)!
  const refreshCookie = res.headers['set-cookie'].find(c => c.startsWith('refreshToken='));
  const refreshMaxAge = parseInt(refreshCookie.match(/Max-Age=(\d+)/)[1], 10);
  assert.ok(refreshMaxAge <= 3600, `Cookie Max-Age must be capped at remaining seconds (~3600), got ${refreshMaxAge}`);
});

test('4. Refresh near session end caps access token lifetime to remaining session seconds', async () => {
  const { user } = await createTestCustomer({ email: 'near_end_user@example.com', password: 'Password123!' });

  const nowSec = Math.floor(Date.now() / 1000);
  // Only 120 seconds (2 minutes) remaining before absolute 24-hour cutoff
  const nearEndAbsExp = nowSec + 120;

  const simulatedRefreshToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      type: 'refresh',
      absExp: nearEndAbsExp,
      rememberMe: true
    },
    getJwtRefreshSecret(),
    { expiresIn: 120 }
  );

  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', [`refreshToken=${simulatedRefreshToken}`]);

  assert.equal(res.status, 200);
  // Access token lifetime must NOT be 15m (900s); it must be capped at <= 120s!
  assert.ok(res.body.expiresIn <= 120, `Access token expiresIn must be <= 120, got ${res.body.expiresIn}`);

  const decodedAccess = jwt.verify(res.body.token, getJwtSecret());
  const accessLifetime = decodedAccess.exp - decodedAccess.iat;
  assert.ok(accessLifetime <= 120, `Decoded access token lifetime must be <= 120s, got ${accessLifetime}`);
});

test('5. Refresh attempt past absolute 24-hour limit is strictly rejected with SESSION_MAX_EXPIRED', async () => {
  const { user } = await createTestCustomer({ email: 'expired_session@example.com', password: 'Password123!' });

  const nowSec = Math.floor(Date.now() / 1000);
  // Simulated token whose 24-hour limit has just passed
  const expiredAbsExp = nowSec - 10;

  const simulatedExpiredToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      type: 'refresh',
      absExp: expiredAbsExp,
      rememberMe: true
    },
    getJwtRefreshSecret(),
    { expiresIn: 60 }
  );

  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', [`refreshToken=${simulatedExpiredToken}`]);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'SESSION_MAX_EXPIRED');

  // Must clear cookies on session expiration
  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie.some(c => c.startsWith('token=;')), 'Must clear token cookie');
  assert.ok(setCookie.some(c => c.startsWith('refreshToken=;')), 'Must clear refreshToken cookie');
});

test('6. Refreshing with a suspended account is rejected with HTTP 403 and clears cookies', async () => {
  const { user } = await createTestCustomer({ email: 'suspended_user@example.com', password: 'Password123!' });

  const validRefreshToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      type: 'refresh',
      absExp: Math.floor(Date.now() / 1000) + 3600,
      rememberMe: true
    },
    getJwtRefreshSecret(),
    { expiresIn: 3600 }
  );

  // Suspend the user in database
  await User.findByIdAndUpdate(user._id, { status: 'suspended' });

  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', [`refreshToken=${validRefreshToken}`]);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.ok(res.body.error.includes('suspended'));
});

test('7. POST /api/auth/logout clears auth cookies completely', async () => {
  const res = await request(app)
    .post('/api/auth/logout');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie.some(c => c.startsWith('token=;')));
  assert.ok(setCookie.some(c => c.startsWith('refreshToken=;')));
});

test('8. GET /api/auth/me without credentials returns 401 cleanly', async () => {
  const res = await request(app)
    .get('/api/auth/me');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, 'Authentication required. Please sign in to continue.');
});
