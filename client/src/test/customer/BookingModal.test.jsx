import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingModal from '../../components/booking/BookingModal';
import * as AuthContextModule from '../../context/AuthContext';
import { bookingApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  bookingApi: {
    createBooking: vi.fn()
  }
}));

describe('BookingModal Component', () => {
  const mockProvider = {
    _id: 'prov-101',
    name: 'Rajesh Sharma',
    city: 'sangli',
    startingPrice: 350,
    servicesOffered: ['AC Deep Cleaning', 'Filter Replacement'],
    providerDetails: {
      category: 'AC & Appliance Repair',
      startingPrice: 350
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        _id: 'cust-1',
        name: 'Amit Joshi',
        email: 'amit@example.com',
        role: 'customer',
        city: 'sangli',
        emailVerified: true
      }
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <MemoryRouter>
        <BookingModal provider={mockProvider} isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders booking form with provider details and services when isOpen is true', () => {
    render(
      <MemoryRouter>
        <BookingModal provider={mockProvider} isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Book Rajesh Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Service Required/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/AC Deep Cleaning/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Apartment\/Flat, Building name/i)).toBeInTheDocument();
  });

  it('validates empty service delivery address on Next step', async () => {
    render(
      <MemoryRouter>
        <BookingModal provider={mockProvider} isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const addressInput = screen.getByPlaceholderText(/Apartment\/Flat, Building name/i);
    fireEvent.change(addressInput, { target: { value: 'abc' } });

    const form = addressInput.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please provide a complete service delivery address/i)).toBeInTheDocument();
    });
    expect(bookingApi.createBooking).not.toHaveBeenCalled();
  });

  it('submits booking and displays confirmation screen on success', async () => {
    const onSuccess = vi.fn();
    bookingApi.createBooking.mockResolvedValueOnce({
      success: true,
      booking: {
        _id: 'book-999',
        serviceName: 'AC Deep Cleaning',
        status: 'pending',
        price: 350
      }
    });

    render(
      <MemoryRouter>
        <BookingModal provider={mockProvider} isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />
      </MemoryRouter>
    );

    // Enter address
    const addressInput = screen.getByPlaceholderText(/Apartment\/Flat, Building name/i);
    fireEvent.change(addressInput, { target: { value: 'Flat 301, Silver Heights, Sangli' } });

    // Click Review
    const nextBtn = screen.getByRole('button', { name: /Review & Confirm Booking/i });
    fireEvent.click(nextBtn);

    // Confirm step
    await waitFor(() => {
      expect(screen.getByText(/Confirm Booking Request/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Send Request/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bookingApi.createBooking).toHaveBeenCalledWith(expect.objectContaining({
        providerId: 'prov-101',
        serviceName: 'AC Deep Cleaning',
        serviceAddress: 'Flat 301, Silver Heights, Sangli',
        city: 'sangli'
      }));
      expect(screen.getByText(/Booking Request Submitted!/i)).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
