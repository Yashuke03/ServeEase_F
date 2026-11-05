import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import Booking from '../src/models/Booking.js';
import { setupTestEnvironment, teardownTestEnvironment, clearAllData, createTestCustomer, createTestProvider } from './helpers/testUtils.js';

test.before(async () => {
  await setupTestEnvironment();
  // Ensure partial unique indexes are created on the test database
  await Booking.syncIndexes();
});

test.after(async () => {
  await teardownTestEnvironment();
});

test.beforeEach(async () => {
  await clearAllData();
});

const TEST_DATE = '2026-11-20';
const TEST_SLOT = '10:00 AM - 11:00 AM';

test('1. Database Index Validation: Partial unique indexes are active and enforce constraints', async () => {
  const indexes = await Booking.collection.indexes();
  
  const providerIndex = indexes.find(idx => idx.name === 'uniq_provider_confirmed_slot');
  assert.ok(providerIndex, 'uniq_provider_confirmed_slot index must exist');
  assert.equal(providerIndex.unique, true, 'uniq_provider_confirmed_slot must be unique');
  assert.deepEqual(
    providerIndex.partialFilterExpression,
    { status: { $in: ['accepted', 'in_progress'] } },
    'Must filter on accepted and in_progress'
  );

  const customerIndex = indexes.find(idx => idx.name === 'uniq_customer_pending_slot');
  assert.ok(customerIndex, 'uniq_customer_pending_slot index must exist');
  assert.equal(customerIndex.unique, true, 'uniq_customer_pending_slot must be unique');
  assert.deepEqual(
    customerIndex.partialFilterExpression,
    { status: 'pending' },
    'Must filter on pending status'
  );
});

test('2. Concurrency Test: Rapid double-clicks from same customer create exactly ONE booking, 2nd receives HTTP 409', async () => {
  const { token: customerToken, user: customer } = await createTestCustomer({ city: 'sangli' });
  const { user: provider } = await createTestProvider({
    city: 'sangli',
    providerDetails: {
      servicesOffered: ['Electrical Wiring'],
      isVerified: true,
      verificationStatus: 'approved'
    }
  });

  const bookingPayload = {
    providerId: provider._id.toString(),
    serviceName: 'Electrical Wiring',
    city: 'sangli',
    serviceAddress: 'Parijat Apartment, Vishrambag, Sangli',
    bookingDate: TEST_DATE,
    bookingTime: TEST_SLOT,
    description: 'Urgent wiring repair'
  };

  // Dispatch 2 simultaneous booking requests
  const [res1, res2] = await Promise.all([
    request(app).post('/api/bookings').set('Authorization', `Bearer ${customerToken}`).send(bookingPayload),
    request(app).post('/api/bookings').set('Authorization', `Bearer ${customerToken}`).send(bookingPayload)
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(statuses, [201, 409], 'Exactly one request must succeed (201) and one must be rejected (409 Conflict)');

  const conflictRes = res1.status === 409 ? res1 : res2;
  assert.equal(conflictRes.body.success, false);
  assert.match(conflictRes.body.error, /already have a pending booking request/i);

  const mongoRecords = await Booking.find({
    customer: customer._id,
    provider: provider._id,
    bookingDate: TEST_DATE,
    bookingTime: TEST_SLOT
  });

  assert.equal(mongoRecords.length, 1, 'MongoDB must contain exactly ONE booking document');
});

test('3. Multiple pending requests from DIFFERENT customers CAN coexist for the same slot', async () => {
  const { token: customer1Token } = await createTestCustomer({ email: 'clientA@test.local', city: 'sangli' });
  const { token: customer2Token } = await createTestCustomer({ email: 'clientB@test.local', city: 'sangli' });
  const { user: provider } = await createTestProvider({
    email: 'electrician1@test.local',
    city: 'sangli',
    providerDetails: {
      servicesOffered: ['Electrical Wiring'],
      isVerified: true,
      verificationStatus: 'approved'
    }
  });

  // Both customers request appointments for the same technician & slot
  const [res1, res2] = await Promise.all([
    request(app).post('/api/bookings').set('Authorization', `Bearer ${customer1Token}`).send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Address 1, Sangli',
      bookingDate: TEST_DATE,
      bookingTime: TEST_SLOT
    }),
    request(app).post('/api/bookings').set('Authorization', `Bearer ${customer2Token}`).send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Address 2, Sangli',
      bookingDate: TEST_DATE,
      bookingTime: TEST_SLOT
    })
  ]);

  assert.equal(res1.status, 201);
  assert.equal(res2.status, 201);

  const pendingBookings = await Booking.find({
    provider: provider._id,
    bookingDate: TEST_DATE,
    bookingTime: TEST_SLOT,
    status: 'pending'
  });
  assert.equal(pendingBookings.length, 2, 'Two pending requests can coexist before provider acceptance');
});

