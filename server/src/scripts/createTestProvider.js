import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Test Provider Provisioning Script
 * 
 * Safely provisions or resets a pre-verified service technician account in MongoDB
 * for administrative QA, booking fulfillment tests, and live discovery simulations.
 * 
 * Bypasses email OTP verification and document verification by marking:
 * - role: 'provider'
 * - emailVerified: true
 * - providerDetails.isVerified: true
 * - providerDetails.verificationStatus: 'approved'
 * 
 * Usage:
 *   node src/scripts/createTestProvider.js
 *   node src/scripts/createTestProvider.js --email=fake.provider@gmail.com --password=TestProvider123 --name="Vikram Sharma" --category="Electrical Services" --city=sangli
 */
const provisionTestProvider = async () => {
  console.log('====================================================');
  console.log('⚡ ServeEase — Provision Test Provider (QA / Staging)');
  console.log('====================================================');

  const getArg = (prefix) => process.argv.find(arg => arg.startsWith(prefix))?.split('=')[1];

  const email = (getArg('--email=') || process.env.TEST_PROVIDER_EMAIL || 'fake.provider@gmail.com').trim().toLowerCase();
  const password = getArg('--password=') || process.env.TEST_PROVIDER_PASSWORD || 'TestProvider123';
  const name = getArg('--name=') || 'Vikram Sharma (Test Technician)';
  const category = getArg('--category=') || 'Electrical Services';
  const city = (getArg('--city=') || 'sangli').trim().toLowerCase();
  const phone = getArg('--phone=') || '+91 9822100088';
  const serviceArea = getArg('--area=') || 'Vishrambag, Gaonbhag, Kupwad';
  const startingPrice = Number(getArg('--price=') || 350);
  const hourlyRate = Number(getArg('--hourly=') || 200);
  const address = getArg('--address=') || 'Gaonbhag, Sangli';
  const lat = Number(getArg('--lat=') || 16.8524);
  const lng = Number(getArg('--lng=') || 74.5815);

  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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

    const providerData = {
      name,
      email,
      passwordHash,
      role: 'provider',
      status: 'active',
      city,
      phoneNumber: phone,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      verificationStatus: 'approved',
      location: {
        address,
        latitude: lat,
        longitude: lng
      },
      providerDetails: {
        category,
        categorySlug,
        title: `Certified ${category} Specialist`,
        servicesOffered: [
          `${category} Inspection & Diagnosis`,
          `Standard ${category} Installation`,
          `Urgent Doorstep Repair`,
          `Preventative Maintenance & Safety Check`
        ],
        experienceYears: 6,
        city,
        serviceArea,
        startingPrice,
        hourlyRate,
        isAvailable: true,
        isVerified: true,
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        verifiedBy: null,
        verificationNotes: 'Pre-verified test technician for QA and demo simulation.',
        bio: `Experienced and vetted ${category.toLowerCase()} professional serving ${city}. Available for fast appointments and safety-tested work.`,
        rating: 4.8,
        reviewCount: 9,
        responseTime: 'Within 30 mins',
        isDemo: false,
        location: {
          address,
          latitude: lat,
          longitude: lng
        }
      }
    };

    let provider = await User.findOne({ email });

    if (provider) {
      console.log(`🔄 Updating existing test provider "${email}"...`);
      Object.assign(provider, providerData);
      await provider.save();
      console.log('🎉 Existing test provider credentials & profile updated successfully!');
    } else {
      console.log(`✨ Creating new pre-verified test provider "${email}"...`);
      provider = await User.create(providerData);
      console.log('🎉 Test provider created successfully!');
    }

    console.log('----------------------------------------------------');
    console.log(`👤 Name:         ${provider.name}`);
    console.log(`📧 Email:        ${provider.email}`);
    console.log(`🔑 Password:     ${password}`);
    console.log(`🛡️  Role:         ${provider.role}`);
    console.log(`🔧 Category:     ${provider.providerDetails?.category}`);
    console.log(`📍 City:         ${provider.city}`);
    console.log(`📍 Coverage:     ${provider.providerDetails?.serviceArea}`);
    console.log(`💰 Visit Rate:   ₹${provider.providerDetails?.startingPrice}`);
    console.log(`🌐 GPS:          ${provider.location?.latitude}, ${provider.location?.longitude}`);
    console.log(`✅ Verified:     ${provider.providerDetails?.isVerified} (Status: ${provider.providerDetails?.verificationStatus})`);
    console.log(`🆔 Mongo ID:     ${provider._id}`);
    console.log('----------------------------------------------------');
    console.log('👉 You can now sign in at /login using this Email and Password.');
    console.log('   This provider will also be visible on /services?city=' + city);
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to provision test provider:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

provisionTestProvider();
