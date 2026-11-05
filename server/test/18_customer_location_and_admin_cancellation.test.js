import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import Booking from '../src/models/Booking.js';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearAllData,
  createTestCustomer,
  createTestProvider,
  createTestAdmin
} from './helpers/testUtils.js';

before(async () => {
  await setupTestEnvironment();
});

after(async () => {
  await teardownTestEnvironment();
});

beforeEach(async () => {
  await clearAllData();
});

// =============================================================================
// SUITE 1: CUSTOMER HOME ADDRESS & GPS LOCATION
// =============================================================================

test('1. Customer can save and update home address and GPS coordinates', async () => {
  const { token, user } = await createTestCustomer();

  const updateRes = await request(app)
    .patch('/api/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Ramesh Patil',
      city: 'sangli',
      location: {
        address: 'Flat 402, Shanti Heights, Vishrambag, Sangli',
        latitude: 16.8524,
        longitude: 74.5815
      }
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.user.location.address, 'Flat 402, Shanti Heights, Vishrambag, Sangli');
  assert.equal(updateRes.body.user.location.latitude, 16.8524);
  assert.equal(updateRes.body.user.location.longitude, 74.5815);
  assert.equal(updateRes.body.user.address, 'Flat 402, Shanti Heights, Vishrambag, Sangli');

  // Verify directly from MongoDB persistence
  const savedInDb = await User.findById(user._id);
  assert.equal(savedInDb.location.address, 'Flat 402, Shanti Heights, Vishrambag, Sangli');
  assert.equal(savedInDb.location.latitude, 16.8524);
  assert.equal(savedInDb.location.longitude, 74.5815);
});

test('2. Rejects invalid coordinates with HTTP 400', async () => {
  const { token } = await createTestCustomer();

  const invalidLatRes = await request(app)
    .patch('/api/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      location: {
        address: 'Test Address',
        latitude: 95.0, // Invalid latitude (> 90)
        longitude: 74.5815
      }
    });

  assert.equal(invalidLatRes.status, 400);
  assert.equal(invalidLatRes.body.success, false);
  assert.ok(invalidLatRes.body.error.includes('latitude'));

  const invalidLngRes = await request(app)
    .patch('/api/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      location: {
        address: 'Test Address',
        latitude: 16.8524,
        longitude: 195.0 // Invalid longitude (> 180)
      }
    });

  assert.equal(invalidLngRes.status, 400);
  assert.equal(invalidLngRes.body.success, false);
  assert.ok(invalidLngRes.body.error.includes('longitude'));
});

test('3. Booking creation saves service address and GPS location for provider access', async () => {
  const { token: custToken, user: customer } = await createTestCustomer();
  const { user: provider } = await createTestProvider({ city: 'sangli' });

  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Flat 402, Shanti Heights, Vishrambag',
      location: {
        latitude: 16.8524,
        longitude: 74.5815
      },
      bookingDate: '2026-11-20',
      bookingTime: '10:00 AM - 12:00 PM',
      description: 'Main hall switchboard short circuit'
    });

  assert.equal(bookingRes.status, 201);
  assert.equal(bookingRes.body.success, true);
  const createdBooking = bookingRes.body.booking;
  assert.equal(createdBooking.serviceAddress, 'Flat 402, Shanti Heights, Vishrambag');
  assert.equal(createdBooking.location.latitude, 16.8524);
  assert.equal(createdBooking.location.longitude, 74.5815);

  // Verify in MongoDB
  const dbBooking = await Booking.findById(createdBooking._id);
  assert.equal(dbBooking.serviceAddress, 'Flat 402, Shanti Heights, Vishrambag');
  assert.equal(dbBooking.location.latitude, 16.8524);
  assert.equal(dbBooking.location.longitude, 74.5815);
});

