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
          gap: 16px;
          padding: 0;
        }

        @media (max-width: 768px) {
          .app-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .app-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
        }

        .app-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 140px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .app-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
          border-color: rgba(102, 126, 234, 0.5);
        }

        .app-card:focus {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }

        .app-card.locked {
          border-color: rgba(255, 107, 107, 0.4);
          background: linear-gradient(135deg, rgba(255, 245, 245, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%);
        }

        .app-card.locked:hover {
          border-color: rgba(255, 107, 107, 0.6);
          box-shadow: 0 8px 25px rgba(255, 107, 107, 0.15);
        }

        .app-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 12px;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .app-card:hover .app-icon {
          transform: scale(1.05);
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
          font-size: 32px;
          font-weight: bold;
        }

        .app-name {
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          color: #333;
          word-break: break-word;
          line-height: 1.3;
        }

        .lock-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .lock-info {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.92);
          backdrop-filter: blur(10px);
          color: white;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          white-space: nowrap;
          margin-bottom: 10px;
          z-index: 10;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
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
          border-top-color: rgba(0, 0, 0, 0.92);
        }

        .lock-reason {
          font-weight: 600;
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
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px 20px;
        }

        .app-grid-empty {
          flex-direction: column;
          gap: 12px;
        }

        @media (max-width: 480px) {
          .app-icon {
            width: 56px;
            height: 56px;
            border-radius: 14px;
          }

          .app-icon-placeholder {
            font-size: 28px;
          }

          .app-name {
            font-size: 13px;
          }

          .lock-badge {
            width: 32px;
            height: 32px;
            top: 8px;
            right: 8px;
          }

          .lock-badge svg {
            width: 18px;
            height: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .app-card,
          .app-icon,
          .lock-badge {
            transition: none;
            animation: none;
          }

          .app-card:hover {
            transform: none;
          }

          .app-card:hover .app-icon {
            transform: none;
          }
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
