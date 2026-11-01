import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { initSocket } from '../src/socket/index.js';
import Conversation from '../src/models/Conversation.js';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearAllData,
  createTestCustomer,
  createTestProvider,
  createTestBooking
} from './helpers/testUtils.js';

let server;
let serverPort;
let ioServer;

test.before(async () => {
  await setupTestEnvironment();

  // Create real HTTP server on ephemeral port for live Socket.IO integration
  server = http.createServer(app);
  ioServer = initSocket(server, ['*'], (origin, cb) => cb(null, true));

  await new Promise((resolve) => {
    server.listen(0, () => {
      serverPort = server.address().port;
      resolve();
    });
  });
});

test.after(async () => {
  if (ioServer) {
    await new Promise((resolve) => ioServer.close(resolve));
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await teardownTestEnvironment();
});

test.beforeEach(async () => {
  await clearAllData();
});

test('1. Socket.IO connection is rejected when no authentication token is provided', async () => {
  const socket = Client(`http://localhost:${serverPort}`, {
    transports: ['websocket'],
    reconnection: false
  });

  const err = await new Promise((resolve) => {
    socket.on('connect_error', (error) => {
      resolve(error);
    });
    socket.on('connect', () => {
      socket.disconnect();
      resolve(null);
    });
  });

  assert.ok(err, 'Expected connection error');
  assert.match(err.message, /Authentication required|No token provided/i);
  socket.close();
});

test('2. Authenticated user connects successfully and automatically joins personal room', async () => {
  const { user: customer, token: customerToken } = await createTestCustomer();

  const socket = Client(`http://localhost:${serverPort}`, {
    transports: ['websocket'],
    auth: { token: customerToken },
    reconnection: false
  });

  const connected = await new Promise((resolve) => {
    socket.on('connect', () => resolve(true));
    socket.on('connect_error', (e) => resolve(false));
  });

  assert.equal(connected, true);
  assert.ok(socket.id);
  socket.close();
});

test('3. Socket.IO strictly prevents unauthorized user from joining private conversation room', async () => {
  const { user: customer, token: customerToken } = await createTestCustomer({ email: 'c1@test.com' });
  const { user: provider } = await createTestProvider({ email: 'p1@test.com' });
  const { user: outsider, token: outsiderToken } = await createTestCustomer({ email: 'outsider@test.com' });

  const booking = await createTestBooking({ customer, provider, overrides: { status: 'accepted' } });
  const conv = await Conversation.create({
    booking: booking._id,
    participants: [customer._id, provider._id]
  });

  // Outsider attempts to join
  const socket = Client(`http://localhost:${serverPort}`, {
    transports: ['websocket'],
    auth: { token: outsiderToken },
    reconnection: false
  });

  await new Promise((resolve) => socket.on('connect', resolve));

  const joinResponse = await new Promise((resolve) => {
    socket.emit('join_conversation', { conversationId: conv._id.toString() }, (res) => {
      resolve(res);
    });
  });

  assert.equal(joinResponse.success, false);
  assert.match(joinResponse.error, /Forbidden|not an authorized participant/i);
  socket.close();
});

test('4. End-to-end real-time message dispatch between customer and provider across rooms', async () => {
  const { user: customer, token: customerToken } = await createTestCustomer({ email: 'cust.chat@test.com' });
  const { user: provider, token: providerToken } = await createTestProvider({ email: 'prov.chat@test.com' });

  const booking = await createTestBooking({ customer, provider, overrides: { status: 'accepted' } });
  const conv = await Conversation.create({
    booking: booking._id,
    participants: [customer._id, provider._id]
  });

  const custSocket = Client(`http://localhost:${serverPort}`, {
    transports: ['websocket'],
    auth: { token: customerToken },
    reconnection: false
  });

  const provSocket = Client(`http://localhost:${serverPort}`, {
    transports: ['websocket'],
    auth: { token: providerToken },
    reconnection: false
  });

  await Promise.all([
    new Promise((resolve) => custSocket.on('connect', resolve)),
    new Promise((resolve) => provSocket.on('connect', resolve))
  ]);

  // Both join the authorized room
  await Promise.all([
    new Promise((resolve) => custSocket.emit('join_conversation', { conversationId: conv._id.toString() }, resolve)),
    new Promise((resolve) => provSocket.emit('join_conversation', { conversationId: conv._id.toString() }, resolve))
  ]);

  // Provider listens for incoming real-time message
  const receivedMsgPromise = new Promise((resolve) => {
    provSocket.on('new_message', (msg) => {
      resolve(msg);
    });
  });

  // Customer sends message via socket
  const sendAck = await new Promise((resolve) => {
    custSocket.emit('send_message', {
      conversationId: conv._id.toString(),
      text: 'Technician, when can I expect your arrival?'
    }, resolve);
  });

  assert.equal(sendAck.success, true);
  assert.equal(sendAck.message.text, 'Technician, when can I expect your arrival?');

  const receivedMsg = await receivedMsgPromise;
  assert.equal(receivedMsg.text, 'Technician, when can I expect your arrival?');
  assert.equal(receivedMsg.conversation.toString(), conv._id.toString());

  custSocket.close();
  provSocket.close();
});
