'use client';

/**
 * StreakDots Component
 * 
 * Visual representation of daily streak showing the last 7 days.
 * 
 * Features:
 * - Shows last 7 days with filled/empty dots
 * - Displays current and longest streak numbers
 * - Accessible keyboard navigation
 * - Responsive design
 * 
 * Requirements: 6.1-6.7
 * - 6.1: Initialize streak record with current streak 0, longest streak 0
 * - 6.2: Increment current streak by 1 for compliant days
 * - 6.3: Update longest streak when current exceeds it
 * - 6.4: Reset current streak to 0 on override
 * - 6.5: Update last active date when streak is incremented
 * - 6.6: Daily cron job to check and update streaks
 * - 6.7: Row-level security for streak data
 */

interface StreakDotsProps {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakDots({ currentStreak, longestStreak }: StreakDotsProps) {
  // Generate array of 7 days (last 7 days)
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = 6 - i; // Reverse order (oldest to newest)
    return {
      index: dayIndex,
      isFilled: dayIndex < currentStreak, // Fill if within current streak
    };
  }).reverse(); // Display newest on right

  return (
    <div
      className="streak-dots"
      role="region"
      aria-label={`Streak tracker: ${currentStreak} day current streak, ${longestStreak} day longest streak`}
    >
      {/* Streak Numbers */}
      <div className="streak-stats">
        <div className="streak-stat">
          <div className="streak-stat-value">{currentStreak}</div>
          <div className="streak-stat-label">Current Streak</div>
        </div>
        <div className="streak-stat">
          <div className="streak-stat-value">{longestStreak}</div>
          <div className="streak-stat-label">Longest Streak</div>
        </div>
      </div>

      {/* Visual Dots for Last 7 Days */}
      <div className="streak-dots-container">
        <div className="streak-dots-label">Last 7 Days</div>
        <div className="streak-dots-row" role="list" aria-label="Last 7 days streak visualization">
          {days.map((day, index) => (
            <div
              key={index}
              className={`streak-dot ${day.isFilled ? 'filled' : 'empty'}`}
              role="listitem"
              aria-label={`Day ${index + 1}: ${day.isFilled ? 'Compliant' : 'Not compliant'}`}
            >
              <div className="streak-dot-inner" />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .streak-dots {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .streak-stats {
          display: flex;
          justify-content: space-around;
          gap: 16px;
        }

        .streak-stat {
          flex: 1;
          text-align: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .streak-stat-value {
          font-size: 36px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 8px;
        }

        .streak-stat-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .streak-dots-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .streak-dots-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
        }

        .streak-dots-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .streak-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          cursor: default;
        }

        .streak-dot.filled {
          background: rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .streak-dot.empty {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .streak-dot-inner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .streak-dot.filled .streak-dot-inner {
          background: #ffffff;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }

        .streak-dot.empty .streak-dot-inner {
          background: transparent;
        }

        .streak-dot:hover {
          transform: scale(1.1);
        }

        .streak-dot.filled:hover .streak-dot-inner {
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
        }

        @media (max-width: 768px) {
          .streak-dots {
            padding: 20px;
            gap: 20px;
          }

          .streak-stat-value {
            font-size: 32px;
          }

          .streak-stat-label {
            font-size: 12px;
          }

          .streak-dots-label {
            font-size: 12px;
          }

          .streak-dot {
            width: 28px;
            height: 28px;
          }

          .streak-dot-inner {
            width: 14px;
            height: 14px;
          }

          .streak-dots-row {
            gap: 10px;
            padding: 10px;
          }
        }

        @media (max-width: 480px) {
          .streak-dots {
            padding: 16px;
            gap: 16px;
          }

          .streak-stats {
            gap: 12px;
          }

          .streak-stat {
            padding: 12px;
          }

          .streak-stat-value {
            font-size: 28px;
            margin-bottom: 6px;
          }

          .streak-stat-label {
            font-size: 11px;
          }

          .streak-dots-label {
            font-size: 11px;
          }

          .streak-dot {
            width: 24px;
            height: 24px;
          }

          .streak-dot-inner {
            width: 12px;
            height: 12px;
          }

          .streak-dots-row {
            gap: 8px;
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}
