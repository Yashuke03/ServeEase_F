import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../../pages/Register';
import * as AuthContextModule from '../../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Register Component', () => {
  const mockRegister = vi.fn();
  const mockLoginWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      register: mockRegister,
      loginWithGoogle: mockLoginWithGoogle,
      user: null
    });
  });

  it('renders registration form with Customer role active by default', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole('tab', { name: /I Need Services \(Customer\)/i })).toHaveClass('active');
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your City/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Customer Account/i })).toBeInTheDocument();
  });

  it('switches between Customer and Provider roles revealing provider specific inputs', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const providerTab = screen.getByRole('tab', { name: /I Offer Services \(Provider\)/i });
    fireEvent.click(providerTab);

    expect(providerTab).toHaveClass('active');
    expect(screen.getByText(/Service Provider Profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Operating City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Trade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Services Offered/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Provider Account/i })).toBeInTheDocument();
  });

  it('validates empty inputs and displays error message', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Create Customer Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required profile fields/i)).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('submits valid customer registration and redirects to verify-email', async () => {
    mockRegister.mockResolvedValueOnce({ success: true, message: 'OTP sent' });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Sneha Patel' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'sneha@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/At least 6 characters/i), { target: { value: 'Password@123' } });
    fireEvent.change(screen.getByLabelText(/Your City/i), { target: { value: 'mumbai' } });

    const submitBtn = screen.getByRole('button', { name: /Create Customer Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sneha Patel',
        email: 'sneha@example.com',
        phoneNumber: '+91 9876543210',
        role: 'customer',
        city: 'mumbai'
      }));
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', expect.objectContaining({
        state: expect.objectContaining({
          email: 'sneha@example.com',
          role: 'customer',
          registered: true
        })
      }));
    });
  });
});
