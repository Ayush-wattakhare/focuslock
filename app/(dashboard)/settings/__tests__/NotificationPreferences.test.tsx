/**
 * Notification Preferences UI Tests
 * Tests for Task 13.3: Create notification preferences UI
 * Requirements: 21.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsClient from '../SettingsClient';
import type { Profile } from '@/types/database';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock notification service
jest.mock('@/lib/core/notificationService', () => ({
  syncNotificationPreferences: jest.fn(),
}));

describe('Notification Preferences UI', () => {
  const mockProfile: Profile = {
    id: 'test-user-id',
    full_name: 'Test User',
    avatar_url: null,
    timezone: 'Asia/Kolkata',
    notify_unlock: false,
    notify_buddy_override: false,
    notify_streak_broken: false,
    notify_badge_earned: true,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 21.5: Configure notification preferences', () => {
    it('should display all notification preference toggles', () => {
      render(<SettingsClient profile={mockProfile} />);

      expect(screen.getByText(/Notify me when an app is about to unlock/i)).toBeInTheDocument();
      expect(screen.getByText(/Notify me when my buddy overrides a watched rule/i)).toBeInTheDocument();
      expect(screen.getByText(/Notify my buddy when I break my streak/i)).toBeInTheDocument();
      expect(screen.getByText(/Notify me when I earn a new badge/i)).toBeInTheDocument();
    });

    it('should initialize toggles with profile values', () => {
      render(<SettingsClient profile={mockProfile} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Find notification checkboxes (skip any other checkboxes)
      const notifyUnlock = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('app is about to unlock')
      ) as HTMLInputElement;
      const notifyBuddyOverride = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('buddy overrides')
      ) as HTMLInputElement;
      const notifyStreakBroken = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('break my streak')
      ) as HTMLInputElement;
      const notifyBadgeEarned = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('earn a new badge')
      ) as HTMLInputElement;

      expect(notifyUnlock?.checked).toBe(false);
      expect(notifyBuddyOverride?.checked).toBe(false);
      expect(notifyStreakBroken?.checked).toBe(false);
      expect(notifyBadgeEarned?.checked).toBe(true);
    });

    it('should toggle notification preferences when clicked', () => {
      render(<SettingsClient profile={mockProfile} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const notifyUnlock = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('app is about to unlock')
      ) as HTMLInputElement;

      expect(notifyUnlock.checked).toBe(false);
      
      fireEvent.click(notifyUnlock);
      
      expect(notifyUnlock.checked).toBe(true);
    });

    it('should save notification preferences to profile', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      });

      render(<SettingsClient profile={mockProfile} />);

      // Toggle a preference
      const checkboxes = screen.getAllByRole('checkbox');
      const notifyUnlock = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('app is about to unlock')
      ) as HTMLInputElement;
      
      fireEvent.click(notifyUnlock);

      // Click save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"notify_unlock":true'),
          })
        );
      });
    });

    it('should include all notification preferences in save request', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      });

      render(<SettingsClient profile={mockProfile} />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        
        expect(body).toHaveProperty('notify_unlock');
        expect(body).toHaveProperty('notify_buddy_override');
        expect(body).toHaveProperty('notify_streak_broken');
        expect(body).toHaveProperty('notify_badge_earned');
      });
    });

    it('should display success message after saving preferences', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      });

      render(<SettingsClient profile={mockProfile} />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Settings saved successfully!/i)).toBeInTheDocument();
      });
    });

    it('should display error message if save fails', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Failed to update profile' } }),
      });

      render(<SettingsClient profile={mockProfile} />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to update profile/i)).toBeInTheDocument();
      });
    });

    it('should handle profile with default notification preferences', () => {
      const profileWithDefaults: Profile = {
        ...mockProfile,
        notify_unlock: false,
        notify_buddy_override: false,
        notify_streak_broken: false,
        notify_badge_earned: true,
      };

      render(<SettingsClient profile={profileWithDefaults} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const notifyBadgeEarned = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('earn a new badge')
      ) as HTMLInputElement;

      // Badge earned should default to true
      expect(notifyBadgeEarned.checked).toBe(true);
    });
  });

  describe('Integration with profile settings', () => {
    it('should save notification preferences along with profile data', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      });

      render(<SettingsClient profile={mockProfile} />);

      // Update profile field
      const nameInput = screen.getByLabelText(/Full Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      // Toggle notification preference
      const checkboxes = screen.getAllByRole('checkbox');
      const notifyUnlock = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('app is about to unlock')
      ) as HTMLInputElement;
      fireEvent.click(notifyUnlock);

      // Save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        
        expect(body.full_name).toBe('Updated Name');
        expect(body.notify_unlock).toBe(true);
      });
    });
  });
});
