import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerBookings from '../../pages/CustomerBookings';
import * as AuthContextModule from '../../context/AuthContext';
import { bookingApi, reviewApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  API_BASE_URL: 'http://localhost:5001',
  bookingApi: {
    getMyBookings: vi.fn(),
    cancelBooking: vi.fn(),
    updateBookingLocation: vi.fn()
  },
  notificationApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ success: true, count: 0 })
  },
  reviewApi: {
    getMyReviews: vi.fn().mockResolvedValue({ success: true, reviews: [] }),
    createReview: vi.fn()
  },
  getAvatarUrl: vi.fn((url) => url || '')
}));

describe('CustomerBookings Component', () => {
  const mockCustomer = {
    _id: 'cust-1',
    name: 'Pooja Patil',
    email: 'pooja@example.com',
    role: 'customer',
    city: 'sangli'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockCustomer,
      isAuthenticated: true
    });
  });

  it('renders loading state initially', () => {
    bookingApi.getMyBookings.mockReturnValueOnce(new Promise(() => {}));

    render(
      <MemoryRouter>
        <CustomerBookings />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading your service appointments/i)).toBeInTheDocument();
  });

  it('renders empty state when customer has no bookings', async () => {
    bookingApi.getMyBookings.mockResolvedValueOnce({
      success: true,
      bookings: []
    });

    render(
      <MemoryRouter>
        <CustomerBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Service Bookings Found/i)).toBeInTheDocument();
      expect(screen.getByText(/Discover Services in Sangli/i)).toBeInTheDocument();
    });
  });

  it('renders 6-digit Arrival OTP card for accepted bookings', async () => {
    bookingApi.getMyBookings.mockResolvedValueOnce({
      success: true,
      bookings: [
        {
          _id: 'b-accepted-1',
          serviceName: 'Deep Home Cleaning',
          status: 'accepted',
          bookingDate: '2026-11-05',
          bookingTime: '10:00 AM',
          price: 1200,
          city: 'sangli',
          serviceAddress: 'Plot 45, Gulmohar Colony, Sangli',
          arrivalOtp: '482915',
          arrivalOtpVerified: false,
          provider: {
            _id: 'prov-1',
            name: 'Sunil Jadhav',
            phoneNumber: '+91 9822000002'
          }
        }
      ]
    });

    render(
      <MemoryRouter>
        <CustomerBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Deep Home Cleaning')).toBeInTheDocument();
      expect(screen.getByText(/Technician Arrival Verification Code/i)).toBeInTheDocument();
      expect(screen.getByText('482915')).toBeInTheDocument();
      expect(screen.getByText(/Share only after arrival/i)).toBeInTheDocument();
    });
  });

  it('allows customer to cancel an eligible booking with reason', async () => {
    bookingApi.getMyBookings.mockResolvedValueOnce({
      success: true,
      bookings: [
        {
          _id: 'b-pending-1',
          serviceName: 'Plumbing Repair',
          status: 'pending',
          bookingDate: '2026-11-06',
          bookingTime: '02:00 PM',
          price: 450,
          city: 'sangli',
          serviceAddress: 'Flat 102, Sangli',
          provider: { _id: 'prov-2', name: 'Anil Shinde' }
        }
      ]
    });

    bookingApi.cancelBooking.mockResolvedValueOnce({
      success: true,
      booking: { _id: 'b-pending-1', status: 'cancelled' }
    });

    render(
      <MemoryRouter>
        <CustomerBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Plumbing Repair')).toBeInTheDocument();
    });

    // Find cancel button
    const cancelBtn = screen.getByRole('button', { name: /Cancel Appointment/i });
    fireEvent.click(cancelBtn);

    // Cancel modal opens
    await waitFor(() => {
      expect(screen.getByText(/Cancel Appointment\?/i)).toBeInTheDocument();
    });

    // Submit cancellation
    const confirmCancelBtn = screen.getByRole('button', { name: /Yes, Cancel Booking/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(bookingApi.cancelBooking).toHaveBeenCalledWith('b-pending-1', expect.any(String));
    });
  });
});
