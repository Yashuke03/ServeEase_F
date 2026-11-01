import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import * as AuthContextModule from '../../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Login Component', () => {
  const mockLogin = vi.fn();
  const mockLoginWithGoogle = vi.fn();
  const mockSetAuthError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      authError: null,
      setAuthError: mockSetAuthError
    });
  });

  it('renders login form with role tabs, email, password, and Remember Me checkbox', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('tab', { name: /^Customer$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Provider$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Admin$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/rahul@example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In as Customer/i })).toBeInTheDocument();
  });

  it('switches role tabs and updates submit button label accordingly', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Switch to Provider tab
    fireEvent.click(screen.getByRole('tab', { name: /^Provider$/i }));
    expect(screen.getByRole('button', { name: /Sign In as Provider/i })).toBeInTheDocument();

    // Switch to Admin tab
    fireEvent.click(screen.getByRole('tab', { name: /^Admin$/i }));
    expect(screen.getByRole('button', { name: /Sign In as Admin/i })).toBeInTheDocument();
  });

  it('validates empty email and password on submission', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign In as Customer/i }));

    expect(screen.getByText(/Please enter both email address and password/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with email, password, role, and rememberMe on valid submit and redirects', async () => {
    mockLogin.mockResolvedValueOnce({
      _id: 'cust-1',
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      role: 'customer'
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/rahul@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const rememberMeCheckbox = screen.getByLabelText(/Remember me/i);

    fireEvent.change(emailInput, { target: { value: 'rahul@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'CustomerPass123!' } });
    fireEvent.click(rememberMeCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /Sign In as Customer/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('rahul@example.com', 'CustomerPass123!', 'customer', true);
      expect(mockNavigate).toHaveBeenCalledWith('/customer/dashboard', { replace: true });
    });
  });

  it('displays error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid email address or password.'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/rahul@example.com/i), {
      target: { value: 'wrong@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'BadPassword' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In as Customer/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address or password.')).toBeInTheDocument();
    });
  });
});
