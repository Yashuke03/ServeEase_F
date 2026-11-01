import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProviderBookings from '../../pages/ProviderBookings';
import * as AuthContextModule from '../../context/AuthContext';
import { bookingApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  API_BASE_URL: 'http://localhost:5001',
  bookingApi: {
    getProviderBookings: vi.fn(),
    acceptBooking: vi.fn(),
    rejectBooking: vi.fn(),
    verifyArrival: vi.fn(),
    startBooking: vi.fn(),
    completeBooking: vi.fn()
  },
  notificationApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ success: true, count: 0 })
  },
  getAvatarUrl: vi.fn((url) => url || '')
}));

describe('ProviderBookings Component', () => {
  const mockProvider = {
    _id: 'prov-1',
    name: 'Ganesh Electrician',
    email: 'ganesh@example.com',
    role: 'provider',
    city: 'sangli'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockProvider,
      isAuthenticated: true
    });
  });

  it('renders provider bookings with status tabs', async () => {
    bookingApi.getProviderBookings.mockResolvedValueOnce({
      success: true,
      bookings: []
    });

    render(
      <MemoryRouter>
        <ProviderBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Job Schedule & Bookings/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /All Jobs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upcoming Jobs/i })).toBeInTheDocument();
    });
  });

  it('allows provider to enter 6-digit Arrival OTP and verify arrival on-site', async () => {
    const mockAcceptedBooking = {
      _id: 'b-accepted-100',
      serviceName: 'Switchboard Repair',
      status: 'accepted',
      bookingDate: '2026-11-04',
      bookingTime: '11:00 AM',
      price: 250,
      city: 'sangli',
      serviceAddress: '12 Ganesh Nagar, Sangli',
      arrivalOtpVerified: false,
      customer: {
        _id: 'cust-10',
        name: 'Vikas Mane',
        phoneNumber: '+91 9822112233'
      }
    };

    bookingApi.getProviderBookings.mockResolvedValueOnce({
      success: true,
      bookings: [mockAcceptedBooking]
    });

    bookingApi.verifyArrival.mockResolvedValueOnce({
      success: true,
      booking: {
        ...mockAcceptedBooking,
        arrivalOtpVerified: true,
        arrivedAt: new Date().toISOString()
      }
    });

    render(
      <MemoryRouter>
        <ProviderBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Switchboard Repair')).toBeInTheDocument();
      expect(screen.getByText(/Confirm On-Site Arrival/i)).toBeInTheDocument();
    });

    // Enter OTP
    const otpInput = screen.getByPlaceholderText(/Enter 6-digit OTP/i);
    fireEvent.change(otpInput, { target: { value: '654321' } });

    // Click verify
    const verifyBtn = screen.getByRole('button', { name: /Verify Arrival/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(bookingApi.verifyArrival).toHaveBeenCalledWith('b-accepted-100', '654321');
    });
  });

  it('displays error message if arrival OTP verification fails', async () => {
    bookingApi.getProviderBookings.mockResolvedValueOnce({
      success: true,
      bookings: [
        {
          _id: 'b-accepted-200',
          serviceName: 'Ceiling Fan Installation',
          status: 'accepted',
          bookingDate: '2026-11-04',
          bookingTime: '01:00 PM',
          price: 300,
          city: 'sangli',
          serviceAddress: '44 Station Road, Sangli',
          arrivalOtpVerified: false,
          customer: { _id: 'cust-20', name: 'Ramesh Kadam' }
        }
      ]
    });

    bookingApi.verifyArrival.mockResolvedValueOnce({
      success: false,
      error: 'Invalid arrival verification code. 4 attempt(s) remaining.'
    });

    render(
      <MemoryRouter>
        <ProviderBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ceiling Fan Installation')).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText(/Enter 6-digit OTP/i);
    fireEvent.change(otpInput, { target: { value: '111111' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify Arrival/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid arrival verification code\. 4 attempt\(s\) remaining\./i)).toBeInTheDocument();
    });
  });
});
