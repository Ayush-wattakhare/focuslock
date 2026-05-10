'use client';

/**
 * Challenge Client Component
 * 
 * Displays active weekly challenge progress with day-dot indicators.
 * 
 * Features:
 * - Display challenge app name and daily limit goal
 * - Show day-dot row (M T W T F) with completion status
 * - Display current progress (days completed / 5)
 * - Show challenge status (active, completed, failed)
 * - Handle case when no active challenge exists
 * 
 * Requirements: 11.1-11.7
 */

import React from 'react';
import type { WeeklyChallenge } from '@/types/database';

interface ChallengeProgress {
  days_completed: number;
  days_remaining: number;
  current_day_usage?: number;
  is_today_completed: boolean;
}

interface ChallengeClientProps {
  challenge: WeeklyChallenge | null;
  progress: ChallengeProgress | null;
}

export default function ChallengeClient({
  challenge,
  progress,
}: ChallengeClientProps) {
  // Day labels for Monday through Friday
  const dayLabels = ['M', 'T', 'W', 'T', 'F'];

  // Calculate which days are completed
  const getDayStatus = (dayIndex: number): 'completed' | 'pending' | 'current' => {
    if (!challenge || !progress) return 'pending';
    
    // Simple logic: first N days are completed based on days_completed
    if (dayIndex < progress.days_completed) {
      return 'completed';
    }
    
    // Current day logic (simplified)
    if (dayIndex === progress.days_completed && challenge.status === 'active') {
      return 'current';
    }
    
    return 'pending';
  };

  // Format daily limit for display
  const formatDailyLimit = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // No active challenge state
  if (!challenge) {
    return (
      <div className="challenge-page">
        <header className="challenge-header">
          <h1 className="challenge-title">Weekly Challenge</h1>
          <p className="challenge-subtitle">
            Complete 5 days of focused app usage
          </p>
        </header>

        <div className="challenge-empty">
          <div className="empty-icon">🎯</div>
          <h2>No Active Challenge</h2>
          <p>
            Challenges are generated every Monday at 6:00 AM based on your
            previous week&apos;s app usage patterns.
          </p>
          <p className="empty-hint">
            Check back on Monday to see your new challenge!
          </p>
        </div>

        <style jsx>{`
          .challenge-page {
            min-height: 100vh;
            padding: 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .challenge-header {
            text-align: center;
            margin-bottom: 32px;
            color: white;
          }

          .challenge-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .challenge-subtitle {
            font-size: 16px;
            opacity: 0.9;
          }

          .challenge-empty {
            max-width: 500px;
            margin: 0 auto;
            padding: 48px 32px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
          }

          .empty-icon {
            font-size: 64px;
            margin-bottom: 24px;
          }

          .challenge-empty h2 {
            font-size: 24px;
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
          }

          .challenge-empty p {
            font-size: 16px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 12px;
          }

          .empty-hint {
            font-weight: 500;
            color: #667eea;
          }

          @media (max-width: 768px) {
            .challenge-page {
              padding: 20px;
            }

            .challenge-title {
              font-size: 28px;
            }

            .challenge-subtitle {
              font-size: 14px;
            }

            .challenge-empty {
              padding: 40px 24px;
            }

            .empty-icon {
              font-size: 56px;
            }

            .challenge-empty h2 {
              font-size: 22px;
            }

            .challenge-empty p {
              font-size: 15px;
            }
          }

          @media (max-width: 480px) {
            .challenge-page {
              padding: 16px;
            }

            .challenge-title {
              font-size: 24px;
            }

            .challenge-subtitle {
              font-size: 13px;
            }

            .challenge-empty {
              padding: 32px 20px;
            }

            .empty-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }

            .challenge-empty h2 {
              font-size: 20px;
            }

            .challenge-empty p {
              font-size: 14px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Active challenge display
  const statusColor = {
    active: '#667eea',
    completed: '#10b981',
    failed: '#ef4444',
  }[challenge.status];

  const statusLabel = {
    active: 'In Progress',
    completed: 'Completed',
    failed: 'Failed',
  }[challenge.status];

  return (
    <div className="challenge-page">
      <header className="challenge-header">
        <h1 className="challenge-title">Weekly Challenge</h1>
        <p className="challenge-subtitle">
          Complete 5 days of focused app usage
        </p>
      </header>

      <div className="challenge-card">
        {/* Status Badge */}
        <div className="challenge-status" style={{ backgroundColor: statusColor }}>
          {statusLabel}
        </div>

        {/* Challenge Info */}
        <div className="challenge-info">
          <h2 className="challenge-app-name">{challenge.app_name}</h2>
          <p className="challenge-goal">
            Daily Limit: <strong>{formatDailyLimit(challenge.daily_limit)}</strong>
          </p>
        </div>

        {/* Day Dots Row - Requirement 11.7 */}
        <div className="challenge-days">
          <h3 className="days-title">Progress</h3>
          <div className="day-dots">
            {dayLabels.map((label, index) => {
              const status = getDayStatus(index);
              return (
                <div key={index} className={`day-dot ${status}`}>
                  <div className="day-label">{label}</div>
                  <div className="day-indicator">
                    {status === 'completed' && (
                      <span className="checkmark">✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="challenge-progress">
          <div className="progress-text">
            <span className="progress-count">
              {progress?.days_completed || 0} / 5
            </span>
            <span className="progress-label">Days Completed</span>
          </div>
          
          {challenge.status === 'active' && progress && (
            <div className="progress-details">
              {progress.current_day_usage !== undefined && (
                <p className="today-usage">
                  Today&apos;s usage: <strong>{formatDailyLimit(progress.current_day_usage)}</strong>
                  {progress.is_today_completed && (
                    <span className="success-badge">✓ On track</span>
                  )}
                </p>
              )}
              {progress.days_remaining > 0 && (
                <p className="days-remaining">
                  {progress.days_remaining} {progress.days_remaining === 1 ? 'day' : 'days'} remaining
                </p>
              )}
            </div>
          )}

          {challenge.status === 'completed' && (
            <div className="completion-message">
              <span className="trophy">🏆</span>
              <p>Congratulations! You&apos;ve completed the challenge!</p>
            </div>
          )}
        </div>

        {/* Challenge Period */}
        <div className="challenge-period">
          <p>
            {new Date(challenge.week_start).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {new Date(challenge.week_end).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <style jsx>{`
        .challenge-page {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .challenge-header {
          text-align: center;
          margin-bottom: 32px;
          color: white;
        }

        .challenge-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .challenge-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }

        .challenge-card {
          max-width: 600px;
          margin: 0 auto;
          padding: 32px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          position: relative;
        }

        .challenge-status {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 6px 16px;
          border-radius: 20px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .challenge-info {
          margin-bottom: 32px;
        }

        .challenge-app-name {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin-bottom: 12px;
        }

        .challenge-goal {
          font-size: 18px;
          color: #666;
        }

        .challenge-goal strong {
          color: #667eea;
          font-weight: 600;
        }

        .challenge-days {
          margin-bottom: 32px;
        }

        .days-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 16px;
        }

        .day-dots {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .day-dot {
          flex: 1;
          text-align: center;
        }

        .day-label {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
        }

        .day-indicator {
          width: 48px;
          height: 48px;
          margin: 0 auto;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #e0e0e0;
          background: white;
          transition: all 0.3s ease;
        }

        .day-dot.completed .day-indicator {
          background: #10b981;
          border-color: #10b981;
        }

        .day-dot.current .day-indicator {
          border-color: #667eea;
          border-width: 4px;
          animation: pulse 2s infinite;
        }

        .checkmark {
          color: white;
          font-size: 24px;
          font-weight: bold;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        .challenge-progress {
          padding: 24px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .progress-text {
          text-align: center;
          margin-bottom: 16px;
        }

        .progress-count {
          display: block;
          font-size: 36px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 4px;
        }

        .progress-label {
          display: block;
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .progress-details {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .today-usage {
          font-size: 16px;
          color: #333;
          margin-bottom: 8px;
        }

        .today-usage strong {
          color: #667eea;
        }

        .success-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 8px;
          background: #10b981;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .days-remaining {
          font-size: 14px;
          color: #666;
        }

        .completion-message {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .trophy {
          display: block;
          font-size: 48px;
          margin-bottom: 12px;
        }

        .completion-message p {
          font-size: 16px;
          color: #10b981;
          font-weight: 600;
        }

        .challenge-period {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .challenge-period p {
          font-size: 14px;
          color: #999;
        }

        @media (max-width: 768px) {
          .challenge-page {
            padding: 20px;
          }

          .challenge-title {
            font-size: 28px;
          }

          .challenge-subtitle {
            font-size: 14px;
          }

          .challenge-card {
            padding: 24px;
          }

          .challenge-status {
            top: 16px;
            right: 16px;
            font-size: 12px;
            padding: 4px 12px;
          }

          .challenge-app-name {
            font-size: 24px;
          }

          .challenge-goal {
            font-size: 16px;
          }

          .day-indicator {
            width: 40px;
            height: 40px;
          }

          .checkmark {
            font-size: 20px;
          }

          .progress-count {
            font-size: 32px;
          }
        }

        @media (max-width: 480px) {
          .challenge-page {
            padding: 16px;
          }

          .challenge-title {
            font-size: 24px;
          }

          .challenge-subtitle {
            font-size: 13px;
          }

          .challenge-card {
            padding: 20px;
          }

          .challenge-status {
            position: static;
            display: inline-block;
            margin-bottom: 16px;
          }

          .challenge-app-name {
            font-size: 22px;
          }

          .challenge-goal {
            font-size: 15px;
          }

          .day-dots {
            gap: 8px;
          }

          .day-label {
            font-size: 12px;
          }

          .day-indicator {
            width: 36px;
            height: 36px;
          }

          .checkmark {
            font-size: 18px;
          }

          .progress-count {
            font-size: 28px;
          }

          .progress-label {
            font-size: 12px;
          }

          .today-usage {
            font-size: 14px;
          }

          .trophy {
            font-size: 40px;
          }
        }
      `}</style>
    </div>
  );
}