test('4. Updating customer profile home address does NOT overwrite previous booking location', async () => {
  const { token: custToken, user: customer } = await createTestCustomer();
  const { user: provider } = await createTestProvider({ city: 'sangli' });

  // Create booking with initial address & coordinates
  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Original Service Address, Sangli',
      location: {
        latitude: 16.8500,
        longitude: 74.5800
      },
      bookingDate: '2026-11-21',
      bookingTime: '02:00 PM - 04:00 PM'
    });

  assert.equal(bookingRes.status, 201);
  const bookingId = bookingRes.body.booking._id;

  // Now customer updates their profile to a new home address
  const updateRes = await request(app)
    .patch('/api/users/profile')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      location: {
        address: 'Brand New Relocated Address, Miraj',
        latitude: 16.8300,
        longitude: 74.6500
      }
    });

  assert.equal(updateRes.status, 200);

  // Verify previous booking still preserves its original address and location snapshot
  const preservedBooking = await Booking.findById(bookingId);
  assert.equal(preservedBooking.serviceAddress, 'Original Service Address, Sangli');
  assert.equal(preservedBooking.location.latitude, 16.8500);
  assert.equal(preservedBooking.location.longitude, 74.5800);
});

test('5. Existing provider location functionality still works', async () => {
  const { token: provToken, user: provider } = await createTestProvider({ city: 'sangli' });

  const updateRes = await request(app)
    .patch('/api/users/profile')
    .set('Authorization', `Bearer ${provToken}`)
    .send({
      providerDetails: {
        location: {
          address: 'Workshop at Market Yard, Sangli',
          latitude: 16.8600,
          longitude: 74.5900
        }
      }
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.user.providerDetails.location.address, 'Workshop at Market Yard, Sangli');
  assert.equal(updateRes.body.user.providerDetails.location.latitude, 16.8600);
  assert.equal(updateRes.body.user.providerDetails.location.longitude, 74.5900);
});

// =============================================================================
// SUITE 2: ADMIN BOOKING CANCELLATION & PARTICIPANT NOTIFICATIONS
// =============================================================================

test('6. Admin cancels a booking: Customer and Provider both receive notifications and history is preserved', async () => {
  const { token: custToken, user: customer } = await createTestCustomer();
  const { user: provider } = await createTestProvider({ city: 'sangli' });
  const { token: adminToken } = await createTestAdmin();

  // Create booking
  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Flat 402, Shanti Heights, Vishrambag',
      bookingDate: '2026-11-22',
      bookingTime: '10:00 AM - 12:00 PM'
    });

  assert.equal(bookingRes.status, 201);
  const bookingId = bookingRes.body.booking._id;

  // Admin cancels the booking
  const cancelRes = await request(app)
    .delete(`/api/admin/bookings/${bookingId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      reason: 'Safety policy violation at service location'
    });

  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.success, true);
  assert.equal(cancelRes.body.booking.status, 'cancelled');

  // Verify booking still exists in DB with 'cancelled' status (not permanently destroyed)
  const dbBooking = await Booking.findById(bookingId);
  assert.ok(dbBooking, 'Booking record must still exist');
  assert.equal(dbBooking.status, 'cancelled');
  assert.equal(dbBooking.cancellationReason, 'Safety policy violation at service location');

  // Verify customer received exactly ONE cancellation notification
  const customerNotifs = await Notification.find({
    recipient: customer._id,
    type: 'booking_cancelled'
  });
  assert.equal(customerNotifs.length, 1);
  assert.ok(customerNotifs[0].title.includes('Cancelled by Administrator'));
  assert.ok(customerNotifs[0].message.includes('Safety policy violation at service location'));
  assert.equal(customerNotifs[0].data.cancelledByRole, 'admin');

  // Verify provider received exactly ONE cancellation notification
  const providerNotifs = await Notification.find({
    recipient: provider._id,
    type: 'booking_cancelled'
  });
  assert.equal(providerNotifs.length, 1);
  assert.ok(providerNotifs[0].title.includes('Cancelled by Administrator'));
  assert.ok(providerNotifs[0].message.includes('Safety policy violation at service location'));
  assert.equal(providerNotifs[0].data.cancelledByRole, 'admin');
});

test('7. Customer and provider can retrieve their admin cancellation notifications via GET /api/notifications', async () => {
  const { token: custToken, user: customer } = await createTestCustomer();
  const { token: provToken, user: provider } = await createTestProvider({ city: 'sangli' });
  const { token: adminToken } = await createTestAdmin();

  // Create booking
  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Flat 402, Shanti Heights, Vishrambag',
      bookingDate: '2026-11-23',
      bookingTime: '02:00 PM - 04:00 PM'
    });

  const bookingId = bookingRes.body.booking._id;

  // Admin cancels booking
  await request(app)
    .delete(`/api/admin/bookings/${bookingId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Emergency technician reassignment' });

  // Customer fetches notifications
  const custNotifRes = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${custToken}`);

  assert.equal(custNotifRes.status, 200);
  assert.equal(custNotifRes.body.success, true);
  const custCancelNotif = custNotifRes.body.notifications.find(n => n.type === 'booking_cancelled');
  assert.ok(custCancelNotif);
  assert.ok(custCancelNotif.title.includes('Cancelled by Administrator'));

  // Provider fetches notifications
  const provNotifRes = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${provToken}`);

  assert.equal(provNotifRes.status, 200);
  assert.equal(provNotifRes.body.success, true);
  const provCancelNotif = provNotifRes.body.notifications.find(n => n.type === 'booking_cancelled');
  assert.ok(provCancelNotif);
  assert.ok(provCancelNotif.title.includes('Cancelled by Administrator'));
});

