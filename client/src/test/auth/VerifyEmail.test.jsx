import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmail from '../../pages/VerifyEmail';
import * as AuthContextModule from '../../context/AuthContext';
import { authApi } from '../../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: {
        email: 'sneha@example.com',
        role: 'customer',
        registered: true
      }
    })
  };
});

vi.mock('../../services/api', () => ({
  authApi: {
    resendEmailOtp: vi.fn()
  }
}));

describe('VerifyEmail Component', () => {
  const mockVerifyEmailOtp = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      verifyEmailOtp: mockVerifyEmailOtp,
      refreshUser: mockRefreshUser
    });
  });

  it('renders verify email page with 6-digit OTP input and email context', () => {
    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument();
    expect(screen.getByText('sneha@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify & Complete Registration/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Resend Code/i })).toBeInTheDocument();
  });

  it('enables submit button only when 6 digits are entered', () => {
    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
    const submitBtn = screen.getByRole('button', { name: /Verify & Complete Registration/i });

    fireEvent.change(otpInput, { target: { value: '123' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(otpInput, { target: { value: '123456' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits valid OTP and triggers verification callback', async () => {
    mockVerifyEmailOtp.mockResolvedValueOnce({
      success: true,
      user: { _id: 'u-1', email: 'sneha@example.com', role: 'customer' }
    });

    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
    fireEvent.change(otpInput, { target: { value: '654321' } });

    const submitBtn = screen.getByRole('button', { name: /Verify & Complete Registration/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith('sneha@example.com', '654321');
      expect(screen.getByText(/Email verified and account created successfully!/i)).toBeInTheDocument();
    });
  });

  it('allows resending OTP and displays confirmation status', async () => {
    authApi.resendEmailOtp.mockResolvedValueOnce({
      success: true,
      message: 'New OTP dispatched successfully'
    });

    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    const resendBtn = screen.getByRole('button', { name: /Resend Code/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(authApi.resendEmailOtp).toHaveBeenCalledWith('sneha@example.com');
      expect(screen.getByText(/New OTP dispatched successfully/i)).toBeInTheDocument();
    });
  });
});
