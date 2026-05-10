'use client';

/**
 * Buddy Client Component
 * 
 * Displays buddy system interface with notifications and watched rules.
 * 
 * Features:
 * - BuddyPanel component for managing buddy relationships
 * - Buddy notifications list with read/unread status
 * - Watched rules display for each buddy
 * - Real-time notification updates
 * 
 * Requirements: 9.1-9.9
 * - 9.1: Create buddy relationship with status 'pending'
 * - 9.2: Update relationship status to 'active' on acceptance
 * - 9.3: Allow buddies to select which lock rules they want to watch
 * - 9.4: Create buddy notification when user overrides watched rule
 * - 9.5: Send buddy notifications via Supabase Realtime
 * - 9.6: Allow buddies to view override logs for watched rules only
 * - 9.7: Update status to 'removed' when relationship is removed
 * - 9.8: Prevent users from modifying buddy's lock rules
 * - 9.9: Enforce row-level security for buddy relationships
 */

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import BuddyPanel from '@/components/features/BuddyPanel';
import { useBuddyNotifications } from '@/lib/hooks/useBuddyNotifications';
import type { Buddy, LockRule, BuddyNotification } from '@/types';

interface BuddyClientProps {
  user: User;
  buddies: Buddy[];
  lockRules: LockRule[];
  notifications: Array<BuddyNotification & {
    from_user?: {
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
}

export default function BuddyClient({
  user,
  buddies: initialBuddies,
  lockRules,
  notifications: initialNotifications,
}: BuddyClientProps) {
  const [buddies, setBuddies] = useState(initialBuddies);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time buddy notifications
  const { isSubscribed } = useBuddyNotifications(user?.id || null, (newNotification) => {
    // Add new notification to the top of the list
    setNotifications((prev) => [newNotification, ...prev]);
  });

  // Handle buddy invitation
  const handleInvite = async (email: string, rulesWatching: string[]) => {
    setError(null);

    try {
      const response = await fetch('/api/buddy/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buddy_email: email,
          rules_watching: rulesWatching.length > 0 ? rulesWatching : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send invitation');
      }

      const data = await response.json();
      
      // Add new buddy to the list
      setBuddies((prev) => [data.buddy, ...prev]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      throw err; // Re-throw so BuddyPanel can handle it
    }
  };

  // Handle buddy removal (optional - API endpoint may not be implemented yet)
  const handleRemove = async (buddyId: string) => {
    setError(null);

    try {
      // Note: DELETE /api/buddy/{id} endpoint needs to be implemented
      // For now, this is a placeholder that will fail gracefully
      const response = await fetch(`/api/buddy/${buddyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove buddy');
      }

      // Update buddy status to 'removed' in the list
      setBuddies((prev) =>
        prev.map((buddy) =>
          buddy.id === buddyId ? { ...buddy, status: 'removed' as const } : buddy
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove buddy';
      setError(errorMessage);
      throw err;
    }
  };

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/buddy/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: [notificationId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update notification in the list
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Filter out removed buddies for display
  const activeBuddies = buddies.filter((b) => b.status !== 'removed');

  // Get unread notification count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Format notification message
  const formatNotificationMessage = (notification: typeof notifications[0]) => {
    if (notification.message) {
      return notification.message;
    }

    const userName = notification.from_user?.full_name || 'Your buddy';
    
    switch (notification.event_type) {
      case 'override':
        return `${userName} overrode ${notification.app_name || 'a lock rule'}`;
      case 'streak_broken':
        return `${userName}'s streak was broken`;
      case 'weekly_summary':
        return `Weekly summary from ${userName}`;
      default:
        return 'New notification';
    }
  };

  return (
    <div className="buddy-page">
      {/* Page Header */}
      <header className="buddy-header">
        <h1 className="buddy-title">Accountability Buddies</h1>
        <p className="buddy-subtitle">
          Stay accountable with friends who watch your progress
        </p>
        {isSubscribed && (
          <div className="realtime-indicator">
            <span className="realtime-dot"></span>
            <span className="realtime-text">Live</span>
          </div>
        )}
      </header>

      {/* Global Error Display */}
      {error && (
        <div className="buddy-error" role="alert">
          {error}
        </div>
      )}

      {/* Notifications Section */}
      <section className="buddy-notifications-section">
        <h2 className="buddy-section-title">
          Notifications
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </h2>

        {notifications.length === 0 ? (
          <div className="buddy-empty-state">
            <p>No notifications yet. Invite a buddy to get started!</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !notification.is_read) {
                    handleMarkAsRead(notification.id);
                  }
                }}
              >
                <div className="notification-header">
                  <div className="notification-avatar">
                    {notification.from_user?.full_name?.substring(0, 2).toUpperCase() || 'BU'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">
                      {formatNotificationMessage(notification)}
                    </div>
                    <div className="notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="notification-unread-indicator" aria-label="Unread" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Buddy Panel Section */}
      <section className="buddy-panel-section">
        <BuddyPanel
          buddies={activeBuddies}
          lockRules={lockRules}
          onInvite={handleInvite}
          onRemove={handleRemove}
        />
      </section>

      <style jsx>{`
        .buddy-page {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .buddy-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .buddy-title {
          font-size: 32px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }

        .buddy-subtitle {
          font-size: 16px;
          color: #666;
        }

        .realtime-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 4px 12px;
          background: #e8f5e9;
          border: 1px solid #4caf50;
          border-radius: 16px;
          font-size: 13px;
          color: #2e7d32;
          font-weight: 500;
        }

        .realtime-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4caf50;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .realtime-text {
          font-weight: 600;
        }

        .buddy-error {
          padding: 16px;
          margin-bottom: 24px;
          background: #ffebee;
          border: 2px solid #ff5252;
          border-radius: 12px;
          color: #c62828;
          font-size: 14px;
          text-align: center;
        }

        .buddy-notifications-section {
          margin-bottom: 32px;
        }

        .buddy-section-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .unread-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 8px;
          background: #ff5252;
          color: white;
          font-size: 12px;
          font-weight: 700;
          border-radius: 12px;
        }

        .buddy-empty-state {
          padding: 32px;
          text-align: center;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          color: #666;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-card {
          padding: 16px;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-card.unread {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .notification-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .notification-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notification-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .notification-message {
          font-size: 15px;
          font-weight: 500;
          color: #333;
        }

        .notification-time {
          font-size: 13px;
          color: #9e9e9e;
        }

        .notification-unread-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #667eea;
          flex-shrink: 0;
        }

        .buddy-panel-section {
          margin-bottom: 32px;
        }

        @media (max-width: 768px) {
          .buddy-page {
            padding: 20px;
          }

          .buddy-title {
            font-size: 28px;
          }

          .buddy-subtitle {
            font-size: 14px;
          }

          .buddy-section-title {
            font-size: 22px;
          }

          .notification-avatar {
            width: 42px;
            height: 42px;
            font-size: 14px;
          }

          .notification-message {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .buddy-page {
            padding: 16px;
          }

          .buddy-title {
            font-size: 24px;
          }

          .buddy-subtitle {
            font-size: 13px;
          }

          .buddy-section-title {
            font-size: 20px;
          }

          .notification-card {
            padding: 14px;
          }

          .notification-avatar {
            width: 40px;
            height: 40px;
            font-size: 13px;
          }

          .notification-message {
            font-size: 13px;
          }

          .notification-time {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
