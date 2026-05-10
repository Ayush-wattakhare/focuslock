'use client';

/**
 * BadgeCard Component
 * 
 * Displays a badge with icon, name, and description.
 * 
 * Features:
 * - Visual states: earned (color), locked (grayscale)
 * - Shows earned date or unlock condition
 * - Accessible keyboard navigation
 * - Responsive design
 * 
 * Requirements: 7.1-7.6
 * - 7.1: Display badge icon, name, description
 * - 7.2: Visual state for earned badges (color)
 * - 7.3: Visual state for locked badges (grayscale)
 * - 7.4: Show earned date for earned badges
 * - 7.5: Show unlock condition for locked badges
 * - 7.6: Accessible and responsive design
 */

import { BadgeDefinition } from '@/types';

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: Date;
}

export default function BadgeCard({ badge, earned, earnedAt }: BadgeCardProps) {
  // Format earned date for display
  const formatEarnedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      className={`badge-card ${earned ? 'earned' : 'locked'}`}
      role="article"
      aria-label={`${badge.name} badge - ${earned ? 'Earned' : 'Locked'}`}
    >
      {/* Badge Icon - Requirement 7.1 */}
      <div className="badge-card-icon">
        {badge.icon ? (
          <span className="badge-icon-emoji" aria-hidden="true">
            {badge.icon}
          </span>
        ) : (
          <div className="badge-icon-placeholder">
            {badge.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Badge Name - Requirement 7.1 */}
      <div className="badge-card-name">{badge.name}</div>

      {/* Badge Description - Requirement 7.1 */}
      {badge.description && (
        <div className="badge-card-description">{badge.description}</div>
      )}

      {/* Earned Date or Unlock Condition - Requirements 7.4, 7.5 */}
      <div className="badge-card-footer">
        {earned && earnedAt ? (
          // Requirement 7.4: Show earned date
          <span className="badge-card-earned-date">
            Earned {formatEarnedDate(earnedAt)}
          </span>
        ) : (
          // Requirement 7.5: Show unlock condition
          <span className="badge-card-condition">
            {badge.condition || 'Complete the challenge'}
          </span>
        )}
      </div>

      {/* Earned Badge Indicator */}
      {earned && (
        <div className="badge-card-earned-indicator" aria-label="Badge earned">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <style jsx>{`
        .badge-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          border-radius: 16px;
          min-height: 200px;
          transition: all 0.2s ease;
        }

        .badge-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Requirement 7.2: Earned badge visual state (color) */
        .badge-card.earned {
          border-color: #4caf50;
          background: linear-gradient(135deg, #ffffff 0%, #f1f8f4 100%);
        }

        .badge-card.earned:hover {
          border-color: #388e3c;
        }

        /* Requirement 7.3: Locked badge visual state (grayscale) */
        .badge-card.locked {
          border-color: #e0e0e0;
          background: #f5f5f5;
          filter: grayscale(100%);
          opacity: 0.7;
        }

        .badge-card.locked:hover {
          opacity: 0.85;
        }

        .badge-card-icon {
          width: 80px;
          height: 80px;
          margin-bottom: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .badge-card.earned .badge-card-icon {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        }

        .badge-card.locked .badge-card-icon {
          background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
        }

        .badge-icon-emoji {
          font-size: 48px;
          line-height: 1;
        }

        .badge-icon-placeholder {
          width: 100%;
          height: 100%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          font-weight: bold;
        }

        .badge-card-name {
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          color: #333;
          margin-bottom: 8px;
          line-height: 1.3;
        }

        .badge-card.locked .badge-card-name {
          color: #757575;
        }

        .badge-card-description {
          font-size: 14px;
          text-align: center;
          color: #666;
          line-height: 1.5;
          margin-bottom: 12px;
          max-width: 100%;
        }

        .badge-card.locked .badge-card-description {
          color: #9e9e9e;
        }

        .badge-card-footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
          width: 100%;
        }

        .badge-card-earned-date {
          display: block;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: #4caf50;
        }

        .badge-card-condition {
          display: block;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: #9e9e9e;
          font-style: italic;
        }

        .badge-card-earned-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
        }

        @media (max-width: 768px) {
          .badge-card {
            min-height: 180px;
            padding: 16px;
          }

          .badge-card-icon {
            width: 70px;
            height: 70px;
            margin-bottom: 14px;
          }

          .badge-icon-emoji {
            font-size: 42px;
          }

          .badge-icon-placeholder {
            font-size: 36px;
          }

          .badge-card-name {
            font-size: 16px;
          }

          .badge-card-description {
            font-size: 13px;
          }

          .badge-card-earned-indicator {
            width: 28px;
            height: 28px;
            top: 10px;
            right: 10px;
          }
        }

        @media (max-width: 480px) {
          .badge-card {
            min-height: 160px;
            padding: 14px;
          }

          .badge-card-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 12px;
          }

          .badge-icon-emoji {
            font-size: 36px;
          }

          .badge-icon-placeholder {
            font-size: 32px;
          }

          .badge-card-name {
            font-size: 15px;
          }

          .badge-card-description {
            font-size: 12px;
          }

          .badge-card-earned-date,
          .badge-card-condition {
            font-size: 11px;
          }

          .badge-card-earned-indicator {
            width: 26px;
            height: 26px;
          }
        }
      `}</style>
    </div>
  );
}
