import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import * as AuthContextModule from '../../context/AuthContext';

describe('ProtectedRoute Guard Component', () => {
  it('renders loading spinner while authentication status is being resolved', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Verifying authentication credentials/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('displays Access Restricted screen when customer attempts to access provider portal', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'cust-1', name: 'John Doe', email: 'john@example.com', role: 'customer' },
      loading: false,
      isAuthenticated: true
    });

    render(
      <MemoryRouter initialEntries={['/provider/dashboard']}>
        <Routes>
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <div>Provider Secret Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/This page requires/i)).toHaveTextContent('provider privileges');
    expect(screen.getByText(/Go to My Customer Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('Provider Secret Dashboard')).not.toBeInTheDocument();
  });

  it('renders protected child component when authenticated user has allowed role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'admin-1', name: 'Super Admin', email: 'admin@serveease.com', role: 'admin' },
      loading: false,
      isAuthenticated: true
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div data-testid="admin-content">Welcome to Admin Area</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Admin Area')).toBeInTheDocument();
  });
});
