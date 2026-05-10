'use client';

/**
 * LockCard Component
 * 
 * Individual app card displaying icon, name, and lock status.
 * 
 * Features:
 * - Visual states for different lock types (unlocked, timer, schedule, nuclear)
 * - Click handler to navigate to countdown screen if locked
 * - Displays lock status information
 * - Accessible keyboard navigation
 * 
 * Requirements: 3.1-3.8
 * - 3.1: Display app icon and name
 * - 3.2: Show lock status visually
 * - 3.3: Different visual states for lock types
 * - 3.4: Timer lock shows time remaining
 * - 3.5: Schedule lock shows unlock time
 * - 3.6: Nuclear lock shows no override possible
 * - 3.7: Click handler navigates to /lock/[appId]
 * - 3.8: Unlocked apps show normal state
 */

import { LockRule, LockStatus } from '@/types';
import { useRouter } from 'next/navigation';

interface LockCardProps {
  app: LockRule;
  lockStatus: LockStatus;
  onClick?: () => void;
}

export default function LockCard({ app, lockStatus, onClick }: LockCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (lockStatus.isLocked) {
      // Requirement 3.7: Navigate to countdown screen if locked
      router.push(`/lock/${app.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Determine lock type visual state
  const getLockTypeClass = () => {
    if (!lockStatus.isLocked) return 'unlocked';
    
    switch (app.lock_type) {
      case 'nuclear':
        return 'locked-nuclear';
      case 'timer':
        return 'locked-timer';
      case 'schedule':
        return 'locked-schedule';
      case 'until_date':
        return 'locked-until-date';
      default:
        return 'locked';
    }
  };

  // Format unlock time for display
  const formatUnlockTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else if (diffMins > 0) {
      return `${diffMins}m`;
    } else {
      return 'Soon';
    }
  };

  // Get lock icon based on lock type
  const getLockIcon = () => {
    if (!lockStatus.isLocked) return null;

    if (app.lock_type === 'nuclear') {
      // Nuclear icon (radiation symbol)
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Nuclear lock"
        >
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
            fill="currentColor"
          />
          <path
            d="M12 8l-3 5h2v3l3-5h-2V8z"
            fill="currentColor"
          />
        </svg>
      );
    }

    if (app.lock_type === 'timer') {
      // Timer icon (clock)
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Timer lock"
        >
          <circle cx="12" cy="13" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }

    if (app.lock_type === 'schedule') {
      // Schedule icon (calendar)
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Schedule lock"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
          <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }

    // Default lock icon
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Locked"
      >
        <path
          d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
          fill="currentColor"
        />
      </svg>
    );
  };

  return (
    <div
      className={`lock-card ${getLockTypeClass()}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${app.app_name} - ${lockStatus.isLocked ? 'Locked' : 'Unlocked'}`}
    >
      {/* App Icon - Requirement 3.1 */}
      <div className="lock-card-icon">
        {app.app_icon_url ? (
          <img src={app.app_icon_url} alt={`${app.app_name} icon`} />
        ) : (
          <div className="lock-card-icon-placeholder">
            {app.app_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* App Name - Requirement 3.1 */}
      <div className="lock-card-name">{app.app_name}</div>

      {/* Lock Badge - Requirements 3.2, 3.3 */}
      {lockStatus.isLocked && (
        <div className="lock-card-badge">
          {getLockIcon()}
        </div>
      )}

      {/* Lock Status Info - Requirements 3.4, 3.5, 3.6 */}
      {lockStatus.isLocked && (
        <div className="lock-card-status">
          {app.lock_type === 'nuclear' ? (
            // Requirement 3.6: Nuclear lock shows no override possible
            <span className="lock-card-status-text nuclear">No Override</span>
          ) : lockStatus.unlocksAt ? (
            // Requirements 3.4, 3.5: Show unlock time
            <span className="lock-card-status-text">
              {formatUnlockTime(lockStatus.unlocksAt)}
            </span>
          ) : (
            <span className="lock-card-status-text">Locked</span>
          )}
        </div>
      )}

      <style jsx>{`
        .lock-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 140px;
          min-width: 120px;
        }

        .lock-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .lock-card:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        /* Requirement 3.8: Unlocked state */
        .lock-card.unlocked {
          border-color: #e0e0e0;
          background: #ffffff;
        }

        .lock-card.unlocked:hover {
          border-color: #4a90e2;
        }

        /* Requirement 3.3: Timer lock visual state */
        .lock-card.locked-timer {
          border-color: #ffa726;
          background: #fff8f0;
        }

        .lock-card.locked-timer:hover {
          border-color: #ff9800;
        }

        /* Requirement 3.3: Schedule lock visual state */
        .lock-card.locked-schedule {
          border-color: #66bb6a;
          background: #f1f8f4;
        }

        .lock-card.locked-schedule:hover {
          border-color: #4caf50;
        }

        /* Requirement 3.3: Until date lock visual state */
        .lock-card.locked-until-date {
          border-color: #42a5f5;
          background: #f0f7ff;
        }

        .lock-card.locked-until-date:hover {
          border-color: #2196f3;
        }

        /* Requirement 3.3: Nuclear lock visual state */
        .lock-card.locked-nuclear {
          border-color: #ef5350;
          background: #fff5f5;
        }

        .lock-card.locked-nuclear:hover {
          border-color: #f44336;
        }

        .lock-card-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 12px;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lock-card-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .lock-card-icon-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
        }

        .lock-card-name {
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          color: #333;
          word-break: break-word;
          line-height: 1.4;
          max-width: 100%;
        }

        .lock-card-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .locked-timer .lock-card-badge {
          background: rgba(255, 167, 38, 0.95);
          color: white;
        }

        .locked-schedule .lock-card-badge {
          background: rgba(102, 187, 106, 0.95);
          color: white;
        }

        .locked-until-date .lock-card-badge {
          background: rgba(66, 165, 245, 0.95);
          color: white;
        }

        .locked-nuclear .lock-card-badge {
          background: rgba(239, 83, 80, 0.95);
          color: white;
        }

        .lock-card-status {
          margin-top: 8px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .locked-timer .lock-card-status {
          background: rgba(255, 167, 38, 0.15);
          color: #f57c00;
        }

        .locked-schedule .lock-card-status {
          background: rgba(102, 187, 106, 0.15);
          color: #388e3c;
        }

        .locked-until-date .lock-card-status {
          background: rgba(66, 165, 245, 0.15);
          color: #1976d2;
        }

        .locked-nuclear .lock-card-status {
          background: rgba(239, 83, 80, 0.15);
          color: #d32f2f;
        }

        .lock-card-status-text {
          display: block;
          text-align: center;
        }

        .lock-card-status-text.nuclear {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .lock-card {
            min-height: 120px;
            min-width: 100px;
            padding: 12px;
          }

          .lock-card-icon {
            width: 56px;
            height: 56px;
            margin-bottom: 10px;
          }

          .lock-card-icon-placeholder {
            font-size: 28px;
          }

          .lock-card-name {
            font-size: 13px;
          }

          .lock-card-badge {
            width: 32px;
            height: 32px;
            top: 8px;
            right: 8px;
          }

          .lock-card-status {
            font-size: 11px;
            padding: 3px 8px;
          }
        }

        @media (max-width: 480px) {
          .lock-card {
            min-height: 100px;
            min-width: 80px;
            padding: 10px;
          }

          .lock-card-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 8px;
          }

          .lock-card-icon-placeholder {
            font-size: 24px;
          }

          .lock-card-name {
            font-size: 12px;
          }

          .lock-card-badge {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
}
