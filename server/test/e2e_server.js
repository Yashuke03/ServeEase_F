import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app, { allowedOrigins } from '../src/app.js';
import { initSocket } from '../src/socket/index.js';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

let mongod;
let server;
let io;

export async function startE2EServer(port = 5001) {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Seed default admin
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);
  await User.create({
    name: 'Platform Administrator',
    email: 'admin@serveease.com',
    passwordHash,
    role: 'admin',
    status: 'active',
    emailVerified: true
  });

  // Seed test provider
  const provHash = await bcrypt.hash('Provider@123', salt);
  await User.create({
    name: 'Rajesh Sharma',
    email: 'rajesh.provider@example.com',
    phoneNumber: '+919876543210',
    passwordHash: provHash,
    role: 'provider',
    status: 'active',
    city: 'sangli',
    emailVerified: true,
    isAvailable: true,
    providerDetails: {
      category: 'AC & Appliance Repair',
      experienceYears: 5,
      city: 'sangli',
      serviceArea: 'Kupwad / Vishrambag',
      isAvailable: true,
      verificationStatus: 'approved',
      startingPrice: 350,
      servicesOffered: ['AC Deep Cleaning', 'Filter Replacement']
    }
  });

  // Seed test customer
  const custHash = await bcrypt.hash('Customer@123', salt);
  await User.create({
    name: 'Amit Joshi',
    email: 'amit.customer@example.com',
    phoneNumber: '+919822334455',
    passwordHash: custHash,
    role: 'customer',
    status: 'active',
    city: 'sangli',
    emailVerified: true
  });

  const httpServer = http.createServer(app);
  io = initSocket(httpServer, ['*'], (origin, cb) => cb(null, true));

  await new Promise((resolve) => {
    server = httpServer.listen(port, resolve);
  });

  console.log(`[E2E Server] Running at http://localhost:${port} with isolated MongoMemoryServer`);
  return { server, mongod, io };
}

export async function stopE2EServer() {
  if (io) await new Promise((res) => io.close(res));
  if (server) await new Promise((res) => server.close(res));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
  console.log('[E2E Server] Stopped successfully.');
}

// If run directly:
if (process.argv[1]?.endsWith('e2e_server.js')) {
  startE2EServer(process.env.PORT || 5001).catch(console.error);
  process.on('SIGINT', async () => {
    await stopE2EServer();
    process.exit(0);
  });
}
