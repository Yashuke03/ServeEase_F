import mongoose from 'mongoose';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import VerificationDocument from '../models/VerificationDocument.js';
import { deleteFromGridFS } from '../utils/gridfs.js';
import { recalculateProviderRating } from './reviewController.js';
import { getCityDisplayName, normalizeCity } from '../config/cities.js';
import { getIO } from '../socket/index.js';

// Safe customer / provider projection for admin views
const USER_SAFE_FIELDS = 'name email role city phoneNumber status verificationStatus emailVerified emailVerifiedAt termsAccepted termsAcceptedAt providerDetails location createdAt updatedAt';

/**
 * Helper to compute platform analytics and distributions directly from MongoDB
 */
export const computePlatformAnalytics = async ({ timeframe = '30d', city, category } = {}) => {
  // 1. Calculate timeframe filter
  let startDate = null;
  const now = new Date();
  if (timeframe === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeframe === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  // Base booking match for trends
  const trendMatch = {};
  if (startDate) trendMatch.createdAt = { $gte: startDate };
  if (city && city !== 'all') {
    const canonicalCity = normalizeCity(city);
    if (canonicalCity) trendMatch.city = canonicalCity;
  }
  if (category && category !== 'all') {
    trendMatch.category = new RegExp(category, 'i');
  }

  const [
    totalUsers,
    totalCustomers,
    activeCustomers,
    suspendedCustomers,
    totalProviders,
    verifiedProviders,
    pendingVerifications,
    activeProviders,
    suspendedProviders,
    totalAdmins,
    totalBookings,
    bookingStatusAgg,
    revenueAgg,
    popularCategoriesBookings,
    popularCategoriesProviders,
    cityUsersAgg,
    cityBookingsAgg,
    bookingTrendsAgg,
    totalReviews,
    hiddenReviews,
    pendingReportedReviews,
    recentAuditLogs
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', status: 'active' }),
    User.countDocuments({ role: 'customer', status: 'suspended' }),
    User.countDocuments({ role: 'provider' }),
    User.countDocuments({ role: 'provider', 'providerDetails.isVerified': true }),
    User.countDocuments({ role: 'provider', 'providerDetails.isVerified': false }),
    User.countDocuments({ role: 'provider', status: 'active' }),
    User.countDocuments({ role: 'provider', status: 'suspended' }),
    User.countDocuments({ role: 'admin' }),
    Booking.countDocuments({}),
    Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $gt: ['$price', 0] },
                '$price',
                {
                  $cond: [
                    { $gt: ['$totalAmount', 0] },
                    '$totalAmount',
                    0
                  ]
                }
              ]
            }
          }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: { $in: ['completed', 'accepted'] } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $gt: ['$price', 0] },
                '$price',
                {
                  $cond: [
                    { $gt: ['$totalAmount', 0] },
                    '$totalAmount',
                    0
                  ]
                }
              ]
            }
          }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { category: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$category',
          bookingsCount: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'accepted']] },
                {
                  $cond: [
                    { $gt: ['$price', 0] },
                    '$price',
                    {
                      $cond: [
                        { $gt: ['$totalAmount', 0] },
                        '$totalAmount',
                        0
                      ]
                    }
                  ]
                },
                0
              ]
            }
          },
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      { $sort: { bookingsCount: -1 } },
      { $limit: 8 }
    ]),
    User.aggregate([
      { $match: { role: 'provider', 'providerDetails.category': { $exists: true, $ne: '' } } },
      { $group: {
        _id: '$providerDetails.category',
        providerCount: { $sum: 1 },
        verifiedCount: { $sum: { $cond: [{ $eq: ['$providerDetails.isVerified', true] }, 1, 0] } }
      } },
      { $sort: { providerCount: -1 } },
      { $limit: 8 }
    ]),
    User.aggregate([
      { $match: { city: { $exists: true, $ne: '' } } },
      { $group: {
        _id: '$city',
        totalUsers: { $sum: 1 },
        customers: { $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] } },
        providers: { $sum: { $cond: [{ $eq: ['$role', 'provider'] }, 1, 0] } },
        verifiedProviders: { $sum: { $cond: [{ $and: [{ $eq: ['$role', 'provider'] }, { $eq: ['$providerDetails.isVerified', true] }] }, 1, 0] } }
      } },
      { $sort: { totalUsers: -1 } }
    ]),
    Booking.aggregate([
      { $match: { city: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$city',
          totalBookings: { $sum: 1 },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'accepted']] },
                {
                  $cond: [
                    { $gt: ['$price', 0] },
                    '$price',
                    {
                      $cond: [
                        { $gt: ['$totalAmount', 0] },
                        '$totalAmount',
                        0
                      ]
                    }
                  ]
                },
                0
              ]
            }
          }
        }
      },
      { $sort: { totalBookings: -1 } }
    ]),
    Booking.aggregate([
      ...(Object.keys(trendMatch).length > 0 ? [{ $match: trendMatch }] : []),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'accepted']] },
                {
                  $cond: [
                    { $gt: ['$price', 0] },
                    '$price',
                    {
                      $cond: [
                        { $gt: ['$totalAmount', 0] },
                        '$totalAmount',
                        0
                      ]
                    }
                  ]
                },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Review.countDocuments({}),
    Review.countDocuments({ status: 'hidden' }),
    Review.countDocuments({ 'reports.status': 'pending' }),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  // Format bookings by status map
  const bookingsByStatus = {
    pending: 0,
    accepted: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0
  };
  bookingStatusAgg.forEach(item => {
    if (item._id && bookingsByStatus[item._id] !== undefined) {
      bookingsByStatus[item._id] = item.count;
    }
  });

  const totalRevenue = revenueAgg[0]?.total || 0;

  // Format City Distribution Map combining Users & Bookings
  const bookingCityMap = new Map();
  cityBookingsAgg.forEach(b => {
    bookingCityMap.set(b._id, {
      totalBookings: b.totalBookings,
      completedBookings: b.completedBookings,
      revenue: b.revenue
    });
  });

  const userCityMap = new Map();
  cityUsersAgg.forEach(u => {
    userCityMap.set(u._id, u);
  });

  const allCityKeys = Array.from(new Set([
    ...cityUsersAgg.map(u => u._id),
    ...cityBookingsAgg.map(b => b._id)
  ])).filter(Boolean);

  const cityDistribution = allCityKeys.map(cityKey => {
    const u = userCityMap.get(cityKey) || { totalUsers: 0, customers: 0, providers: 0, verifiedProviders: 0 };
    const bStats = bookingCityMap.get(cityKey) || { totalBookings: 0, completedBookings: 0, revenue: 0 };
    return {
      city: cityKey,
      cityName: getCityDisplayName(cityKey),
      totalUsers: u.totalUsers,
      customers: u.customers,
      providers: u.providers,
      verifiedProviders: u.verifiedProviders,
      totalBookings: bStats.totalBookings,
      completedBookings: bStats.completedBookings,
      revenue: bStats.revenue
    };
  }).sort((a, b) => (b.totalUsers - a.totalUsers) || (b.totalBookings - a.totalBookings));

  // Calculate completion percentage
  const finalizedCount = bookingsByStatus.completed + bookingsByStatus.cancelled + bookingsByStatus.rejected;
  const completionRate = finalizedCount > 0 ? Math.round((bookingsByStatus.completed / finalizedCount) * 100) : 0;

  return {
    users: {
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      totalProviders,
      verifiedProviders,
      pendingVerifications,
      activeProviders,
      suspendedProviders,
      totalAdmins,
      totalUsers,
      activeUsers: activeCustomers + activeProviders,
      suspendedUsers: suspendedCustomers + suspendedProviders
    },
    providers: {
      total: totalProviders,
      verified: verifiedProviders,
      pendingVerification: pendingVerifications,
      suspended: suspendedProviders,
      active: activeProviders
    },
    bookings: {
      total: totalBookings,
      byStatus: bookingsByStatus,
      totalRevenue,
      completionRate
    },
    reviews: {
      total: totalReviews,
      visible: Math.max(0, totalReviews - hiddenReviews),
      hidden: hiddenReviews,
      pendingReports: pendingReportedReviews
    },
    categories: {
      byBookings: popularCategoriesBookings.map(c => ({
        category: c._id,
        count: c.bookingsCount,
        revenue: c.totalRevenue,
        completed: c.completedCount
      })),
      byProviders: popularCategoriesProviders.map(c => ({
        category: c._id,
        count: c.providerCount,
        verified: c.verifiedCount
      }))
    },
    cityDistribution,
    bookingTrends: bookingTrendsAgg.map(t => ({
      date: t._id,
      total: t.total,
      completed: t.completed,
      accepted: t.accepted,
      pending: t.pending,
      cancelled: t.cancelled,
      revenue: t.revenue
    })),
    recentAuditLogs
  };
};

