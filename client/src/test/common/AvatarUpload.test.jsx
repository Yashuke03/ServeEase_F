import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AvatarUpload from '../../components/common/AvatarUpload';
import { userApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  userApi: {
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn()
  },
  getAvatarUrl: vi.fn((url) => url || '')
}));

describe('AvatarUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user initial placeholder when no avatar image exists', () => {
    const mockUser = { name: 'Vishvjeet Patil', avatar: '' };
    render(<AvatarUpload user={mockUser} />);

    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByTitle(/Change profile picture/i)).toBeInTheDocument();
  });

  it('renders avatar image when avatar URL is provided', () => {
    const mockUser = { name: 'John Doe', avatar: 'https://example.com/avatar.webp' };
    render(<AvatarUpload user={mockUser} />);

    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.webp');
  });

  it('rejects non-image files with error message', async () => {
    const mockUser = { name: 'John Doe', avatar: '' };
    const { container } = render(<AvatarUpload user={mockUser} />);

    const fileInput = container.querySelector('input[type="file"]');
    const textFile = new File(['dummy text content'], 'resume.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Please select a JPG, PNG, or WebP photo/i)).toBeInTheDocument();
    });
    expect(userApi.uploadAvatar).not.toHaveBeenCalled();
  });

  it('rejects files larger than 5 MB', async () => {
    const mockUser = { name: 'John Doe', avatar: '' };
    const { container } = render(<AvatarUpload user={mockUser} />);

    const fileInput = container.querySelector('input[type="file"]');
    // Create large 6MB file
    const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'giant.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Image size exceeds 5 MB/i)).toBeInTheDocument();
    });
    expect(userApi.uploadAvatar).not.toHaveBeenCalled();
  });

  it('uploads valid image and triggers onAvatarChange callback', async () => {
    const onAvatarChange = vi.fn();
    const updatedUser = { _id: 'u-1', name: 'John Doe', avatar: '/api/users/avatar/file-123' };
    userApi.uploadAvatar.mockResolvedValueOnce({ success: true, user: updatedUser });

    const mockUser = { name: 'John Doe', avatar: '' };
    const { container } = render(<AvatarUpload user={mockUser} onAvatarChange={onAvatarChange} />);

    const fileInput = container.querySelector('input[type="file"]');
    const validImage = new File(['fake-png-bytes'], 'face.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validImage] } });

    await waitFor(() => {
      expect(userApi.uploadAvatar).toHaveBeenCalledWith(validImage);
      expect(onAvatarChange).toHaveBeenCalledWith(updatedUser);
    });
  });

  it('handles delete avatar confirmation and triggers callback', async () => {
    const onAvatarChange = vi.fn();
    const resetUser = { _id: 'u-1', name: 'John Doe', avatar: '' };
    userApi.deleteAvatar.mockResolvedValueOnce({ success: true, user: resetUser });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const mockUser = { name: 'John Doe', avatar: '/api/users/avatar/file-123' };
    render(<AvatarUpload user={mockUser} onAvatarChange={onAvatarChange} showRemove={true} />);

    const removeBtn = screen.getByRole('button', { name: /Remove photo/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(userApi.deleteAvatar).toHaveBeenCalled();
      expect(onAvatarChange).toHaveBeenCalledWith(resetUser);
    });
  });
});
