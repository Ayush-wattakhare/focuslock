'use client';

/**
 * AppGrid Component
 * 
 * Displays all apps in a grid layout on the dashboard.
 * 
 * Features:
 * - Responsive grid layout
 * - Filters hidden apps based on lock rules (hide_from_home setting)
 * - Shows lock badge overlay on locked apps
 * - Handles loading and error states
 * - Integrates with lock evaluation system
 * 
 * Requirements: 2.7, 2.8
 * - 2.7: Lock rules can be marked as visible or hidden on dashboard
 * - 2.8: Hidden rules still enforce locks but don't show lock badge
 */

import { LockRule, LockStatus } from '@/types';
import { evaluateLock } from '@/lib/core/lockEvaluator';
import { useEffect, useState } from 'react';

interface AppGridProps {
  rules: LockRule[];
  usageData?: Map<string, number>; // app_name -> minutes used today
  userTimezone?: string;
  onAppClick?: (rule: LockRule, lockStatus: LockStatus) => void;
}

export interface AppWithStatus {
  rule: LockRule;
  lockStatus: LockStatus;
}

/**
 * Filters and evaluates lock status for apps
 * Exported for testing purposes
 */
export function prepareAppsForDisplay(
  rules: LockRule[],
  usageData: Map<string, number>,
  userTimezone: string
): AppWithStatus[] {
  return rules
    .filter(rule => !rule.hide_from_home) // Requirement 2.7: Filter hidden apps
    .map(rule => {
      const todayUsage = usageData.get(rule.app_name) || 0;
      const lockStatus = evaluateLock(rule, new Date(), todayUsage, userTimezone);
      return { rule, lockStatus };
    });
}

export default function AppGrid({ 
  rules, 
  usageData = new Map(), 
  userTimezone = 'Asia/Kolkata',
  onAppClick 
}: AppGridProps) {
  const [apps, setApps] = useState<AppWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const visibleApps = prepareAppsForDisplay(rules, usageData, userTimezone);
    setApps(visibleApps);
    setIsLoading(false);
  }, [rules, usageData, userTimezone]);

  const handleAppClick = (app: AppWithStatus) => {
    if (onAppClick) {
      onAppClick(app.rule, app.lockStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="app-grid-loading">
        <p>Loading apps...</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="app-grid-empty">
        <p>No apps to display. Create a lock rule to get started!</p>
      </div>
    );
  }

  return (
    <div className="app-grid">
      {apps.map(({ rule, lockStatus }) => (
        <div
          key={rule.id}
          className={`app-card ${lockStatus.isLocked ? 'locked' : 'unlocked'}`}
          onClick={() => handleAppClick({ rule, lockStatus })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAppClick({ rule, lockStatus });
            }
          }}
        >
          {/* App Icon */}
          <div className="app-icon">
            {rule.app_icon_url ? (
              <img src={rule.app_icon_url} alt={`${rule.app_name} icon`} />
            ) : (
              <div className="app-icon-placeholder">
                {rule.app_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* App Name */}
          <div className="app-name">{rule.app_name}</div>

          {/* Lock Badge Overlay - Requirement 2.8: Show lock badge on locked apps */}
          {lockStatus.isLocked && (
            <div className="lock-badge">
              <svg
                width="24"
                height="24"
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
            </div>
          )}

          {/* Lock Status Info */}
          {lockStatus.isLocked && lockStatus.reason && (
            <div className="lock-info">
              <span className="lock-reason">{lockStatus.reason}</span>
              {lockStatus.unlocksAt && (
                <span className="unlock-time">
                  Unlocks: {formatUnlockTime(lockStatus.unlocksAt)}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      <style jsx>{`
        .app-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 20px;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .app-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 15px;
            padding: 15px;
          }
        }

        @media (max-width: 480px) {
          .app-grid {
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
            padding: 10px;
          }
        }

        .app-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 140px;
        }

        .app-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #4a90e2;
        }

        .app-card:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .app-card.locked {
          border-color: #ff6b6b;
          background: #fff5f5;
        }

        .app-card.locked:hover {
          border-color: #ff4757;
        }

        .app-icon {
          width: 60px;
          height: 60px;
          margin-bottom: 10px;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .app-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .app-icon-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
        }

        .app-name {
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          color: #333;
          word-break: break-word;
          line-height: 1.3;
        }

        .lock-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          background: rgba(255, 107, 107, 0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
        }

        .lock-info {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          margin-bottom: 8px;
          z-index: 10;
          flex-direction: column;
          gap: 4px;
        }

        .app-card:hover .lock-info {
          display: flex;
        }

        .lock-info::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.9);
        }

        .lock-reason {
          font-weight: 500;
        }

        .unlock-time {
          font-size: 11px;
          opacity: 0.9;
        }

        .app-grid-loading,
        .app-grid-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: #666;
          font-size: 16px;
        }

        .app-grid-empty {
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}

/**
 * Formats unlock time for display
 * Exported for testing purposes
 */
export function formatUnlockTime(date: Date): string {
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
}