/**
 * GET /api/admin/stats
 * Platform overview statistics computed directly from persisted database records
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const analytics = await computePlatformAnalytics({ timeframe: '30d' });
    return res.status(200).json({
      success: true,
      stats: analytics
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/analytics
 * Advanced database-driven analytics with timeframe and filtering options
 */
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const { timeframe = '30d', city, category } = req.query;

    const validTimeframes = ['7d', '30d', '90d', 'all'];
    const activeTimeframe = validTimeframes.includes(timeframe) ? timeframe : '30d';

    const analytics = await computePlatformAnalytics({
      timeframe: activeTimeframe,
      city,
      category
    });

    return res.status(200).json({
      success: true,
      timeframe: activeTimeframe,
      analytics
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/users
 * Searchable, filterable, and paginated user management table
 */
export const getUsers = async (req, res, next) => {
  try {
    const { q, role, status, city, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (city && city !== 'all') {
      const canonical = normalizeCity(city);
      if (canonical) filter.city = canonical;
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
        { 'providerDetails.title': regex }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(USER_SAFE_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    const safeUsers = users.map(u => ({
      ...u,
      cityName: getCityDisplayName(u.city)
    }));

    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      users: safeUsers
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/users/:id
 * Retrieve comprehensive 360-degree user profile (customer or provider),
 * including credentials, verification documents, recent bookings, reviews, and audit history.
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user identifier.' });
    }

    const user = await User.findById(id).select(USER_SAFE_FIELDS);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Retrieve contextual operational counts
    let bookingCount = 0;
    let reviewCount = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let totalRevenue = 0;

    const userRole = user.role;
    const filterKey = userRole === 'customer' ? 'customer' : 'provider';

    if (userRole === 'customer' || userRole === 'provider') {
      const [
        totalB,
        totalR,
        compB,
        cancB,
        revAgg
      ] = await Promise.all([
        Booking.countDocuments({ [filterKey]: user._id }),
        Review.countDocuments({ [filterKey]: user._id }),
        Booking.countDocuments({ [filterKey]: user._id, status: 'completed' }),
        Booking.countDocuments({ [filterKey]: user._id, status: 'cancelled' }),
        Booking.aggregate([
          { $match: { [filterKey]: user._id, status: { $in: ['completed', 'accepted'] } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [
                    { $gt: ['$price', 0] },
                    '$price',
                    {
                      $cond: [
                        { $gt: ['$totalAmount', 0] },
                        '$totalAmount',
                        0
                      ]
                    }
                  ]
                }
              }
            }
          }
        ])
      ]);

      bookingCount = totalB;
      reviewCount = totalR;
      completedBookings = compB;
      cancelledBookings = cancB;
      totalRevenue = (revAgg && revAgg[0] && revAgg[0].total) ? revAgg[0].total : 0;
    }

    // Recent Bookings (up to 8)
    let recentBookings = [];
    if (userRole === 'customer' || userRole === 'provider') {
      recentBookings = await Booking.find({ [filterKey]: user._id })
        .sort({ createdAt: -1 })
        .limit(8)
        .select('serviceTitle category status scheduledDate scheduledTime price totalAmount city address notes createdAt')
        .populate(userRole === 'customer' ? 'provider' : 'customer', 'name email phoneNumber')
        .lean();
    }

    // Recent Reviews (up to 6)
    let recentReviews = [];
    if (userRole === 'customer' || userRole === 'provider') {
      recentReviews = await Review.find({ [filterKey]: user._id })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('rating comment tags status createdAt booking')
        .populate(userRole === 'customer' ? 'provider' : 'customer', 'name')
        .populate('booking', 'serviceTitle')
        .lean();
    }

    // Provider Documents if role is provider
    let documents = [];
    if (userRole === 'provider') {
      const docRecords = await VerificationDocument.find({ provider: user._id })
        .sort({ createdAt: -1 });
      documents = docRecords.map((d) => (typeof d.toSafeObject === 'function' ? d.toSafeObject() : {
        _id: d._id,
        documentType: d.documentType,
        originalFilename: d.originalFilename,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        status: d.status,
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt
      }));
    }

    const auditHistory = await AuditLog.find({ targetId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        cityName: getCityDisplayName(user.city),
        stats: {
          bookingCount,
          reviewCount,
          completedBookings,
          cancelledBookings,
          totalRevenue
        },
        documents,
        recentBookings,
        recentReviews,
        auditHistory
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Suspend or reactivate user account with audit logging
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user identifier.' });
    }

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "active" or "suspended".'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    // 1. Prevent admin from suspending their own account
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot suspend or deactivate their own account.'
      });
    }

    // 2. Prevent removal/suspension of the last active administrator
    if (targetUser.role === 'admin' && status === 'suspended') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot suspend the platform’s last remaining active administrator account.'
        });
      }
    }

    const previousStatus = targetUser.status;
    targetUser.status = status;
    await targetUser.save();

    // 3. Record persistent audit log
    const auditAction = status === 'suspended' ? 'user_suspended' : 'user_reactivated';
    const auditEntry = await AuditLog.create({
      admin: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: auditAction,
      targetId: targetUser._id,
      targetType: 'User',
      reason: (reason || '').trim(),
      details: {
        userName: targetUser.name,
        userEmail: targetUser.email,
        userRole: targetUser.role,
        previousStatus,
        newStatus: status
      }
    });

    return res.status(200).json({
      success: true,
      message: `Account for ${targetUser.name} has been ${status === 'suspended' ? 'suspended' : 'reactivated'}.`,
      user: targetUser.toSafeObject(),
      audit: auditEntry
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a suspended user account with dependency integrity and audit logging
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user identifier.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    // 1. Prevent admin from deleting their own account
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot delete their own account.'
      });
    }

    // 2. Prevent deletion of the last remaining active administrator
    if (targetUser.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the platform’s last remaining active administrator account.'
        });
      }
    }

    // 3. Ensure user is suspended before deletion
    if (targetUser.status !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'Only suspended user accounts can be permanently deleted. Please suspend the account first.'
      });
    }

    // 4. Handle provider-specific verification documents safely
    if (targetUser.role === 'provider') {
      try {
        const docs = await VerificationDocument.find({ provider: targetUser._id });
        for (const doc of docs) {
          if (doc.gridFsFileId) {
            try {
              await deleteFromGridFS(doc.gridFsFileId);
            } catch (gErr) {
              console.warn(`GridFS file removal notice for doc ${doc._id}:`, gErr.message);
            }
          }
        }
        await VerificationDocument.deleteMany({ provider: targetUser._id });
      } catch (docErr) {
        console.warn('Verification documents cleanup notice:', docErr.message);
      }
    }

    // 5. Clean up user notifications (keep bookings, reviews, conversations, and audit records intact for financial and historical audit integrity)
    await Notification.deleteMany({ recipient: targetUser._id });

    // 6. Delete User document from MongoDB
    await User.findByIdAndDelete(targetUser._id);

    // 7. Record persistent audit log
    const auditEntry = await AuditLog.create({
      admin: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'user_deleted',
      targetId: targetUser._id,
      targetType: 'User',
      reason: (reason || 'User deleted by administrator').trim(),
      details: {
        userName: targetUser.name,
        userEmail: targetUser.email,
        userRole: targetUser.role,
        previousStatus: targetUser.status
      }
    });

    return res.status(200).json({
      success: true,
      message: `User account for ${targetUser.name} (${targetUser.email}) has been permanently deleted.`,
      audit: auditEntry
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/providers
 * Provider verification queue and catalog oversight
 */
export const getAdminProviders = async (req, res, next) => {
  try {
    const { verification = 'all', city, category, q, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { role: 'provider' };

    if (verification === 'pending') {
      filter['providerDetails.isVerified'] = false;
    } else if (verification === 'verified') {
      filter['providerDetails.isVerified'] = true;
    }

    if (city && city !== 'all') {
      const canonical = normalizeCity(city);
      if (canonical) filter.city = canonical;
    }

    if (category && category !== 'all') {
      filter['providerDetails.category'] = new RegExp(category, 'i');
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { 'providerDetails.title': regex },
        { 'providerDetails.category': regex }
      ];
    }

    const [providers, total] = await Promise.all([
      User.find(filter)
        .select(USER_SAFE_FIELDS)
        .sort({ 'providerDetails.isVerified': 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    // Attach verification documents metadata to each provider
    const providerIds = providers.map(p => p._id);
    const documents = await VerificationDocument.find({ provider: { $in: providerIds } })
      .sort({ createdAt: -1 })
      .lean();

    const docsByProvider = {};
    for (const doc of documents) {
      const pid = doc.provider.toString();
      if (!docsByProvider[pid]) {
        docsByProvider[pid] = [];
      }
      delete doc.gridFsFileId;
      delete doc.__v;
      const idStr = doc._id.toString();
      doc._id = idStr;
      doc.id = idStr;
      docsByProvider[pid].push(doc);
    }

    const formatted = providers.map(p => {
      const pDocs = docsByProvider[p._id.toString()] || [];
      return {
        ...p,
        cityName: getCityDisplayName(p.city),
        documents: pDocs,
        documentCount: pDocs.length,
        hasPendingDocuments: pDocs.some(d => d.status === 'pending')
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      providers: formatted
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/providers/:id/verify
 * Approve or reject a provider's trade verification with audit logging
 */
export const verifyProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified, notes } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid provider identifier.' });
    }

    if (isVerified === undefined || typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Verification decision (isVerified: boolean) is required.'
      });
    }

    const provider = await User.findOne({ _id: id, role: 'provider' });
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Service provider not found.' });
    }

    // Ensure providerDetails subdocument exists
    if (!provider.providerDetails) {
      provider.providerDetails = {};
    }

    // Rule: Approval strictly requires at least one uploaded verification document
    const qualifyingDocs = await VerificationDocument.find({ provider: id });
    if (isVerified && qualifyingDocs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot approve service provider without at least one uploaded and valid verification document.'
      });
    }

    const previousVerified = Boolean(provider.providerDetails.isVerified);
    const decisionStatus = isVerified ? 'approved' : 'rejected';

    provider.providerDetails.isVerified = isVerified;
    provider.providerDetails.verificationStatus = decisionStatus;
    provider.verificationStatus = decisionStatus;
    provider.providerDetails.verifiedAt = new Date();
    provider.providerDetails.verifiedBy = req.user._id;
    provider.providerDetails.verificationNotes = (notes || '').trim();
    if (!isVerified) {
      provider.providerDetails.rejectionReason = (notes || '').trim();
    }

    await provider.save();

    // Update document review statuses in the separate metadata collection
    await VerificationDocument.updateMany(
      { provider: id, status: 'pending' },
      {
        $set: {
          status: decisionStatus,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          reviewNotes: (notes || '').trim(),
          rejectionReason: !isVerified ? (notes || '').trim() : ''
        }
      }
    );

    // Record persistent audit log
    const auditAction = isVerified ? 'provider_verified' : 'provider_rejected';
    const auditEntry = await AuditLog.create({
      admin: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: auditAction,
      targetId: provider._id,
      targetType: 'Provider',
      reason: (notes || '').trim(),
      details: {
        providerName: provider.name,
        providerEmail: provider.email,
        category: provider.providerDetails.category,
        previousVerified,
        newVerified: isVerified,
        verificationStatus: decisionStatus,
        documentCount: qualifyingDocs.length
      }
    });

    // Notify provider of verification outcome
    try {
      await Notification.create({
        recipient: provider._id,
        type: 'system',
        title: isVerified ? 'Verification Badge Approved' : 'Verification Update',
        message: isVerified
          ? 'Your service provider credentials have been approved by administration. The verified badge is now visible on your public profile.'
          : `Your verification request was reviewed: ${notes ? notes.trim() : 'Please contact administrator for more details.'}`
      });
    } catch (notifErr) {
      console.warn('Could not persist verification notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Provider ${provider.name} has been ${isVerified ? 'verified' : 'marked unverified'}.`,
      provider: provider.toSafeObject(),
      audit: auditEntry
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/bookings
 * Read-only booking oversight with status, city, date filters and masked customer address
 */
export const getAdminBookings = async (req, res, next) => {
  try {
    const { status, city, date, customerId, providerId, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (city && city !== 'all') {
      const canonical = normalizeCity(city);
      if (canonical) filter.city = canonical;
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      filter.bookingDate = date;
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customer = customerId;
    }

    if (providerId && mongoose.Types.ObjectId.isValid(providerId)) {
      filter.provider = providerId;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('customer', 'name email city phoneNumber')
        .populate('provider', 'name email city phoneNumber providerDetails.title providerDetails.category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter)
    ]);

    // Format safe response with city display names and masked private delivery addresses
    const formatted = bookings.map(b => {
      let displayAddress = b.serviceAddress || '';
      if (displayAddress.length > 20) {
        const parts = displayAddress.split(',');
        if (parts.length > 1) {
          displayAddress = `[House/Street masked] • ${parts.slice(1).join(',').trim()}`;
        } else {
          displayAddress = `[Street details masked] • ${displayAddress.slice(-10)}`;
        }
      } else if (displayAddress.length > 0) {
        displayAddress = '[Masked for customer privacy]';
      }

      const safeBooking = { ...b };
      delete safeBooking.serviceAddress; // Never leak raw unmasked private address
      safeBooking.serviceAddressMasked = displayAddress;
      safeBooking.cityName = getCityDisplayName(b.city);

      return safeBooking;
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      bookings: formatted
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/reviews
 * Reviews and reported feedback moderation queue
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const { status = 'all', reported = 'all', providerId, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (reported === 'has_reports') {
      filter['reports.0'] = { $exists: true };
    } else if (reported === 'pending_reports') {
      filter['reports.status'] = 'pending';
    }

    if (providerId && mongoose.Types.ObjectId.isValid(providerId)) {
      filter.provider = providerId;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customer', 'name email city')
        .populate('provider', 'name email city providerDetails.title')
        .populate('reports.reporter', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      reviews
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/reviews/:id/moderate
 * Moderate review visibility (hide/restore) and resolve reports
 */
export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason, dismissReports = true } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid review identifier.' });
    }

    if (!['visible', 'hidden'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "visible" or "hidden".'
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    const previousStatus = review.status;
    review.status = status;

    if (status === 'hidden') {
      review.hiddenReason = (reason || '').trim();
      review.hiddenAt = new Date();
      review.hiddenBy = req.user._id;
    } else {
      review.hiddenReason = '';
      review.hiddenAt = null;
      review.hiddenBy = null;
    }

    // Resolve or dismiss pending reports if requested
    if (dismissReports && Array.isArray(review.reports)) {
      review.reports.forEach(r => {
        if (r.status === 'pending') {
          r.status = status === 'hidden' ? 'resolved' : 'dismissed';
          r.resolvedAt = new Date();
          r.resolvedBy = req.user._id;
          r.resolutionNote = `Resolved by administrator: review set to ${status}.`;
        }
      });
    }

    await review.save();

    // Recalculate provider aggregate rating excluding hidden reviews
    const { averageRating, reviewCount } = await recalculateProviderRating(review.provider);

    // Record persistent audit log
    const auditAction = status === 'hidden' ? 'review_hidden' : 'review_restored';
    const auditEntry = await AuditLog.create({
      admin: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: auditAction,
      targetId: review._id,
      targetType: 'Review',
      reason: (reason || '').trim(),
      details: {
        providerId: review.provider,
        customerId: review.customer,
        rating: review.rating,
        previousStatus,
        newStatus: status,
        updatedAverageRating: averageRating,
        updatedReviewCount: reviewCount
      }
    });

    return res.status(200).json({
      success: true,
      message: `Review has been marked as ${status}. Provider rating updated.`,
      review,
      providerStats: {
        averageRating,
        reviewCount
      },
      audit: auditEntry
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/audit-logs
 * Read-only persistent administrative audit log trail
 */
export const getAdminAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (targetType && targetType !== 'all') {
      filter.targetType = targetType;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      logs
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/bookings/:id/message
 * Edit customer instructions/message (description) to redact sensitive or dangerous content
 */
export const updateBookingMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, description, reason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid booking identifier.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking appointment not found.' });
    }

    const newMessage = message !== undefined ? message : (description !== undefined ? description : '');
    const previousMessage = booking.description || '';

    booking.description = (newMessage || '').trim();
    await booking.save();

    // Record audit log
    await AuditLog.create({
      admin: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'booking_message_edited',
      targetId: booking._id,
      targetType: 'Booking',
      reason: (reason || 'Redacted sensitive/inappropriate message, payment credentials, or personal numbers').trim(),
      details: {
        previousMessage,
        newMessage: booking.description,
        bookingId: booking._id,
        customerId: booking.customer,
        providerId: booking.provider
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Booking message successfully updated.',
      booking: {
        _id: booking._id,
        description: booking.description,
        updatedAt: booking.updatedAt
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/bookings/:id
 * Administrative booking cancellation with participant notifications and data preservation.
 * Sets status to 'cancelled', records audit trail, and notifies both Customer and Provider.
 */
export const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, permanent } = req.body || req.query || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid booking identifier.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking appointment not found.' });
    }

    // Capture details before modification/deletion for audit trail
    const bookingDetails = {
      serviceName: booking.serviceName,
      status: booking.status,
      customer: booking.customer,
      provider: booking.provider,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      price: booking.price,
      description: booking.description
    };

    const cancelReason = (reason || 'Cancelled by administrator due to policy violation or scheduling conflict').trim();

    // Prevent duplicate notifications if repeated on an already cancelled booking
    if (booking.status === 'cancelled' && permanent !== 'true' && permanent !== true) {
      return res.status(200).json({
        success: true,
        message: 'Booking appointment is already cancelled.',
        alreadyCancelled: true,
        booking
      });
    }

    // Optional hard deletion if explicitly specified
    if (permanent === 'true' || permanent === true) {
      await Review.deleteMany({ booking: booking._id });
      await Notification.deleteMany({ booking: booking._id });
      await Booking.findByIdAndDelete(id);

      await AuditLog.create({
        admin: req.user._id,
        adminName: req.user.name,
        adminEmail: req.user.email,
        action: 'booking_deleted',
        targetId: booking._id,
        targetType: 'Booking',
        reason: cancelReason,
        details: bookingDetails
      });

      return res.status(200).json({
        success: true,
        message: 'Booking has been permanently removed.'
      });
    }

    // Preferred workflow: Update status to 'cancelled', preserving history, references and payment records
    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    booking.cancellationReason = cancelReason;

    if (!Array.isArray(booking.statusHistory)) {
      booking.statusHistory = [];
    }
    booking.statusHistory.push({
      status: 'cancelled',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: `Cancelled by administrator: ${cancelReason}`
    });

    await booking.save();

    // 1. Notify Customer
    const customerMsg = `Your appointment for "${booking.serviceName}" scheduled on ${booking.bookingDate} (${booking.bookingTime}) has been cancelled by an administrator.${cancelReason ? ` Reason: ${cancelReason}` : ''}`;
    let customerNotif = null;
    try {
      customerNotif = await Notification.create({
        recipient: booking.customer,
        type: 'booking_cancelled',
        title: 'Booking Cancelled by Administrator',
        message: customerMsg,
        booking: booking._id,
        data: {
          bookingId: booking._id,
          serviceName: booking.serviceName,
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
          cancelledByRole: 'admin',
          cancellationReason: cancelReason
        }
      });
    } catch (notifErr) {
      console.warn('Could not persist admin cancellation notification for customer:', notifErr.message);
    }

    // 2. Notify Provider (if assigned)
    let providerNotif = null;
    if (booking.provider) {
      const providerMsg = `The appointment for "${booking.serviceName}" scheduled on ${booking.bookingDate} (${booking.bookingTime}) has been cancelled by an administrator.${cancelReason ? ` Reason: ${cancelReason}` : ''}`;
      try {
        providerNotif = await Notification.create({
          recipient: booking.provider,
          type: 'booking_cancelled',
          title: 'Booking Cancelled by Administrator',
          message: providerMsg,
          booking: booking._id,
          data: {
            bookingId: booking._id,
            serviceName: booking.serviceName,
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            cancelledByRole: 'admin',
            cancellationReason: cancelReason
          }
        });
      } catch (notifErr) {
        console.warn('Could not persist admin cancellation notification for provider:', notifErr.message);
      }
    }

    // 3. Dispatch real-time Socket.IO events to both parties
    try {
      const io = getIO();
      if (io) {
        const customerId = (booking.customer?._id || booking.customer)?.toString();
        const providerId = (booking.provider?._id || booking.provider)?.toString();
        const statusPayload = {
          bookingId: booking._id.toString(),
          status: 'cancelled',
          cancellationReason: cancelReason,
          cancelledByRole: 'admin',
          booking
        };

        if (customerId) {
          if (customerNotif) io.to(`user_${customerId}`).emit('new_notification', customerNotif);
          io.to(`user_${customerId}`).emit('booking_status_updated', statusPayload);
        }
        if (providerId) {
          if (providerNotif) io.to(`user_${providerId}`).emit('new_notification', providerNotif);
          io.to(`user_${providerId}`).emit('booking_status_updated', statusPayload);
        }
      }
    } catch (socketErr) {
      console.warn('Socket broadcast warning on admin booking cancellation:', socketErr.message);
    }

    // 4. Record Audit Log
    await AuditLog.create({
      admin: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'booking_cancelled',
      targetId: booking._id,
      targetType: 'Booking',
      reason: cancelReason,
      details: bookingDetails
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled by administrator and participants notified.',
      booking
    });
  } catch (error) {
    return next(error);
  }
};
