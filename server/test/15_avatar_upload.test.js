import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import app from '../src/app.js';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment, 
  clearAllData, 
  createTestCustomer, 
  createTestProvider 
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

test('1. POST /api/users/profile/avatar processes photo with sharp attention centering and stores in GridFS', async () => {
  const { user, token } = await createTestCustomer({ name: 'Tanvi Shinde' });

  // Generate a test JPEG image buffer (400x300 red rectangle)
  const sampleImageBuffer = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 220, g: 80, b: 60 }
    }
  }).jpeg().toBuffer();

  const uploadRes = await request(app)
    .post('/api/users/profile/avatar')
    .set('Authorization', `Bearer ${token}`)
    .attach('avatar', sampleImageBuffer, 'sample-photo.jpg');

  assert.equal(uploadRes.status, 200);
  assert.equal(uploadRes.body.success, true);
  assert.ok(uploadRes.body.avatar, 'Response should contain avatar URL');
  assert.ok(uploadRes.body.avatar.startsWith('/api/users/avatar/'), 'Avatar URL should point to /api/users/avatar/:fileId');
  assert.equal(uploadRes.body.user.avatar, uploadRes.body.avatar);

  // 2. Stream avatar publicly without Authorization header
  const streamRes = await request(app)
    .get(uploadRes.body.avatar);

  assert.equal(streamRes.status, 200);
  assert.equal(streamRes.headers['content-type'], 'image/webp');
  assert.ok(streamRes.headers['cache-control']?.includes('public'));

  // Verify the streamed image is a valid 400x400 WebP
  const streamedMetadata = await sharp(streamRes.body).metadata();
  assert.equal(streamedMetadata.format, 'webp');
  assert.equal(streamedMetadata.width, 400);
  assert.equal(streamedMetadata.height, 400);
});

test('2. DELETE /api/users/profile/avatar removes avatar and resets profile', async () => {
  const { token } = await createTestCustomer();

  const sampleImageBuffer = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 50, g: 150, b: 200 }
    }
  }).png().toBuffer();

  // First upload avatar
  const uploadRes = await request(app)
    .post('/api/users/profile/avatar')
    .set('Authorization', `Bearer ${token}`)
    .attach('avatar', sampleImageBuffer, 'avatar.png');

  assert.equal(uploadRes.status, 200);
  assert.ok(uploadRes.body.avatar);

  // Then delete avatar
  const deleteRes = await request(app)
    .delete('/api/users/profile/avatar')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);
  assert.equal(deleteRes.body.avatar, '');
  assert.equal(deleteRes.body.user.avatar, '');

  // Subsequent stream of old avatar should return 404
  const checkOldRes = await request(app)
    .get(uploadRes.body.avatar);
  assert.equal(checkOldRes.status, 404);
});

test('3. Provider avatar upload synchronizes with providerDetails.avatar', async () => {
  const { token } = await createTestProvider({ name: 'Rahul Patil' });

  const sampleImageBuffer = await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 3,
      background: { r: 80, g: 200, b: 120 }
    }
  }).webp().toBuffer();

  const uploadRes = await request(app)
    .post('/api/users/profile/avatar')
    .set('Authorization', `Bearer ${token}`)
    .attach('avatar', sampleImageBuffer, 'profile.webp');

  assert.equal(uploadRes.status, 200);
  assert.equal(uploadRes.body.success, true);
  assert.equal(uploadRes.body.user.avatar, uploadRes.body.avatar);
  assert.equal(uploadRes.body.user.providerDetails.avatar, uploadRes.body.avatar);
});

test('4. Avatar upload rejects non-image or invalid files', async () => {
  const { token } = await createTestCustomer();

  const textFileBuffer = Buffer.from('This is a plain text file, not an image.');

  const res = await request(app)
    .post('/api/users/profile/avatar')
    .set('Authorization', `Bearer ${token}`)
    .attach('avatar', textFileBuffer, 'malicious.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});
