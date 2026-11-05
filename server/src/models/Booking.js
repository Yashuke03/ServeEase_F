import mongoose from 'mongoose';
import { getCityDisplayName } from '../config/cities.js';

/**
 * Booking Schema — ServeEase Core Appointment Entity
 * 
 * Manages the lifecycle of a service booking between a Customer and a Provider:
 * Controlled Statuses:
 * - 'pending': Initial state when customer creates booking request
 * - 'accepted': Confirmed by assigned provider for execution
 * - 'rejected': Declined by assigned provider
 * - 'cancelled': Cancelled by customer or provider before completion
 * - 'completed': Final state marked upon job completion by provider
 */
const bookingSchema = new mongoose.Schema(
  {
    // Customer requesting the service
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true
    },

    // Provider assigned to perform the service
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Provider reference is required'],
      index: true
    },

    // Selected service name (snapshot from provider's catalog)
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      minlength: [2, 'Service name must be at least 2 characters long'],
      maxlength: [150, 'Service name cannot exceed 150 characters']
    },

    // Service category snapshot
    category: {
      type: String,
      trim: true,
      default: ''
    },

    // Canonical City identifier
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },

    // Customer service address
    serviceAddress: {
      type: String,
      required: [true, 'Service delivery address is required'],
      trim: true,
      minlength: [5, 'Service address must be at least 5 characters long'],
      maxlength: [300, 'Service address cannot exceed 300 characters']
    },

    // Optional customer service coordinates
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
      }
    },

    // Requested booking date (format: YYYY-MM-DD)
    bookingDate: {
      type: String,
      required: [true, 'Booking date is required'],
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Booking date must be in YYYY-MM-DD format']
    },

    // Requested time slot (e.g. "10:00 AM", "14:30")
    bookingTime: {
      type: String,
      required: [true, 'Booking time is required'],
      trim: true,
      minlength: [2, 'Booking time must be specified'],
      maxlength: [30, 'Booking time cannot exceed 30 characters']
    },

    // Optional customer instructions or problem notes
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    // Agreed or quoted price (server-validated starting charge or estimate)
    price: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Price cannot be negative']
    },

    // Pricing type indicator
    priceType: {
      type: String,
      enum: {
        values: ['starting_charge', 'hourly', 'quote_on_inspection'],
        message: '{VALUE} is not a recognized pricing type'
      },
      default: 'starting_charge'
    },

    // Controlled status lifecycle
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'in_progress', 'rejected', 'cancelled', 'completed'],
        message: '{VALUE} is not a valid booking status'
      },
      default: 'pending',
      index: true
    },

    // Rejection reason if declined by provider
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },

    // Cancellation reason if cancelled
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    },

    // User who cancelled the booking
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Timestamp when provider marked job as completed
    completedAt: {
      type: Date,
      default: null
    },

    // Arrival verification OTP fields (booking-specific, cryptographically hashed)
    arrivalOtpHash: {
      type: String,
      default: null,
      select: false
    },

    arrivalOtpExpires: {
      type: Date,
      default: null
    },

    arrivalOtpAttempts: {
      type: Number,
      default: 0
    },

    arrivalOtpVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    arrivedAt: {
      type: Date,
      default: null
    },

    arrivalOtpSeed: {
      type: String,
      default: null,
      select: false
    },

    // Audit trail of status changes
    statusHistory: [
      {
        status: {
          type: String,
          required: true
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        note: {
          type: String,
          default: ''
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.arrivalOtpHash;
        delete ret.arrivalOtpSeed;
        if (ret.city) {
          ret.cityName = getCityDisplayName(ret.city);
        }
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.arrivalOtpHash;
        delete ret.arrivalOtpSeed;
        if (ret.city) {
          ret.cityName = getCityDisplayName(ret.city);
        }
        return ret;
      }
    }
  }
);

// Compound index to quickly find user bookings and detect duplicate submissions
bookingSchema.index({ customer: 1, provider: 1, bookingDate: 1, bookingTime: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1, createdAt: -1 });
bookingSchema.index({ customer: 1, status: 1, createdAt: -1 });

// Concurrency Guard 1: Prevent provider double-booking across confirmed slots.
// At most ONE booking can be in 'accepted' or 'in_progress' status for any provider at a given date & time slot.
// Multiple pending, cancelled, rejected, or completed bookings remain unconstrained.
bookingSchema.index(
  { provider: 1, bookingDate: 1, bookingTime: 1 },
  {
    unique: true,
    name: 'uniq_provider_confirmed_slot',
    partialFilterExpression: {
      status: { $in: ['accepted', 'in_progress'] }
    }
  }
);

// Concurrency Guard 2: Prevent customer double-click and duplicate pending submissions.
// A customer can have at most ONE 'pending' booking for a specific provider, date, and time slot simultaneously.
bookingSchema.index(
  { customer: 1, provider: 1, bookingDate: 1, bookingTime: 1 },
  {
    unique: true,
    name: 'uniq_customer_pending_slot',
    partialFilterExpression: {
      status: 'pending'
    }
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
