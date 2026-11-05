import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import { getIO } from '../socket/index.js';
import { normalizeCity, isValidCity, getCityDisplayName, SUPPORTED_CITIES } from '../config/cities.js';
import { validateBookingSlot, getKolkataNow } from '../utils/dateTime.js';
import { checkProviderBookingEligibility } from '../utils/providerEligibility.js';
import { generateArrivalOtpPayload, deriveArrivalOtp, hashArrivalOtp } from '../utils/arrivalOtp.js';

/**
 * Helper: Sanitized population options for Customer and Provider references
 */
const CUSTOMER_SAFE_FIELDS = 'name email phoneNumber city';
const PROVIDER_SAFE_FIELDS = 'name email phoneNumber city providerDetails.category providerDetails.title providerDetails.avatar providerDetails.serviceArea providerDetails.startingPrice providerDetails.hourlyRate providerDetails.isAvailable providerDetails.isVerified providerDetails.location';

/**
 * Helper: Normalize date string to YYYY-MM-DD
 */
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper: Broadcast real-time booking status changes to participants and conversation rooms
 */
const broadcastBookingStatusUpdate = async (updated) => {
  try {
    const io = getIO();
    if (!io || !updated) return;
    const customerId = (updated.customer?._id || updated.customer)?.toString();
    const providerId = (updated.provider?._id || updated.provider)?.toString();
    const payload = {
      bookingId: updated._id.toString(),
      status: updated.status,
      completedAt: updated.completedAt,
      booking: updated
    };
    if (customerId) io.to(`user_${customerId}`).emit('booking_status_updated', payload);
    if (providerId) io.to(`user_${providerId}`).emit('booking_status_updated', payload);

    const conv = await Conversation.findOne({ booking: updated._id });
    if (conv) {
      io.to(`conversation_${conv._id.toString()}`).emit('booking_status_updated', payload);
    }
  } catch (err) {
    // Non-blocking
  }
};

/**
 * POST /api/bookings
 * Create a new service booking request (Customer only)
 */