test('4. Concurrency Test: Simultaneous provider acceptance allows only ONE confirmed appointment; rejects duplicate with HTTP 409', async () => {
  const { token: customer1Token } = await createTestCustomer({ email: 'cust1@test.local', city: 'sangli' });
  const { token: customer2Token } = await createTestCustomer({ email: 'cust2@test.local', city: 'sangli' });
  const { token: providerToken, user: provider } = await createTestProvider({
    email: 'tech@test.local',
    city: 'sangli',
    providerDetails: {
      servicesOffered: ['Electrical Wiring'],
      isVerified: true,
      verificationStatus: 'approved'
    }
  });

  // 1. Create two pending bookings for the same slot
  const b1Res = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${customer1Token}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Address 1, Sangli',
      bookingDate: TEST_DATE,
      bookingTime: TEST_SLOT
    });

  const b2Res = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${customer2Token}`)
    .send({
      providerId: provider._id.toString(),
      serviceName: 'Electrical Wiring',
      city: 'sangli',
      serviceAddress: 'Address 2, Sangli',
      bookingDate: TEST_DATE,
      bookingTime: TEST_SLOT
    });

  assert.equal(b1Res.status, 201);
  assert.equal(b2Res.status, 201);

  const booking1Id = b1Res.body.booking._id;
  const booking2Id = b2Res.body.booking._id;

  // 2. Provider sends simultaneous accept requests for BOTH bookings
  const [acceptRes1, acceptRes2] = await Promise.all([
    request(app).patch(`/api/bookings/${booking1Id}/accept`).set('Authorization', `Bearer ${providerToken}`).send({}),
    request(app).patch(`/api/bookings/${booking2Id}/accept`).set('Authorization', `Bearer ${providerToken}`).send({})
  ]);

  const acceptStatuses = [acceptRes1.status, acceptRes2.status].sort();
  assert.deepEqual(acceptStatuses, [200, 409], 'Exactly one accept request must succeed (200) and one must be rejected (409 Conflict)');

  const conflictAcceptRes = acceptRes1.status === 409 ? acceptRes1 : acceptRes2;
  assert.equal(conflictAcceptRes.body.success, false);
  assert.match(conflictAcceptRes.body.error, /already have another confirmed appointment for this time slot/i);

  // 3. Verify database state
  const acceptedBookingsInDb = await Booking.find({
    provider: provider._id,
    bookingDate: TEST_DATE,
    bookingTime: TEST_SLOT,
    status: 'accepted'
  });

  assert.equal(acceptedBookingsInDb.length, 1, 'MongoDB must have exactly ONE accepted booking for this slot');

  const pendingBookingsInDb = await Booking.find({
    provider: provider._id,
    bookingDate: TEST_DATE,
    bookingTime: TEST_SLOT,
    status: 'pending'
  });

  assert.equal(pendingBookingsInDb.length, 1, 'The unaccepted booking must remain pending (not corrupted or lost)');
});
