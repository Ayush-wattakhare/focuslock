/**
 * useBuddyNotifications Hook
 * Listens for real-time buddy notifications and displays browser notifications
 */

import { useEffect, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendBuddyOverrideNotification } from '@/lib/core/notificationService';

interface BuddyNotification {
  id: string;
  from_user_id: string;
  to_user_id: string;
  event_type: 'override' | 'streak_broken' | 'weekly_summary';
  app_name: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Hook to listen for buddy notifications and display browser notifications
 * @param userId - The current user's ID
 * @param onNewNotification - Optional callback when a new notification arrives
 */
export function useBuddyNotifications(
  userId: string | null,
  onNewNotification?: (notification: BuddyNotification) => void
) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNotification = useCallback(async (payload: any) => {
    const notification = payload.new as BuddyNotification;
    
    // Fetch the from_user profile data for the notification
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', notification.from_user_id)
      .single();

    const enrichedNotification = {
      ...notification,
      from_user: profile || undefined,
    };

    // Call the callback if provided
    if (onNewNotification) {
      onNewNotification(enrichedNotification);
    }

    // Show browser notification for override events
    if (notification.event_type === 'override' && notification.app_name) {
      const buddyName = profile?.full_name || 'Your buddy';
      await sendBuddyOverrideNotification(buddyName, notification.app_name);
    }
  }, [onNewNotification]);

  useEffect(() => {
    if (!userId) {
      setIsSubscribed(false);
      return;
    }

    const supabase = createClient();

    // Subscribe to buddy notifications
    const channel = supabase
      .channel('buddy_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_notifications',
          filter: `to_user_id=eq.${userId}`,
        },
        handleNotification
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      setIsSubscribed(false);
      supabase.removeChannel(channel);
    };
  }, [userId, handleNotification]);

  return { isSubscribed };
}
