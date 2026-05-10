/**
 * useBuddyNotifications Hook Tests
 * 
 * Tests the real-time buddy notifications hook functionality
 * 
 * **Validates: Requirements 9.5, 21.2, 21.3**
 * - 9.5: Send buddy notifications via Supabase Realtime
 * - 21.2: Send real-time notification when buddy overrides watched rule
 * - 21.3: Send notification when user breaks streak
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useBuddyNotifications } from '../useBuddyNotifications';
import { createClient } from '@/lib/supabase/client';
import { sendBuddyOverrideNotification } from '@/lib/core/notificationService';

// Mock Supabase client
jest.mock('@/lib/supabase/client');
jest.mock('@/lib/core/notificationService');

describe('useBuddyNotifications Hook', () => {
  let mockChannel: any;
  let mockSupabase: any;
  let subscribeCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock channel methods
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        // Call the callback with 'SUBSCRIBED' status
        setTimeout(() => callback('SUBSCRIBED'), 0);
        return mockChannel;
      }),
    };

    // Mock Supabase client
    mockSupabase = {
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn(),
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                full_name: 'John Doe',
                avatar_url: 'https://example.com/avatar.jpg',
              },
              error: null,
            })),
          })),
        })),
      })),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (sendBuddyOverrideNotification as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should subscribe to buddy_notifications table for the current user', async () => {
    const userId = 'user-123';

    renderHook(() => useBuddyNotifications(userId));

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('buddy_notifications');
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'buddy_notifications',
        filter: `to_user_id=eq.${userId}`,
      },
      expect.any(Function)
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should return isSubscribed as true when subscription is successful', async () => {
    const userId = 'user-123';

    const { result } = renderHook(() => useBuddyNotifications(userId));

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should not subscribe when userId is null', () => {
    const { result } = renderHook(() => useBuddyNotifications(null));

    expect(mockSupabase.channel).not.toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });

  /**
   * **Validates: Requirement 21.2**
   * WHEN a buddy overrides a watched rule, THE FocusLock_System SHALL send a 
   * real-time notification to the watching buddy
   */
  it('should call onNewNotification callback when new notification is received', async () => {
    const userId = 'user-123';
    const onNewNotification = jest.fn();

    renderHook(() => useBuddyNotifications(userId, onNewNotification));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving a notification
    const mockNotification = {
      new: {
        id: 'notif-1',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'override',
        app_name: 'Instagram',
        message: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    await waitFor(() => {
      expect(onNewNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notif-1',
          from_user_id: 'buddy-user-1',
          to_user_id: userId,
          event_type: 'override',
          app_name: 'Instagram',
          from_user: {
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        })
      );
    });
  });

  /**
   * **Validates: Requirement 21.2**
   * WHEN a buddy overrides a watched rule, THE FocusLock_System SHALL send a 
   * real-time notification to the watching buddy
   */
  it('should display browser notification for override events', async () => {
    const userId = 'user-123';

    renderHook(() => useBuddyNotifications(userId));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving an override notification
    const mockNotification = {
      new: {
        id: 'notif-1',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'override',
        app_name: 'Instagram',
        message: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    await waitFor(() => {
      expect(sendBuddyOverrideNotification).toHaveBeenCalledWith(
        'John Doe',
        'Instagram'
      );
    });
  });

  /**
   * **Validates: Requirement 21.3**
   * WHEN a user breaks their streak, THE FocusLock_System SHALL send a 
   * notification to their buddy if one is configured
   */
  it('should handle streak_broken event type', async () => {
    const userId = 'user-123';
    const onNewNotification = jest.fn();

    renderHook(() => useBuddyNotifications(userId, onNewNotification));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving a streak_broken notification
    const mockNotification = {
      new: {
        id: 'notif-2',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'streak_broken',
        app_name: null,
        message: 'Your buddy broke their streak',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    await waitFor(() => {
      expect(onNewNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'streak_broken',
          message: 'Your buddy broke their streak',
        })
      );
    });
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should handle weekly_summary event type', async () => {
    const userId = 'user-123';
    const onNewNotification = jest.fn();

    renderHook(() => useBuddyNotifications(userId, onNewNotification));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving a weekly_summary notification
    const mockNotification = {
      new: {
        id: 'notif-3',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'weekly_summary',
        app_name: null,
        message: 'Weekly summary from your buddy',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    await waitFor(() => {
      expect(onNewNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'weekly_summary',
          message: 'Weekly summary from your buddy',
        })
      );
    });
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should fetch from_user profile data for notifications', async () => {
    const userId = 'user-123';
    const onNewNotification = jest.fn();

    renderHook(() => useBuddyNotifications(userId, onNewNotification));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving a notification
    const mockNotification = {
      new: {
        id: 'notif-1',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'override',
        app_name: 'Instagram',
        message: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should cleanup subscription on unmount', async () => {
    const userId = 'user-123';

    const { unmount } = renderHook(() => useBuddyNotifications(userId));

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should not display browser notification for non-override events', async () => {
    const userId = 'user-123';

    renderHook(() => useBuddyNotifications(userId));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving a streak_broken notification
    const mockNotification = {
      new: {
        id: 'notif-2',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'streak_broken',
        app_name: null,
        message: 'Your buddy broke their streak',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    // Wait a bit to ensure no browser notification is sent
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(sendBuddyOverrideNotification).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 21.2**
   * WHEN a buddy overrides a watched rule, THE FocusLock_System SHALL send a 
   * real-time notification to the watching buddy
   */
  it('should not display browser notification when app_name is missing', async () => {
    const userId = 'user-123';

    renderHook(() => useBuddyNotifications(userId));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving an override notification without app_name
    const mockNotification = {
      new: {
        id: 'notif-1',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'override',
        app_name: null,
        message: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    // Wait a bit to ensure no browser notification is sent
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(sendBuddyOverrideNotification).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 9.5**
   * THE FocusLock_System SHALL send buddy notifications via Supabase Realtime
   */
  it('should handle profile fetch errors gracefully', async () => {
    const userId = 'user-123';
    const onNewNotification = jest.fn();

    // Mock profile fetch to return error
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Profile not found' },
          })),
        })),
      })),
    }));

    renderHook(() => useBuddyNotifications(userId, onNewNotification));

    // Wait for subscription to complete
    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Get the notification handler
    const notificationHandler = mockChannel.on.mock.calls[0][2];

    // Simulate receiving a notification
    const mockNotification = {
      new: {
        id: 'notif-1',
        from_user_id: 'buddy-user-1',
        to_user_id: userId,
        event_type: 'override',
        app_name: 'Instagram',
        message: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    await notificationHandler(mockNotification);

    // Should still call the callback with undefined from_user
    await waitFor(() => {
      expect(onNewNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notif-1',
          from_user: undefined,
        })
      );
    });
  });
});
