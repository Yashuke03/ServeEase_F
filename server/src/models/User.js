import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getCityDisplayName } from '../config/cities.js';

/**
 * User Schema — ServeEase Core User Entity
 * 
 * Supports three primary roles:
 * - 'customer': Standard service seekers
 * - 'provider': Skilled technicians and local tradespeople
 * - 'admin': Platform system administrator
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: false,
      default: null,
      select: false // Excluded by default in queries for security
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    role: {
      type: String,
      enum: {
        values: ['customer', 'provider', 'admin'],
        message: '{VALUE} is not an authorized ServeEase role'
      },
      default: 'customer'
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended'],
        message: '{VALUE} is not a valid account status'
      },
      default: 'active'
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    // User's registered city (canonical ID: 'sangli' | 'chhatrapati-sambhajinagar' | 'mumbai' | 'pune' | 'nagpur')
    city: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    // User's configured location / address (applicable to customers and default profile address)
    location: {
      latitude: {
        type: Number,
        default: null,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        default: null,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      },
      address: {
        type: String,
        trim: true,
        default: ''
      }
    },
    avatar: {
      type: String,
      trim: true,
      default: ''
    },
    avatarFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    termsAccepted: {
      type: Boolean,
      default: true
    },
    termsAcceptedAt: {
      type: Date,
      default: null
    },
    // Overall verification state (pending, approved, rejected)
    verificationStatus: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid verification status'
      },
      default: 'pending'
    },
    // Provider profile details (active when role is 'provider')
    providerDetails: {
      category: { type: String, trim: true, default: '' },
      categorySlug: { type: String, trim: true, default: '' },
      title: { type: String, trim: true, default: '' },
      servicesOffered: [{ type: String, trim: true }],
      experienceYears: { type: Number, default: 0 },
      city: { type: String, trim: true, default: '' },
      serviceArea: { type: String, trim: true, default: '' },
      startingPrice: { type: Number, default: 0 },
      hourlyRate: { type: Number, default: 0 },
      isAvailable: { type: Boolean, default: true },
      isVerified: { type: Boolean, default: false },
      verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
      },
      verifiedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      verificationNotes: { type: String, trim: true, default: '' },
      rejectionReason: { type: String, trim: true, default: '' },
      submittedAt: { type: Date, default: null },
      verificationDocuments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VerificationDocument'
      }],
      isDemo: { type: Boolean, default: false },
      bio: { type: String, trim: true, default: '' },
      avatar: { type: String, trim: true, default: '' },
      rating: { type: Number, default: null },
      reviewCount: { type: Number, default: 0 },
      responseTime: { type: String, default: 'Within 1 hour' },
      location: {
        latitude: {
          type: Number,
          default: null,
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90']
        },
        longitude: {
          type: Number,
          default: null,
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180']
        },
        address: { type: String, trim: true, default: '' }
      }
    },
    // Customer Email Verification
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: {
      type: Date,
      default: null
    },
    emailVerificationOtp: {
      type: String,
      select: false,
      default: null
    },
    emailVerificationOtpExpires: {
      type: Date,
      select: false,
      default: null
    },
    // Password Reset via Email OTP
    resetPasswordOtp: {
      type: String,
      select: false,
      default: null
    },
    resetPasswordOtpExpires: {
      type: Date,
      select: false,
      default: null
    },
    resetPasswordToken: {
      type: String,
      select: false,
      default: null
    },
    resetPasswordTokenExpires: {
      type: Date,
      select: false,
      default: null
    }
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.resetPasswordOtp;
        delete ret.resetPasswordOtpExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordTokenExpires;
        delete ret.emailVerificationOtp;
        delete ret.emailVerificationOtpExpires;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.resetPasswordOtp;
        delete ret.resetPasswordOtpExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordTokenExpires;
        delete ret.emailVerificationOtp;
        delete ret.emailVerificationOtpExpires;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Instance method: Verify plaintext candidate password against stored bcrypt hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Instance method: Return a clean safe representation for API responses
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.passwordHash;
  delete obj.emailVerificationOtp;
  delete obj.emailVerificationOtpExpires;
  delete obj.resetPasswordOtp;
  delete obj.resetPasswordOtpExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordTokenExpires;
  delete obj.__v;
  if (obj.city) {
    obj.cityName = getCityDisplayName(obj.city);
  }
  obj.address = obj.location?.address || obj.providerDetails?.location?.address || '';
  return obj;
};

/**
 * Static method: Hash a plaintext password using bcrypt with appropriate salt rounds (12)
 */
userSchema.statics.hashPassword = async function (plaintextPassword) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(plaintextPassword, salt);
};

const User = mongoose.model('User', userSchema);

export default User;