export const createBooking = async (req, res, next) => {
  try {
    // 1. Role enforcement
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Only customer accounts can request service appointments.'
      });
    }

    // 2. Customer Email Verification enforcement
    if (req.user.emailVerified !== true) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before booking an appointment.',
        requiresEmailVerification: true
      });
    }

    const {
      providerId,
      serviceName,
      city,
      serviceAddress,
      bookingDate,
      bookingTime,
      description
    } = req.body;

    // 2. Validate essential fields
    if (!providerId || !serviceName || !city || !serviceAddress || !bookingDate || !bookingTime) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required booking details: providerId, serviceName, city, serviceAddress, bookingDate, and bookingTime.'
      });
    }

    // 3. Validate provider ID format & existence
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider identifier.'
      });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        success: false,
        error: 'Selected service technician not found or is currently inactive.'
      });
    }

    // Provider eligibility check (active, verified, available)
    const eligibility = checkProviderBookingEligibility(provider);
    if (!eligibility.eligible) {
      return res.status(eligibility.statusCode).json({
        success: false,
        error: eligibility.error
      });
    }

    // 4. Validate and normalize city
    const canonicalCity = normalizeCity(city);
    if (!canonicalCity) {
      return res.status(400).json({
        success: false,
        error: `Invalid city "${city}". Supported cities: ${SUPPORTED_CITIES.map(c => c.name).join(', ')}.`
      });
    }

    // 5. Ensure selected provider serves the requested city
    const providerCity = normalizeCity(provider.city || provider.providerDetails?.city);
    if (providerCity !== canonicalCity) {
      return res.status(400).json({
        success: false,
        error: `Technician "${provider.name}" operates in ${getCityDisplayName(providerCity)}, and does not service ${getCityDisplayName(canonicalCity)}.`
      });
    }

    // 6. Ensure selected service is genuinely offered by that provider
    const cleanedServiceName = serviceName.trim().toLowerCase();
    const offeredServices = (provider.providerDetails?.servicesOffered || []).map(s => String(s).trim().toLowerCase());
    const providerCategory = (provider.providerDetails?.category || '').trim().toLowerCase();
    const providerTitle = (provider.providerDetails?.title || '').trim().toLowerCase();

    const matchesService = offeredServices.some(s => s === cleanedServiceName || s.includes(cleanedServiceName) || cleanedServiceName.includes(s));
    const matchesCategory = providerCategory && (providerCategory === cleanedServiceName || providerCategory.includes(cleanedServiceName) || cleanedServiceName.includes(providerCategory));
    const matchesTitle = providerTitle && (providerTitle.includes(cleanedServiceName) || cleanedServiceName.includes(providerTitle));

    if (!matchesService && !matchesCategory && !matchesTitle) {
      return res.status(400).json({
        success: false,
        error: `Technician "${provider.name}" does not offer the requested service "${serviceName}". Please select an offered service.`
      });
    }

    // 7. Validate Date & Time Window in Asia/Kolkata timezone
    const slotValidation = validateBookingSlot(bookingDate, bookingTime);
    if (!slotValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: slotValidation.reason
      });
    }

    // 8. Validate address length
    if (serviceAddress.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a complete service address (at least 5 characters).'
      });
    }

    // 9. Validate optional service coordinates if provided
    let bookingLocation = null;
    const reqLoc = (req.body.location && typeof req.body.location === 'object') ? req.body.location : {};
    const reqLat = req.body.latitude !== undefined ? req.body.latitude : reqLoc.latitude;
    const reqLng = req.body.longitude !== undefined ? req.body.longitude : reqLoc.longitude;

    if (reqLat !== undefined && reqLat !== null && reqLat !== '') {
      const numLat = Number(reqLat);
      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        return res.status(400).json({
          success: false,
          error: 'Invalid latitude. Latitude must be a number between -90 and 90.'
        });
      }
      const numLng = Number(reqLng);
      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        return res.status(400).json({
          success: false,
          error: 'Invalid longitude. Longitude must be a number between -180 and 180.'
        });
      }
      bookingLocation = {
        latitude: numLat,
        longitude: numLng
      };
    }

    // 10. Derive price securely from provider's verified record
    const trustedPrice = Number(provider.providerDetails?.startingPrice) || 0;
    const priceType = trustedPrice > 0 ? 'starting_charge' : 'quote_on_inspection';

    // 11. Concurrency & duplicate prevention
    // Prevent accidental double clicks or duplicate pending requests for same slot
    const existingPending = await Booking.findOne({
      customer: req.user._id,
      provider: provider._id,
      bookingDate: bookingDate.trim(),
      bookingTime: bookingTime.trim(),
      status: 'pending'
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        error: 'You already have a pending booking request with this technician for the requested time slot.'
      });
    }

    // Check for provider scheduling conflict (already has accepted or in-progress booking for this slot)
    const providerConflict = await Booking.findOne({
      provider: provider._id,
      bookingDate: bookingDate.trim(),
      bookingTime: bookingTime.trim(),
      status: { $in: ['accepted', 'in_progress'] }
    });

    if (providerConflict) {
      return res.status(409).json({
        success: false,
        error: `Technician "${provider.name}" already has a confirmed appointment for this time slot. Please choose another time slot.`
      });
    }

    // 12. Create Booking document (protected by database partial unique index against concurrent race conditions)
    let newBooking;
    try {
      newBooking = await Booking.create({
        customer: req.user._id,
        provider: provider._id,
        serviceName: serviceName.trim(),
        category: provider.providerDetails?.category || '',
        city: canonicalCity,
        serviceAddress: serviceAddress.trim(),
        location: bookingLocation,
        bookingDate: bookingDate.trim(),
        bookingTime: bookingTime.trim(),
        description: (description || '').trim(),
        price: trustedPrice,
        priceType,
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: 'Booking requested by customer'
          }
        ]
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'You already have a pending booking request with this technician for the requested time slot.'
        });
      }
      throw createErr;
    }

    // Create persistent notification for assigned provider
    try {
      await Notification.create({
        recipient: provider._id,
        type: 'booking_created',
        title: 'New Service Booking Request',
        message: `${req.user.name} requested an appointment for "${serviceName.trim()}" in ${getCityDisplayName(canonicalCity)} on ${bookingDate.trim()} (${bookingTime.trim()}).`,
        booking: newBooking._id,
        data: {
          bookingId: newBooking._id,
          serviceName: serviceName.trim(),
          customerName: req.user.name,
          city: canonicalCity
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist booking_created notification:', notifErr.message);
    }

    // Populate for response
    const populated = await Booking.findById(newBooking._id)
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    return res.status(201).json({
      success: true,
      message: 'Service appointment requested successfully. The technician will review your request.',
      booking: populated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/my
 * List all bookings belonging to the authenticated customer
 */
export const getCustomerBookings = async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Access restricted to customer accounts.'
      });
    }

    const { status } = req.query;
    const filter = { customer: req.user._id };

    if (status) {
      if (status === 'upcoming') {
        filter.status = { $in: ['pending', 'accepted'] };
      } else if (['pending', 'accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
        filter.status = status;
      }
    }

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .select('+arrivalOtpSeed')
      .populate('provider', PROVIDER_SAFE_FIELDS);

    const sanitized = bookings.map(b => {
      const obj = b.toObject();
      if (b.status === 'accepted' && !b.arrivalOtpVerified && b.arrivalOtpExpires && new Date() <= b.arrivalOtpExpires && b.arrivalOtpSeed) {
        obj.arrivalOtp = deriveArrivalOtp(b._id, b.arrivalOtpSeed);
      }
      delete obj.arrivalOtpSeed;
      delete obj.arrivalOtpHash;
      if (['completed', 'cancelled', 'rejected'].includes(obj.status)) {
        obj.location = null;
        if (obj.provider?.providerDetails?.location) {
          obj.provider.providerDetails.location = null;
        }
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      bookings: sanitized
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/provider
 * List all booking requests belonging to the authenticated provider
 */
export const getProviderBookings = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        error: 'Access restricted to service provider accounts.'
      });
    }

    const { status } = req.query;
    const filter = { provider: req.user._id };

    if (status) {
      if (status === 'upcoming') {
        filter.status = 'accepted';
      } else if (['pending', 'accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
        filter.status = status;
      }
    }

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', CUSTOMER_SAFE_FIELDS);

    const sanitized = bookings.map(b => {
      const obj = b.toObject();
      if (['completed', 'cancelled', 'rejected'].includes(obj.status)) {
        obj.location = null;
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      bookings: sanitized
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/:id
 * Retrieve single booking by ID (accessible only by customer, assigned provider, or admin)
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier format.'
      });
    }

    const booking = await Booking.findById(id)
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.'
      });
    }

    // Access authorization check
    const userId = req.user._id.toString();
    const isCustomer = booking.customer?._id?.toString() === userId;
    const isProvider = booking.provider?._id?.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this booking record.'
      });
    }

    const bookingObj = booking.toObject();

    // Securely derive and expose arrivalOtp ONLY to the customer on active accepted bookings
    if (isCustomer && booking.status === 'accepted' && !booking.arrivalOtpVerified) {
      const raw = await Booking.findById(id).select('+arrivalOtpSeed');
      if (raw?.arrivalOtpSeed && raw.arrivalOtpExpires && new Date() <= raw.arrivalOtpExpires) {
        bookingObj.arrivalOtp = deriveArrivalOtp(booking._id, raw.arrivalOtpSeed);
      }
    }

    delete bookingObj.arrivalOtpSeed;
    delete bookingObj.arrivalOtpHash;

    // Immediately revoke coordinate access for completed, cancelled, or rejected bookings
    if (['completed', 'cancelled', 'rejected'].includes(bookingObj.status)) {
      bookingObj.location = null;
      if (bookingObj.provider?.providerDetails?.location) {
        bookingObj.provider.providerDetails.location = null;
      }
    }

    return res.status(200).json({
      success: true,
      booking: bookingObj
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking (Customer or assigned Provider before completion)
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier.'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.'
      });
    }

    // Verify ownership
    const userId = req.user._id.toString();
    const isCustomer = booking.customer.toString() === userId;
    const isProvider = booking.provider.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to cancel this booking.'
      });
    }

    // Status transition rules:
    // Completed or rejected bookings cannot be cancelled
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Completed service appointments cannot be cancelled.'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'This booking has already been cancelled.'
      });
    }

    if (booking.status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: 'Declined bookings cannot be cancelled.'
      });
    }

    // Atomic update to prevent race conditions
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['pending', 'accepted', 'in_progress'] }
      },
      {
        $set: {
          status: 'cancelled',
          cancelledBy: req.user._id,
          cancellationReason: (reason || '').trim()
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: `Cancelled by ${req.user.role}${reason ? `: ${reason.trim()}` : ''}`
          }
        }
      },
      { returnDocument: 'after' }
    )
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'Unable to cancel booking. It may have already transitioned to another status.'
      });
    }

    // Create persistent notification for the opposite party
    try {
      const isCustomerCancelling = req.user._id.toString() === booking.customer.toString();
      const notifyRecipient = isCustomerCancelling ? booking.provider : booking.customer;
      const notifyTitle = isCustomerCancelling ? 'Appointment Cancelled by Customer' : 'Appointment Cancelled by Technician';
      const notifyMessage = `${req.user.name} cancelled the appointment for "${updated.serviceName}" scheduled on ${updated.bookingDate}${reason ? ` (${reason.trim()})` : '.'}`;

      await Notification.create({
        recipient: notifyRecipient,
        type: 'booking_cancelled',
        title: notifyTitle,
        message: notifyMessage,
        booking: updated._id,
        data: {
          bookingId: updated._id,
          serviceName: updated.serviceName,
          cancelledByRole: req.user.role,
          reason: (reason || '').trim()
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist booking_cancelled notification:', notifErr.message);
    }

    await broadcastBookingStatusUpdate(updated);

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/accept
 * Accept a pending booking (Assigned Provider only)
 */
export const acceptBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        error: 'Only service providers can accept booking requests.'
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier.'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking request not found.'
      });
    }

    // Strictly ensure only the assigned provider can accept
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not the technician assigned to this booking request.'
      });
    }

    // Verify provider is still active and verified before accepting bookings
    const eligibility = checkProviderBookingEligibility(req.user);
    if (!eligibility.eligible) {
      return res.status(eligibility.statusCode).json({
        success: false,
        error: eligibility.error
      });
    }

    // Only pending bookings can be accepted
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot accept booking with current status "${booking.status}". Only pending requests can be accepted.`
      });
    }

    // Check if provider already has an accepted or in-progress booking for this exact date and slot
    const slotConflict = await Booking.findOne({
      provider: req.user._id,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      status: { $in: ['accepted', 'in_progress'] },
      _id: { $ne: booking._id }
    });

    if (slotConflict) {
      return res.status(409).json({
        success: false,
        error: 'You already have another confirmed appointment for this time slot. Please decline or reschedule this request.'
      });
    }

    // Generate booking-specific arrival OTP (only hash and expiry stored for verification; plain OTP never exposed to SP)
    const { seed, hash, expires } = generateArrivalOtpPayload(booking._id);

    // Atomic update protected by unique index against concurrent race conditions
    let updated;
    try {
      updated = await Booking.findOneAndUpdate(
        {
          _id: id,
          provider: req.user._id,
          status: 'pending'
        },
        {
          $set: {
            status: 'accepted',
            arrivalOtpHash: hash,
            arrivalOtpExpires: expires,
            arrivalOtpAttempts: 0,
            arrivalOtpVerified: false,
            arrivedAt: null,
            arrivalOtpSeed: seed
          },
          $push: {
            statusHistory: {
              status: 'accepted',
              changedAt: new Date(),
              changedBy: req.user._id,
              note: 'Booking accepted by technician. Arrival OTP generated for customer.'
            }
          }
        },
        { returnDocument: 'after' }
      )
        .populate('customer', CUSTOMER_SAFE_FIELDS)
        .populate('provider', PROVIDER_SAFE_FIELDS);
    } catch (acceptErr) {
      if (acceptErr.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'You already have another confirmed appointment for this time slot. Please decline or reschedule this request.'
        });
      }
      throw acceptErr;
    }

    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Booking could not be accepted. It may have already been cancelled, declined, or updated.'
      });
    }

    // Create persistent notification for customer
    try {
      await Notification.create({
        recipient: updated.customer._id || updated.customer,
        type: 'booking_accepted',
        title: 'Appointment Confirmed',
        message: `${req.user.name} accepted your appointment request for "${updated.serviceName}" scheduled on ${updated.bookingDate} (${updated.bookingTime}).`,
        booking: updated._id,
        data: {
          bookingId: updated._id,
          serviceName: updated.serviceName,
          providerName: req.user.name
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist booking_accepted notification:', notifErr.message);
    }

    await broadcastBookingStatusUpdate(updated);

    return res.status(200).json({
      success: true,
      message: 'Booking request accepted. Appointment confirmed.',
      booking: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/reject
 * Reject a pending booking (Assigned Provider only)
 */
export const rejectBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        error: 'Only service providers can decline booking requests.'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier.'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking request not found.'
      });
    }

    // Strictly ensure only the assigned provider can reject
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not the technician assigned to this booking request.'
      });
    }

    // Only pending bookings can be rejected
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot decline booking with status "${booking.status}". Only pending requests can be declined.`
      });
    }

    // Atomic update
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: req.user._id,
        status: 'pending'
      },
      {
        $set: {
          status: 'rejected',
          rejectionReason: (reason || '').trim()
        },
        $push: {
          statusHistory: {
            status: 'rejected',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: `Declined by technician${reason ? `: ${reason.trim()}` : ''}`
          }
        }
      },
      { returnDocument: 'after' }
    )
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    // Create persistent notification for customer
    try {
      await Notification.create({
        recipient: updated.customer._id || updated.customer,
        type: 'booking_rejected',
        title: 'Service Request Declined',
        message: `${req.user.name} was unable to accept your request for "${updated.serviceName}"${reason ? `: ${reason.trim()}` : '.'}`,
        booking: updated._id,
        data: {
          bookingId: updated._id,
          serviceName: updated.serviceName,
          providerName: req.user.name,
          reason: (reason || '').trim()
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist booking_rejected notification:', notifErr.message);
    }

    await broadcastBookingStatusUpdate(updated);

    return res.status(200).json({
      success: true,
      message: 'Booking request declined.',
      booking: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/start
 * Mark an accepted booking as in-progress (Assigned Provider only)
 */
export const startBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        error: 'Only service providers can start service appointments.'
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier.'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.'
      });
    }

    // Strictly ensure only the assigned provider can start
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not the technician assigned to this booking.'
      });
    }

    // Only accepted bookings can be started
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Cannot start booking with status "${booking.status}". Only accepted appointments can be started.`
      });
    }

    // Atomic update
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: req.user._id,
        status: 'accepted'
      },
      {
        $set: { status: 'in_progress' },
        $push: {
          statusHistory: {
            status: 'in_progress',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: 'Service started by technician'
          }
        }
      },
      { returnDocument: 'after' }
    )
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'Unable to start booking. It may have already transitioned to another status.'
      });
    }

    // Create persistent notification for customer
    try {
      await Notification.create({
        recipient: updated.customer._id || updated.customer,
        type: 'booking_in_progress',
        title: 'Service Started',
        message: `${req.user.name} has started work on your appointment for "${updated.serviceName}".`,
        booking: updated._id,
        data: {
          bookingId: updated._id,
          serviceName: updated.serviceName,
          providerName: req.user.name
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist booking_in_progress notification:', notifErr.message);
    }

    await broadcastBookingStatusUpdate(updated);

    return res.status(200).json({
      success: true,
      message: 'Service appointment started. Status is now in-progress.',
      booking: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/complete
 * Mark an accepted or in-progress booking as completed (Assigned Provider only)
 */
export const completeBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        error: 'Only service providers can mark service appointments as completed.'
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier.'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.'
      });
    }

    // Strictly ensure only assigned provider can complete
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not the technician assigned to this booking.'
      });
    }

    // Only accepted or in_progress bookings can be completed
    if (booking.status !== 'accepted' && booking.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: `Cannot complete booking with status "${booking.status}". Only accepted or in-progress appointments can be completed.`
      });
    }

    // Atomic update preventing duplicate completion
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: req.user._id,
        status: { $in: ['accepted', 'in_progress'] }
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'completed',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: 'Service marked as completed by technician'
          }
        }
      },
      { returnDocument: 'after' }
    )
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'Unable to complete booking. It may have already transitioned to another status.'
      });
    }

    // Create persistent notification for customer
    try {
      await Notification.create({
        recipient: updated.customer._id || updated.customer,
        type: 'booking_completed',
        title: 'Service Completed',
        message: `${req.user.name} marked your appointment for "${updated.serviceName}" as completed.`,
        booking: updated._id,
        data: {
          bookingId: updated._id,
          serviceName: updated.serviceName,
          providerName: req.user.name,
          completedAt: updated.completedAt
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist booking_completed notification:', notifErr.message);
    }

    await broadcastBookingStatusUpdate(updated);

    return res.status(200).json({
      success: true,
      message: 'Service marked as completed successfully.',
      booking: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/location
 * Update coordinates for an authorized booking (Customer who requested or assigned Provider)
 */
export const updateBookingLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier format.'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.'
      });
    }

    const userId = req.user._id.toString();
    const isCustomer = booking.customer.toString() === userId;
    const isProvider = booking.provider.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update location for this booking.'
      });
    }

    // Prohibit updating coordinates once booking has concluded or become inactive
    if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        error: `Cannot update location for a ${booking.status} booking.`
      });
    }

    const reqLoc = (req.body.location && typeof req.body.location === 'object') ? req.body.location : {};
    const reqLat = req.body.latitude !== undefined ? req.body.latitude : reqLoc.latitude;
    const reqLng = req.body.longitude !== undefined ? req.body.longitude : reqLoc.longitude;

    let lat = null;
    let lng = null;

    if (reqLat !== undefined && reqLat !== null && reqLat !== '') {
      const numLat = Number(reqLat);
      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        return res.status(400).json({
          success: false,
          error: 'Invalid latitude. Latitude must be a number between -90 and 90.'
        });
      }
      lat = numLat;
    }

    if (reqLng !== undefined && reqLng !== null && reqLng !== '') {
      const numLng = Number(reqLng);
      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        return res.status(400).json({
          success: false,
          error: 'Invalid longitude. Longitude must be a number between -180 and 180.'
        });
      }
      lng = numLng;
    }

    booking.location = (lat !== null && lng !== null) ? { latitude: lat, longitude: lng } : null;
    await booking.save();

    const populated = await Booking.findById(id)
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    return res.status(200).json({
      success: true,
      message: 'Booking coordinates updated successfully.',
      booking: populated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/:id/location
 * Secure booking-scoped endpoint to retrieve customer and provider locations
 * Enforces strict authorization and lifecycle access rules:
 * - Caller must be authenticated and either customer or assigned provider for this booking (or admin).
 * - Location sharing is ONLY active during 'accepted' or 'in_progress' status.
 * - Access is immediately revoked upon 'completed', 'cancelled', or 'rejected'.
 * - Access is not yet unlocked during 'pending' (waiting for technician acceptance).
 */
export const getBookingLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier format.'
      });
    }

    const booking = await Booking.findById(id)
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking record not found.'
      });
    }

    const userId = req.user._id.toString();
    const isCustomer = booking.customer?._id?.toString() === userId;
    const isProvider = booking.provider?._id?.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    // 1. Strict authorization: Unrelated customers/providers receive 403 Forbidden
    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to access location data for this booking.'
      });
    }

    // 2. Lifecycle status enforcement: revoke immediately upon completion/cancellation/rejection
    if (booking.status === 'completed') {
      return res.status(409).json({
        success: false,
        revoked: true,
        status: 'completed',
        error: 'Service completed. Location sharing access has been revoked.'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        revoked: true,
        status: 'cancelled',
        error: 'Booking was cancelled. Location sharing is inactive.'
      });
    }

    if (booking.status === 'rejected') {
      return res.status(409).json({
        success: false,
        revoked: true,
        status: 'rejected',
        error: 'Booking request was declined. Location sharing is inactive.'
      });
    }

    if (booking.status === 'pending') {
      return res.status(409).json({
        success: false,
        pending: true,
        status: 'pending',
        error: 'Location sharing becomes available once the technician confirms the booking.'
      });
    }

    // 3. Only 'accepted' and 'in_progress' are eligible for active location sharing
    if (booking.status !== 'accepted' && booking.status !== 'in_progress') {
      return res.status(409).json({
        success: false,
        error: `Location sharing is not available for booking status "${booking.status}".`
      });
    }

    // 4. Build sanitized response payload
    const providerDetails = booking.provider?.providerDetails;
    const providerSavedLocation = providerDetails?.location;
    const hasProviderCoords = providerSavedLocation &&
      providerSavedLocation.latitude !== null &&
      providerSavedLocation.latitude !== undefined &&
      providerSavedLocation.longitude !== null &&
      providerSavedLocation.longitude !== undefined;

    const hasCustomerCoords = booking.location &&
      booking.location.latitude !== null &&
      booking.location.latitude !== undefined &&
      booking.location.longitude !== null &&
      booking.location.longitude !== undefined;

    return res.status(200).json({
      success: true,
      bookingId: booking._id,
      status: booking.status,
      serviceName: booking.serviceName,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      city: booking.city,
      customerLocation: {
        address: booking.serviceAddress,
        latitude: hasCustomerCoords ? Number(booking.location.latitude) : null,
        longitude: hasCustomerCoords ? Number(booking.location.longitude) : null,
        customerName: booking.customer?.name || 'Customer',
        customerPhone: booking.customer?.phoneNumber || null
      },
      providerLocation: {
        address: providerSavedLocation?.address || booking.provider?.city || '',
        latitude: hasProviderCoords ? Number(providerSavedLocation.latitude) : null,
        longitude: hasProviderCoords ? Number(providerSavedLocation.longitude) : null,
        providerName: booking.provider?.name || 'Service Specialist',
        providerPhone: booking.provider?.phoneNumber || null,
        title: providerDetails?.title || providerDetails?.category || 'Technician',
        isBaseLocation: true
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/:id/arrival-otp
 * Retrieve arrival OTP for an accepted booking (Customer only)
 */
export const getArrivalOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(id).select('+arrivalOtpSeed');
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    // Strictly ensure only the customer who booked can view the arrival OTP
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view the arrival code for this booking.'
      });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Arrival code is only available for confirmed appointments. Current status is "${booking.status}".`
      });
    }

    if (booking.arrivalOtpVerified) {
      return res.status(400).json({
        success: false,
        error: 'Technician arrival has already been verified for this booking.'
      });
    }

    if (booking.arrivalOtpExpires && new Date() > booking.arrivalOtpExpires) {
      return res.status(400).json({
        success: false,
        error: 'Arrival code has expired.'
      });
    }

    const arrivalOtp = deriveArrivalOtp(booking._id, booking.arrivalOtpSeed);
    if (!arrivalOtp) {
      return res.status(404).json({
        success: false,
        error: 'Arrival code is not available for this booking.'
      });
    }

    return res.status(200).json({
      success: true,
      arrivalOtp,
      expiresAt: booking.arrivalOtpExpires
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/bookings/:id/verify-arrival
 * Verify Service Provider arrival at customer location using customer-provided OTP (Assigned Provider only)
 */
export const verifyArrival = async (req, res, next) => {
  try {
    // 1. Role enforcement
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        error: 'Only service providers can verify arrival.'
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking identifier format.'
      });
    }

    // 2. Validate input OTP
    const rawOtp = req.body.otp !== undefined ? req.body.otp : req.body.arrivalOtp;
    if (!rawOtp || (typeof rawOtp !== 'string' && typeof rawOtp !== 'number')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide the 6-digit arrival verification code provided by the customer.'
      });
    }

    const cleanOtp = String(rawOtp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'Arrival verification code must be exactly 6 digits.'
      });
    }

    // 3. Find booking with hash and attempts
    const booking = await Booking.findById(id).select('+arrivalOtpHash');
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.'
      });
    }

    // 4. Strictly verify assigned provider ownership
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not the technician assigned to this booking.'
      });
    }

    // 5. Booking lifecycle: Must be in 'accepted' state
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Cannot verify arrival for booking with status "${booking.status}". Only accepted appointments can have arrival verified.`
      });
    }

    // 6. Already verified check
    if (booking.arrivalOtpVerified === true || booking.arrivedAt) {
      return res.status(400).json({
        success: false,
        error: 'Arrival has already been verified for this booking.'
      });
    }

    // 7. Attempt limit check (Max 5 attempts)
    const MAX_ATTEMPTS = 5;
    if ((booking.arrivalOtpAttempts || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts exceeded for this booking. Please contact customer or support.'
      });
    }

    // 8. Expiry check
    if (booking.arrivalOtpExpires && new Date() > booking.arrivalOtpExpires) {
      return res.status(400).json({
        success: false,
        error: 'Arrival verification code has expired.'
      });
    }

    // 9. OTP Hash comparison
    const candidateHash = hashArrivalOtp(cleanOtp);
    if (!booking.arrivalOtpHash || candidateHash !== booking.arrivalOtpHash) {
      // Atomically increment failed attempts
      const updatedFail = await Booking.findByIdAndUpdate(
        id,
        { $inc: { arrivalOtpAttempts: 1 } },
        { returnDocument: 'after' }
      );
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - (updatedFail?.arrivalOtpAttempts || (booking.arrivalOtpAttempts + 1)));
      return res.status(400).json({
        success: false,
        error: remainingAttempts > 0
          ? `Invalid arrival verification code. ${remainingAttempts} attempt(s) remaining.`
          : 'Invalid arrival verification code. Maximum attempts exceeded.'
      });
    }

    // 10. Atomic verification update to prevent race conditions / duplicate verification
    const arrivedTimestamp = new Date();
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: req.user._id,
        status: 'accepted',
        arrivalOtpVerified: { $ne: true },
        arrivalOtpHash: candidateHash
      },
      {
        $set: {
          arrivalOtpVerified: true,
          arrivedAt: arrivedTimestamp,
          arrivalOtpHash: null, // Invalidate OTP hash on consumption
          arrivalOtpSeed: null  // Invalidate seed so it can never be reused or re-derived
        },
        $inc: { arrivalOtpAttempts: 1 },
        $push: {
          statusHistory: {
            status: 'accepted',
            changedAt: arrivedTimestamp,
            changedBy: req.user._id,
            note: 'Technician arrival confirmed on-site via customer OTP'
          }
        }
      },
      { returnDocument: 'after' }
    )
      .populate('customer', CUSTOMER_SAFE_FIELDS)
      .populate('provider', PROVIDER_SAFE_FIELDS);

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'Arrival has already been verified or booking status has changed.'
      });
    }

    // Create notification for customer
    try {
      await Notification.create({
        recipient: updated.customer._id || updated.customer,
        type: 'arrival_verified',
        title: 'Technician Arrival Confirmed',
        message: `${req.user.name} has arrived at your location and confirmed arrival.`,
        booking: updated._id,
        data: {
          bookingId: updated._id,
          providerName: req.user.name,
          arrivedAt: arrivedTimestamp
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist arrival_verified notification:', notifErr.message);
    }

    // Broadcast status update via Socket.IO
    await broadcastBookingStatusUpdate(updated);

    // Return response without any OTP
    return res.status(200).json({
      success: true,
      message: 'Technician arrival verified successfully.',
      booking: updated
    });
  } catch (error) {
    return next(error);
  }
};


