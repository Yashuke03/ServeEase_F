import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerProfile from '../../pages/CustomerProfile';
import * as AuthContextModule from '../../context/AuthContext';
import { userApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  userApi: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn()
  },
  notificationApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ count: 0 })
  },
  getAvatarUrl: vi.fn(() => '')
}));

// Mock ServiceMap to avoid leaflet DOM issues in jsdom
vi.mock('../../components/map/ServiceMap', () => ({
  default: ({ currentLocation, onLocationChange }) => (
    <div data-testid="mock-service-map">
      <span>Service Map Mock</span>
      <button
        type="button"
        onClick={() => onLocationChange?.({ latitude: 16.8524, longitude: 74.5815 })}
      >
        Simulate Pin Drop
      </button>
    </div>
  )
}));

describe('CustomerProfile Component', () => {
  const mockUser = {
    _id: 'cust-1',
    name: 'Ramesh Patil',
    email: 'ramesh@example.com',
    phoneNumber: '+91 9822100001',
    role: 'customer',
    city: 'sangli',
    emailVerified: true,
    address: 'Flat 402, Shanti Heights, Vishrambag',
    location: {
      address: 'Flat 402, Shanti Heights, Vishrambag',
      latitude: 16.8524,
      longitude: 74.5815
    }
  };

  const mockUpdateProfile = vi.fn();
  const mockSetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      updateProfile: mockUpdateProfile
    });
  });

  it('renders customer profile form with name, phone, city, home address, and coordinates', () => {
    render(
      <MemoryRouter>
        <CustomerProfile />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue(/Ramesh Patil/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\+91 9822100001/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Flat 402, Shanti Heights, Vishrambag/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/16.8524/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/74.5815/i)).toBeInTheDocument();
    expect(screen.getByText(/Home Address & GPS Location/i)).toBeInTheDocument();
  });

  it('captures live GPS coordinates when "Use Current GPS" is clicked', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 16.855012,
            longitude: 74.586023
          }
        });
      })
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true
    });

    render(
      <MemoryRouter>
        <CustomerProfile />
      </MemoryRouter>
    );

    const gpsBtn = screen.getByRole('button', { name: /Use Current GPS/i });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('16.855012')).toBeInTheDocument();
      expect(screen.getByDisplayValue('74.586023')).toBeInTheDocument();
      expect(screen.getByText(/GPS coordinates captured successfully/i)).toBeInTheDocument();
    });
  });

  it('handles geolocation permission denial gracefully without crashing', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
        error({ code: 1, message: 'User denied Geolocation' });
      })
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true
    });

    render(
      <MemoryRouter>
        <CustomerProfile />
      </MemoryRouter>
    );

    const gpsBtn = screen.getByRole('button', { name: /Use Current GPS/i });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Location permission was denied/i)).toBeInTheDocument();
    });
  });

  it('auto-extracts coordinates when pasting a Google Maps link into address', async () => {
    render(
      <MemoryRouter>
        <CustomerProfile />
      </MemoryRouter>
    );

    const addressInput = screen.getByLabelText(/Home Street Address/i);
    fireEvent.change(addressInput, {
      target: {
        name: 'address',
        value: 'Doorstep location: https://maps.google.com/?q=16.845000,74.595000'
      }
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('16.845')).toBeInTheDocument();
      expect(screen.getByDisplayValue('74.595')).toBeInTheDocument();
      expect(screen.getByText(/Extracted coordinates from Google Maps/i)).toBeInTheDocument();
    });
  });

  it('submits updated profile with location object on save', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      ...mockUser,
      name: 'Ramesh S. Patil',
      location: {
        address: 'New Flat 501, Miraj Road, Sangli',
        latitude: 16.845,
        longitude: 74.595
      }
    });

    render(
      <MemoryRouter>
        <CustomerProfile />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { name: 'name', value: 'Ramesh S. Patil' } });

    const addressInput = screen.getByLabelText(/Home Street Address/i);
    fireEvent.change(addressInput, { target: { name: 'address', value: 'New Flat 501, Miraj Road, Sangli' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Ramesh S. Patil',
        city: 'sangli',
        location: {
          address: 'New Flat 501, Miraj Road, Sangli',
          latitude: 16.8524,
          longitude: 74.5815
        }
      }));
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    });
  });

  it('validates invalid latitude and displays error', async () => {
    render(
      <MemoryRouter>
        <CustomerProfile />
      </MemoryRouter>
    );

    const latInput = screen.getByLabelText(/GPS Latitude/i);
    fireEvent.change(latInput, { target: { name: 'latitude', value: '150.0' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Latitude must be a valid number between -90 and 90/i)).toBeInTheDocument();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
