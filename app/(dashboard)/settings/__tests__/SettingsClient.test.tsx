import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SettingsClient from '../SettingsClient';
import type { Profile } from '@/types/database';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SettingsClient', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockProfile: Profile = {
    id: 'user-123',
    full_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    timezone: 'Asia/Kolkata',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorage.clear();
  });

  it('should render profile form with initial values', () => {
    render(<SettingsClient profile={mockProfile} />);

    expect(screen.getByLabelText(/full name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/avatar url/i)).toHaveValue('https://example.com/avatar.jpg');
    expect(screen.getByLabelText(/timezone/i)).toHaveValue('Asia/Kolkata');
  });

  it('should render notification preferences section', () => {
    render(<SettingsClient profile={mockProfile} />);

    expect(screen.getByText(/notification preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/notify me when an app is about to unlock/i)).toBeInTheDocument();
    expect(screen.getByText(/notify me when my buddy overrides a watched rule/i)).toBeInTheDocument();
    expect(screen.getByText(/notify my buddy when i break my streak/i)).toBeInTheDocument();
    expect(screen.getByText(/notify me when i earn a new badge/i)).toBeInTheDocument();
  });

  it('should update profile form fields', () => {
    render(<SettingsClient profile={mockProfile} />);

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    expect(nameInput).toHaveValue('Jane Smith');

    const avatarInput = screen.getByLabelText(/avatar url/i);
    fireEvent.change(avatarInput, { target: { value: 'https://example.com/new-avatar.jpg' } });
    expect(avatarInput).toHaveValue('https://example.com/new-avatar.jpg');

    const timezoneSelect = screen.getByLabelText(/timezone/i);
    fireEvent.change(timezoneSelect, { target: { value: 'America/New_York' } });
    expect(timezoneSelect).toHaveValue('America/New_York');
  });

  it('should save profile changes successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { ...mockProfile, full_name: 'Jane Smith' } }),
    });

    render(<SettingsClient profile={mockProfile} />);

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar.jpg',
          timezone: 'Asia/Kolkata',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    });

    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should handle profile save error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Database error' } }),
    });

    render(<SettingsClient profile={mockProfile} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/database error/i)).toBeInTheDocument();
    });
  });

  it('should export data successfully', async () => {
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    document.createElement = jest.fn(() => ({
      click: mockClick,
      href: '',
      download: '',
    })) as any;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    render(<SettingsClient profile={mockProfile} />);

    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/export');
    });

    await waitFor(() => {
      expect(screen.getByText(/data exported successfully/i)).toBeInTheDocument();
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should handle export data error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Export failed' } }),
    });

    render(<SettingsClient profile={mockProfile} />);

    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
    });
  });

  it('should show delete confirmation dialog', () => {
    render(<SettingsClient profile={mockProfile} />);

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    expect(screen.getByText(/are you sure\? this will permanently delete all your data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yes, delete my account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should cancel delete confirmation', () => {
    render(<SettingsClient profile={mockProfile} />);

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/are you sure\?/i)).not.toBeInTheDocument();
  });

  it('should delete account successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsClient profile={mockProfile} />);

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/account', {
        method: 'DELETE',
      });
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('should handle delete account error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Delete failed' } }),
    });

    render(<SettingsClient profile={mockProfile} />);

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should toggle notification preferences', () => {
    render(<SettingsClient profile={mockProfile} />);

    const unlockCheckbox = screen.getByLabelText(/notify me when an app is about to unlock/i);
    expect(unlockCheckbox).not.toBeChecked();

    fireEvent.click(unlockCheckbox);
    expect(unlockCheckbox).toBeChecked();

    fireEvent.click(unlockCheckbox);
    expect(unlockCheckbox).not.toBeChecked();
  });

  it('should save notification preferences to localStorage', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: mockProfile }),
    });

    render(<SettingsClient profile={mockProfile} />);

    const unlockCheckbox = screen.getByLabelText(/notify me when an app is about to unlock/i);
    fireEvent.click(unlockCheckbox);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(localStorage.getItem('notify_unlock')).toBe('true');
    });
  });

  it('should display privacy policy section', () => {
    render(<SettingsClient profile={mockProfile} />);

    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    expect(screen.getByText(/focuslock collects and stores/i)).toBeInTheDocument();
    expect(screen.getByText(/read full privacy policy/i)).toBeInTheDocument();
  });
});
