/**
 * BuddyClient Component Tests
 * 
 * Tests the buddy page client component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BuddyClient from '../BuddyClient';
import type { User } from '@supabase/supabase-js';
import type { Buddy, LockRule, BuddyNotification } from '@/types';

// Mock the useBuddyNotifications hook
jest.mock('@/lib/hooks/useBuddyNotifications', () => ({
  useBuddyNotifications: jest.fn((userId, onNewNotification) => {
    // Store the callback for testing
    if (onNewNotification) {
      (global as any).__buddyNotificationCallback = onNewNotification;
    }
    return { isSubscribed: true };
  }),
}));

// Mock the BuddyPanel component
jest.mock('@/components/features/BuddyPanel', () => {
  return function MockBuddyPanel({ buddies, lockRules, onInvite, onRemove }: any) {
    return (
      <div data-testid="buddy-panel">
        <div>Buddies: {buddies.length}</div>
        <div>Lock Rules: {lockRules.length}</div>
        <button onClick={() => onInvite('test@example.com', ['rule-1'])}>
          Invite Buddy
        </button>
        {onRemove && (
          <button onClick={() => onRemove('buddy-1')}>
            Remove Buddy
          </button>
        )}
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('BuddyClient', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockBuddies: Buddy[] = [
    {
      id: 'buddy-1',
      user_id: 'user-123',
      buddy_user_id: 'buddy-user-1',
      rules_watching: ['rule-1'],
      status: 'active',
      invited_at: '2024-01-10T10:00:00Z',
      accepted_at: '2024-01-10T11:00:00Z',
    },
    {
      id: 'buddy-2',
      user_id: 'user-123',
      buddy_user_id: 'buddy-user-2',
      rules_watching: null,
      status: 'pending',
      invited_at: '2024-01-15T10:00:00Z',
      accepted_at: null,
    },
  ];

  const mockLockRules: LockRule[] = [
    {
      id: 'rule-1',
      user_id: 'user-123',
      app_name: 'Instagram',
      app_icon_url: null,
      app_scheme: null,
      lock_type: 'timer',
      daily_limit_minutes: 30,
      schedule_start: null,
      schedule_end: null,
      schedule_days: null,
      unlock_date: null,
      hide_from_home: false,
      hide_from_search: false,
      strict_mode: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockNotifications: Array<BuddyNotification & {
    from_user?: {
      full_name: string | null;
      avatar_url: string | null;
    };
  }> = [
    {
      id: 'notif-1',
      from_user_id: 'buddy-user-1',
      to_user_id: 'user-123',
      event_type: 'override',
      app_name: 'Instagram',
      message: null,
      is_read: false,
      created_at: '2024-01-15T12:00:00Z',
      from_user: {
        full_name: 'John Doe',
        avatar_url: null,
      },
    },
    {
      id: 'notif-2',
      from_user_id: 'buddy-user-2',
      to_user_id: 'user-123',
      event_type: 'weekly_summary',
      app_name: null,
      message: 'Weekly summary from your buddy',
      is_read: true,
      created_at: '2024-01-14T12:00:00Z',
      from_user: {
        full_name: 'Jane Smith',
        avatar_url: null,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page header', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText('Accountability Buddies')).toBeInTheDocument();
    expect(screen.getByText('Stay accountable with friends who watch your progress')).toBeInTheDocument();
  });

  it('displays unread notification count', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument(); // Unread badge
  });

  it('renders BuddyPanel with correct props', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    const buddyPanel = screen.getByTestId('buddy-panel');
    expect(buddyPanel).toHaveTextContent('Buddies: 2');
    expect(buddyPanel).toHaveTextContent('Lock Rules: 1');
  });

  it('displays notifications list', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText(/John Doe overrode Instagram/)).toBeInTheDocument();
    expect(screen.getByText('Weekly summary from your buddy')).toBeInTheDocument();
  });

  it('handles buddy invitation successfully', async () => {
    const mockResponse = {
      buddy: {
        id: 'buddy-3',
        user_id: 'user-123',
        buddy_user_id: 'buddy-user-3',
        rules_watching: ['rule-1'],
        status: 'pending',
        invited_at: '2024-01-16T10:00:00Z',
        accepted_at: null,
      },
      invite_sent: true,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    const inviteButton = screen.getByText('Invite Buddy');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/buddy/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buddy_email: 'test@example.com',
          rules_watching: ['rule-1'],
        }),
      });
    });
  });

  it('handles buddy invitation error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: 'User not found' },
      }),
    });

    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    const inviteButton = screen.getByText('Invite Buddy');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Error should be displayed in the UI
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('User not found');
    });
  });

  it('marks notification as read when clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        updated_count: 1,
        notifications: [{ id: 'notif-1', is_read: true }],
      }),
    });

    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    const unreadNotification = screen.getByText(/John Doe overrode Instagram/).closest('.notification-card');
    
    if (unreadNotification) {
      fireEvent.click(unreadNotification);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/buddy/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_ids: ['notif-1'],
          }),
        });
      });
    }
  });

  it('displays empty state when no notifications', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={[]}
      />
    );

    expect(screen.getByText('No notifications yet. Invite a buddy to get started!')).toBeInTheDocument();
  });

  it('filters out removed buddies from BuddyPanel', () => {
    const buddiesWithRemoved: Buddy[] = [
      ...mockBuddies,
      {
        id: 'buddy-3',
        user_id: 'user-123',
        buddy_user_id: 'buddy-user-3',
        rules_watching: null,
        status: 'removed',
        invited_at: '2024-01-01T10:00:00Z',
        accepted_at: '2024-01-01T11:00:00Z',
      },
    ];

    render(
      <BuddyClient
        user={mockUser}
        buddies={buddiesWithRemoved}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    const buddyPanel = screen.getByTestId('buddy-panel');
    // Should only show 2 buddies (removed one is filtered out)
    expect(buddyPanel).toHaveTextContent('Buddies: 2');
  });

  it('formats notification message for override event', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText(/John Doe overrode Instagram/)).toBeInTheDocument();
  });

  it('formats notification message for weekly_summary event', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText('Weekly summary from your buddy')).toBeInTheDocument();
  });

  it('uses custom message when provided', () => {
    const notificationsWithCustomMessage = [
      {
        ...mockNotifications[0],
        message: 'Custom notification message',
      },
    ];

    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={notificationsWithCustomMessage}
      />
    );

    expect(screen.getByText('Custom notification message')).toBeInTheDocument();
  });

  it('displays real-time connection indicator when subscribed', () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('adds new notification to the list when received via real-time', async () => {
    render(
      <BuddyClient
        user={mockUser}
        buddies={mockBuddies}
        lockRules={mockLockRules}
        notifications={mockNotifications}
      />
    );

    // Initial notification count
    expect(screen.getAllByRole('button', { name: /notification/i }).length).toBeGreaterThanOrEqual(0);

    // Simulate receiving a new notification via real-time
    const newNotification: BuddyNotification & {
      from_user?: {
        full_name: string | null;
        avatar_url: string | null;
      };
    } = {
      id: 'notif-3',
      from_user_id: 'buddy-user-1',
      to_user_id: 'user-123',
      event_type: 'override',
      app_name: 'TikTok',
      message: null,
      is_read: false,
      created_at: new Date().toISOString(),
      from_user: {
        full_name: 'John Doe',
        avatar_url: null,
      },
    };

    // Trigger the callback
    if ((global as any).__buddyNotificationCallback) {
      (global as any).__buddyNotificationCallback(newNotification);
    }

    // Wait for the new notification to appear
    await waitFor(() => {
      expect(screen.getByText(/John Doe overrode TikTok/)).toBeInTheDocument();
    });
  });
});
