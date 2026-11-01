import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../../pages/AdminDashboard';
import * as AuthContextModule from '../../context/AuthContext';
import { adminApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  API_BASE_URL: 'http://localhost:5001',
  adminApi: {
    getStats: vi.fn(),
    getAnalytics: vi.fn(),
    getUsers: vi.fn(),
    updateUserStatus: vi.fn(),
    deleteUser: vi.fn(),
    getProviders: vi.fn(),
    verifyProvider: vi.fn(),
    getProviderDocuments: vi.fn(),
    getBookings: vi.fn(),
    getReviews: vi.fn(),
    getAuditLogs: vi.fn()
  },
  notificationApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ success: true, count: 0 })
  },
  getAvatarUrl: vi.fn((url) => url || '')
}));

describe('AdminDashboard Component', () => {
  const mockAdmin = {
    _id: 'admin-1',
    name: 'Platform Administrator',
    email: 'admin@serveease.com',
    role: 'admin'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockAdmin,
      isAuthenticated: true
    });

    // Default mock stats
    adminApi.getStats.mockResolvedValue({
      success: true,
      stats: {
        totalUsers: 45,
        totalCustomers: 30,
        totalProviders: 14,
        verifiedProviders: 10,
        totalBookings: 60,
        completedBookings: 48,
        activeBookings: 8,
        cancelledBookings: 4,
        totalReviews: 40,
        averageRating: 4.8
      }
    });

    adminApi.getAnalytics.mockResolvedValue({
      success: true,
      analytics: {
        bookingFunnel: { created: 60, accepted: 54, completed: 48, cancelled: 4 },
        categoryDistribution: [],
        cityDistribution: []
      }
    });

    adminApi.getUsers.mockResolvedValue({
      success: true,
      users: [],
      pagination: { total: 0, page: 1, pages: 1 }
    });

    adminApi.getProviders.mockResolvedValue({
      success: true,
      providers: [],
      pagination: { total: 0, page: 1, pages: 1 }
    });

    adminApi.getBookings.mockResolvedValue({
      success: true,
      bookings: [],
      pagination: { total: 0, page: 1, pages: 1 }
    });

    adminApi.getReviews.mockResolvedValue({
      success: true,
      reviews: [],
      pagination: { total: 0, page: 1, pages: 1 }
    });

    adminApi.getAuditLogs.mockResolvedValue({
      success: true,
      auditLogs: [],
      pagination: { total: 0, page: 1, pages: 1 }
    });
  });

  it('renders admin dashboard title and stats overview cards', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Platform Administrator/i })).toBeInTheDocument();
    expect(screen.getByText(/System Admin/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Overview & Diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText(/User Accounts/i)).toBeInTheDocument();
    });
  });

  it('allows switching between tabs (Overview, Users, Providers, Bookings, Reviews, Audit)', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Switch to User Accounts tab
    const usersTab = screen.getByRole('button', { name: /User Accounts/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(adminApi.getUsers).toHaveBeenCalled();
      expect(screen.getByPlaceholderText(/Search name, email\.\.\./i)).toBeInTheDocument();
    });

    // Switch to Providers tab
    const providersTab = screen.getByRole('button', { name: /Verification Queue/i });
    fireEvent.click(providersTab);

    await waitFor(() => {
      expect(adminApi.getProviders).toHaveBeenCalled();
    });
  });

  it('allows administrator to suspend and reactivate a user account', async () => {
    const mockUserList = [
      {
        _id: 'user-to-suspend',
        name: 'Bad Actor',
        email: 'bad@example.com',
        role: 'customer',
        status: 'active',
        createdAt: '2026-10-01'
      }
    ];

    adminApi.getUsers.mockResolvedValue({
      success: true,
      users: mockUserList,
      pagination: { total: 1, page: 1, pages: 1 }
    });

    adminApi.updateUserStatus.mockResolvedValueOnce({
      success: true,
      message: 'User account has been suspended successfully.'
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Click Users Tab
    fireEvent.click(screen.getByRole('button', { name: /User Accounts/i }));

    await waitFor(() => {
      expect(screen.getByText('Bad Actor')).toBeInTheDocument();
    });

    // Click Suspend action button
    const suspendBtn = screen.getByTitle(/Suspend user account/i);
    fireEvent.click(suspendBtn);

    // Confirmation dialog opens
    await waitFor(() => {
      expect(screen.getByText(/Confirm Account Suspension/i)).toBeInTheDocument();
    });

    // Click confirm in modal
    const confirmBtn = screen.getByRole('button', { name: /Confirm Suspension/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.updateUserStatus).toHaveBeenCalledWith('user-to-suspend', expect.objectContaining({
        status: 'suspended'
      }));
    });
  });
});
