'use client';

/**
 * Lock Screen Client Component
 * 
 * Displays the lock screen UI with countdown, lock reason, and override options
 * Integrates CountdownRing and MoodPrompt components
 * Fully responsive design (mobile-first approach)
 * 
 * Requirements: 3.1-3.8, 4.1-4.6, 13.1-13.6
 * - 3.1-3.8: Display countdown ring with time remaining
 * - 4.1-4.6: Emergency override with mood prompt
 * - 13.1-13.6: Nuclear mode (no override button)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CountdownRing from '@/components/features/CountdownRing';
import MoodPrompt from '@/components/features/MoodPrompt';
import { LockRule, LockStatus, Mood } from '@/types';
import { evaluateLock } from '@/lib/core/lockEvaluator';
import { 
  requestNotificationPermission, 
  scheduleNotification,
  sendUnlockReminder 
} from '@/lib/core/notificationService';

interface LockScreenClientProps {
  rule: LockRule;
  todayUsageMinutes: number;
  userTimezone: string;
}

export default function LockScreenClient({
  rule,
  todayUsageMinutes,
  userTimezone
}: LockScreenClientProps) {
  const router = useRouter();
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null);
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evaluate lock status on mount and every second
  useEffect(() => {
    const updateLockStatus = () => {
      const status = evaluateLock(rule, new Date(), todayUsageMinutes, userTimezone);
      setLockStatus(status);

      // If app is unlocked, redirect to dashboard
      if (!status.isLocked) {
        router.push('/dashboard');
      }
    };

    updateLockStatus();
    const interval = setInterval(updateLockStatus, 1000);

    return () => clearInterval(interval);
  }, [rule, todayUsageMinutes, userTimezone, router]);

  const handleOverrideClick = () => {
    // Nuclear mode: no override allowed
    if (rule.lock_type === 'nuclear') {
      setError('Nuclear mode is active. Override is not possible.');
      return;
    }

    // Show mood prompt
    setShowMoodPrompt(true);
    setError(null);
  };

  const handleMoodSubmit = async (mood: Mood, reason: string) => {
    setIsOverriding(true);
    setError(null);

    try {
      const response = await fetch('/api/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lock_rule_id: rule.id,
          app_name: rule.app_name,
          mood,
          reason_text: reason || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to override lock');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override lock');
      setShowMoodPrompt(false);
    } finally {
      setIsOverriding(false);
    }
  };

  const handleSetReminder = async () => {
    try {
      // Request notification permission
      const permission = await requestNotificationPermission();
      
      if (permission !== 'granted') {
        setError('Notification permission is required to set reminders');
        return;
      }

      if (!lockStatus?.unlocksAt) {
        setError('Cannot set reminder: unlock time is not available');
        return;
      }

      // Send unlock reminder notification
      await sendUnlockReminder(rule.app_name, lockStatus.unlocksAt);
      
      setReminderSet(true);
      setTimeout(() => setReminderSet(false), 3000); // Hide success message after 3s
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set reminder');
    }
  };

  const getLockTypeBadge = () => {
    const badges = {
      timer: { label: 'Timer Lock', color: '#ffa726', icon: '⏱️' },
      schedule: { label: 'Schedule Lock', color: '#66bb6a', icon: '📅' },
      until_date: { label: 'Date Lock', color: '#42a5f5', icon: '📆' },
      nuclear: { label: 'Nuclear Mode', color: '#ef5350', icon: '☢️' },
    };

    return badges[rule.lock_type] || badges.timer;
  };

  if (!lockStatus) {
    return (
      <div className="lock-screen-loading">
        <p>Loading...</p>
      </div>
    );
  }

  const badge = getLockTypeBadge();

  return (
    <>
      <div className="lock-screen-container">
        {/* Header */}
        <header className="lock-screen-header">
          <button
            onClick={() => router.push('/dashboard')}
            className="back-button"
            aria-label="Back to dashboard"
          >
            ← Back
          </button>
        </header>

        {/* Main Content */}
        <main className="lock-screen-main">
          <div className="lock-screen-content">
            {/* App Icon and Name */}
            <div className="app-info">
              {rule.app_icon_url && (
                <img
                  src={rule.app_icon_url}
                  alt={`${rule.app_name} icon`}
                  className="app-icon"
                />
              )}
              <h1 className="app-name">{rule.app_name}</h1>
            </div>

            {/* Lock Type Badge */}
            <div className="lock-badge" style={{ backgroundColor: badge.color }}>
              <span className="lock-badge-icon">{badge.icon}</span>
              <span className="lock-badge-label">{badge.label}</span>
            </div>

            {/* Countdown Ring */}
            {lockStatus.unlocksAt && (
              <div className="countdown-section">
                <CountdownRing
                  unlocksAt={lockStatus.unlocksAt}
                  lockType={rule.lock_type}
                />
              </div>
            )}

            {/* Lock Reason */}
            {lockStatus.reason && (
              <div className="lock-reason">
                <p className="reason-text">{lockStatus.reason}</p>
              </div>
            )}

            {/* Nuclear Mode Message */}
            {rule.lock_type === 'nuclear' && (
              <div className="nuclear-message">
                <p className="nuclear-text">
                  ☢️ Nuclear mode is active. This lock cannot be overridden.
                </p>
                <p className="nuclear-subtext">
                  You committed to staying focused. Keep going!
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {/* Reminder Success Message */}
            {reminderSet && (
              <div className="success-message" role="status">
                ✓ Reminder set! You'll be notified when the app unlocks.
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              {/* Set Reminder Button */}
              {lockStatus.unlocksAt && (
                <button
                  onClick={handleSetReminder}
                  className="action-btn reminder-btn"
                  disabled={reminderSet}
                >
                  <span className="btn-icon">🔔</span>
                  <span className="btn-text">
                    {reminderSet ? 'Reminder Set' : 'Set Reminder'}
                  </span>
                </button>
              )}

              {/* Emergency Override Button (not for nuclear mode) */}
              {rule.lock_type !== 'nuclear' && (
                <button
                  onClick={handleOverrideClick}
                  className="action-btn override-btn"
                  disabled={isOverriding}
                >
                  <span className="btn-icon">🚨</span>
                  <span className="btn-text">
                    {isOverriding ? 'Processing...' : 'Emergency Override'}
                  </span>
                </button>
              )}
            </div>

            {/* Strict Mode Notice */}
            {rule.strict_mode && rule.lock_type !== 'nuclear' && (
              <div className="strict-mode-notice">
                <p className="strict-mode-text">
                  ⚠️ Strict mode is enabled. You'll need to explain your reason.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mood Prompt Modal */}
      {showMoodPrompt && (
        <MoodPrompt
          onSubmit={handleMoodSubmit}
          isStrictMode={rule.strict_mode}
          onCancel={() => setShowMoodPrompt(false)}
        />
      )}

      <style jsx>{`
        /* Mobile-first responsive design */
        .lock-screen-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
        }

        .lock-screen-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 18px;
        }

        .lock-screen-header {
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .back-button {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          font-family: inherit;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .back-button:active {
          transform: scale(0.98);
        }

        .lock-screen-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .lock-screen-content {
          width: 100%;
          max-width: 500px;
          background: white;
          border-radius: 24px;
          padding: 32px 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }

        .app-info {
          margin-bottom: 20px;
        }

        .app-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .app-name {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }

        .lock-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .lock-badge-icon {
          font-size: 18px;
        }

        .lock-badge-label {
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .countdown-section {
          margin-bottom: 24px;
        }

        .lock-reason {
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f7fa;
          border-radius: 12px;
        }

        .reason-text {
          margin: 0;
          font-size: 16px;
          color: #666;
          line-height: 1.5;
        }

        .nuclear-message {
          margin-bottom: 24px;
          padding: 20px;
          background: #ffebee;
          border-radius: 12px;
          border: 2px solid #ef5350;
        }

        .nuclear-text {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #c62828;
        }

        .nuclear-subtext {
          margin: 0;
          font-size: 14px;
          color: #666;
        }

        .error-message {
          margin-bottom: 20px;
          padding: 12px 16px;
          background: #ffebee;
          color: #c62828;
          border-radius: 8px;
          font-size: 14px;
          border-left: 4px solid #c62828;
        }

        .success-message {
          margin-bottom: 20px;
          padding: 12px 16px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 8px;
          font-size: 14px;
          border-left: 4px solid #4caf50;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .action-btn {
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          font-family: inherit;
          width: 100%;
        }

        .action-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 20px;
        }

        .btn-text {
          flex: 1;
          text-align: center;
        }

        .reminder-btn {
          background: #4a90e2;
          color: white;
        }

        .reminder-btn:hover:not(:disabled) {
          background: #357abd;
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .override-btn {
          background: #ef5350;
          color: white;
        }

        .override-btn:hover:not(:disabled) {
          background: #d32f2f;
          box-shadow: 0 4px 12px rgba(239, 83, 80, 0.3);
        }

        .strict-mode-notice {
          padding: 12px 16px;
          background: #fff3e0;
          border-radius: 8px;
          border-left: 4px solid #ffa726;
        }

        .strict-mode-text {
          margin: 0;
          font-size: 13px;
          color: #e65100;
          line-height: 1.5;
        }

        /* Tablet breakpoint (768px+) */
        @media (min-width: 768px) {
          .lock-screen-header {
            padding: 20px 32px;
          }

          .back-button {
            padding: 10px 20px;
            font-size: 15px;
          }

          .lock-screen-main {
            padding: 32px;
          }

          .lock-screen-content {
            padding: 40px 32px;
          }

          .app-icon {
            width: 100px;
            height: 100px;
            border-radius: 24px;
          }

          .app-name {
            font-size: 28px;
          }

          .lock-badge {
            padding: 10px 20px;
            font-size: 15px;
          }

          .lock-badge-icon {
            font-size: 20px;
          }

          .reason-text {
            font-size: 17px;
          }

          .nuclear-text {
            font-size: 17px;
          }

          .nuclear-subtext {
            font-size: 15px;
          }

          .action-buttons {
            flex-direction: row;
          }

          .action-btn {
            flex: 1;
            padding: 16px 24px;
            font-size: 16px;
          }
        }

        /* Desktop breakpoint (1024px+) */
        @media (min-width: 1024px) {
          .lock-screen-content {
            max-width: 600px;
            padding: 48px 40px;
          }

          .app-icon {
            width: 120px;
            height: 120px;
          }

          .app-name {
            font-size: 32px;
          }

          .countdown-section {
            margin-bottom: 32px;
          }

          .lock-reason {
            padding: 20px;
          }

          .reason-text {
            font-size: 18px;
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .action-btn,
          .back-button {
            min-height: 44px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .action-btn,
          .back-button {
            transition: none;
          }

          .action-btn:active,
          .back-button:active {
            transform: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .lock-screen-content {
            border: 2px solid #333;
          }

          .lock-badge {
            border: 2px solid white;
          }
        }
      `}</style>
    </>
  );
}