test('8. Repeated admin cancellation requests do NOT create duplicate notifications', async () => {
  const { token: custToken, user: customer } = await createTestCustomer();
  const { user: provider } = await createTestProvider({ city: 'sangli' });
  const { token: adminToken } = await createTestAdmin();

  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Flat 402, Shanti Heights, Vishrambag',
      bookingDate: '2026-11-24',
      bookingTime: '10:00 AM - 12:00 PM'
    });

  const bookingId = bookingRes.body.booking._id;

  // First admin cancellation
  const firstRes = await request(app)
    .delete(`/api/admin/bookings/${bookingId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Schedule duplicate' });

  assert.equal(firstRes.status, 200);

  // Second admin cancellation (repeated attempt)
  const secondRes = await request(app)
    .delete(`/api/admin/bookings/${bookingId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Schedule duplicate' });

  assert.equal(secondRes.status, 200);
  assert.equal(secondRes.body.alreadyCancelled, true);

  // Verify notifications count remains exactly 1 for customer and 1 for provider
  const custNotifs = await Notification.find({ recipient: customer._id, type: 'booking_cancelled' });
  assert.equal(custNotifs.length, 1, 'Customer should receive exactly 1 notification even on repeat cancellations');

  const provNotifs = await Notification.find({ recipient: provider._id, type: 'booking_cancelled' });
  assert.equal(provNotifs.length, 1, 'Provider should receive exactly 1 notification even on repeat cancellations');
});

test('9. Unauthorized customer or provider cannot cancel booking through admin endpoint (HTTP 403)', async () => {
  const { token: custToken } = await createTestCustomer();
  const { token: provToken, user: provider } = await createTestProvider({ city: 'sangli' });

  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Flat 402, Shanti Heights, Vishrambag',
      bookingDate: '2026-11-25',
      bookingTime: '10:00 AM - 12:00 PM'
    });

  const bookingId = bookingRes.body.booking._id;

  // Customer attempts admin cancellation -> HTTP 403
  const custAttempt = await request(app)
    .delete(`/api/admin/bookings/${bookingId}`)
    .set('Authorization', `Bearer ${custToken}`)
    .send({ reason: 'Malicious cancellation' });

  assert.equal(custAttempt.status, 403);

  // Provider attempts admin cancellation -> HTTP 403
  const provAttempt = await request(app)
    .delete(`/api/admin/bookings/${bookingId}`)
    .set('Authorization', `Bearer ${provToken}`)
    .send({ reason: 'Malicious cancellation' });

  assert.equal(provAttempt.status, 403);
});
