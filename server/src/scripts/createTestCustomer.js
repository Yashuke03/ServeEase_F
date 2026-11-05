import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Test Customer Provisioning Script
 * 
 * Safely provisions or resets a pre-verified test customer account in MongoDB for
 * administrative QA, booking simulations, and automated or manual feature validation.
 * 
 * Bypasses third-party OAuth (Firebase/Google) and email OTP verification by pre-authorizing
 * credentials and marking emailVerified: true directly in the development/staging database.
 * 
 * Usage:
 *   node src/scripts/createTestCustomer.js
 *   node src/scripts/createTestCustomer.js --email=fake.test@gmail.com --password=Secret123 --name="Test Customer" --city=sangli
 */
const provisionTestCustomer = async () => {
  console.log('====================================================');
  console.log('🧪 ServeEase — Provision Test Customer (QA / Staging)');
  console.log('====================================================');

  const getArg = (prefix) => process.argv.find(arg => arg.startsWith(prefix))?.split('=')[1];

  const email = (getArg('--email=') || process.env.TEST_CUSTOMER_EMAIL || 'test.customer@gmail.com').trim().toLowerCase();
  const password = getArg('--password=') || process.env.TEST_CUSTOMER_PASSWORD || 'TestCustomer123';
  const name = getArg('--name=') || 'Rahul Patil (Test Customer)';
  const city = (getArg('--city=') || 'sangli').trim().toLowerCase();
  const phone = getArg('--phone=') || '+91 9822100099';
  const address = getArg('--address=') || 'Parijat Apartment, Vishrambag, Sangli';
  const lat = Number(getArg('--lat=') || 16.8457);
  const lng = Number(getArg('--lng=') || 74.6015);

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

    let customer = await User.findOne({ email });

    if (customer) {
      console.log(`🔄 Updating existing test customer "${email}"...`);
      customer.name = name;
      customer.passwordHash = passwordHash;
      customer.role = 'customer';
      customer.city = city;
      customer.phoneNumber = phone;
      customer.emailVerified = true;
      customer.emailVerifiedAt = new Date();
      customer.termsAccepted = true;
      customer.termsAcceptedAt = new Date();
      customer.location = {
        address,
        latitude: lat,
        longitude: lng
      };
      await customer.save();
      console.log('🎉 Existing test customer credentials & location updated successfully!');
    } else {
      console.log(`✨ Creating new pre-verified test customer "${email}"...`);
      customer = await User.create({
        name,
        email,
        passwordHash,
        role: 'customer',
        city,
        phoneNumber: phone,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        location: {
          address,
          latitude: lat,
          longitude: lng
        }
      });
      console.log('🎉 Test customer created successfully!');
    }

    console.log('----------------------------------------------------');
    console.log(`👤 Name:      ${customer.name}`);
    console.log(`📧 Email:     ${customer.email}`);
    console.log(`🔑 Password:  ${password}`);
    console.log(`🛡️  Role:      ${customer.role}`);
    console.log(`📍 City:      ${customer.city}`);
    console.log(`🏠 Address:   ${customer.location?.address}`);
    console.log(`🌐 GPS:       ${customer.location?.latitude}, ${customer.location?.longitude}`);
    console.log(`✅ Verified:  ${customer.emailVerified}`);
    console.log(`🆔 Mongo ID:  ${customer._id}`);
    console.log('----------------------------------------------------');
    console.log('👉 You can now sign in directly at /login using this Email and Password.');
    console.log('   (No Firebase, Google OAuth, or email OTP verification required!)');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to provision test customer:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

provisionTestCustomer();
