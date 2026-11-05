import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Test Admin Provisioning Script
 * 
 * Safely provisions or resets an Administrator account in MongoDB for
 * administrative QA, document review testing, booking cancellation tests, and dashboard access.
 * 
 * Usage:
 *   node src/scripts/createTestAdmin.js
 *   node src/scripts/createTestAdmin.js --email=fake.admin@gmail.com --password=TestAdmin123 --name="Admin User"
 */
const provisionTestAdmin = async () => {
  console.log('====================================================');
  console.log('🛡️  ServeEase — Provision Test Administrator (QA)');
  console.log('====================================================');

  const getArg = (prefix) => process.argv.find(arg => arg.startsWith(prefix))?.split('=')[1];

  const email = (getArg('--email=') || process.env.TEST_ADMIN_EMAIL || 'fake.admin@gmail.com').trim().toLowerCase();
  const password = getArg('--password=') || process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123';
  const name = getArg('--name=') || 'Platform Administrator (QA)';
  const phone = getArg('--phone=') || '+91 9822100077';

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in server/.env');
    process.exit(1);
  }

  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB.');

    const passwordHash = await User.hashPassword(password);

    let admin = await User.findOne({ email });

    if (admin) {
      console.log(`🔄 Updating credentials for existing administrator "${email}"...`);
      admin.name = name;
      admin.passwordHash = passwordHash;
      admin.role = 'admin';
      admin.status = 'active';
      admin.phoneNumber = phone;
      admin.emailVerified = true;
      admin.emailVerifiedAt = new Date();
      admin.termsAccepted = true;
      admin.termsAcceptedAt = new Date();
      await admin.save();
      console.log('🎉 Existing administrator credentials updated successfully!');
    } else {
      console.log(`✨ Creating new administrator "${email}"...`);
      admin = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        status: 'active',
        phoneNumber: phone,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        termsAccepted: true,
        termsAcceptedAt: new Date()
      });
      console.log('🎉 Administrator account created successfully!');
    }

    console.log('----------------------------------------------------');
    console.log(`👤 Name:      ${admin.name}`);
    console.log(`📧 Email:     ${admin.email}`);
    console.log(`🔑 Password:  ${password}`);
    console.log(`🛡️  Role:      ${admin.role}`);
    console.log(`✅ Status:    ${admin.status}`);
    console.log(`🆔 Mongo ID:  ${admin._id}`);
    console.log('----------------------------------------------------');
    console.log('👉 You can now sign in at /login using this Email and Password.');
    console.log('   You will be redirected straight to /admin/dashboard.');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to provision test admin:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

provisionTestAdmin();
