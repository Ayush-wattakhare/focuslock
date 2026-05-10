'use client';

/**
 * CountdownRing Component
 * 
 * SVG-based circular progress indicator showing time remaining until unlock.
 * 
 * Features:
 * - Circular progress ring that animates countdown
 * - Displays time remaining in human-readable format
 * - Smooth CSS transitions for progress updates
 * - Different visual styles based on lock type
 * - Responsive sizing
 * 
 * Requirements: 3.1-3.8
 * - 3.1: Display countdown visually
 * - 3.2: Show time remaining in readable format
 * - 3.3: Animate smoothly using CSS transitions
 * - 3.4: Different colors for different lock types
 * - 3.5: Update in real-time
 * - 3.6: Handle nuclear mode (no countdown)
 * - 3.7: Accessible with ARIA labels
 * - 3.8: Responsive design
 */

import { useEffect, useState } from 'react';

interface CountdownRingProps {
  unlocksAt: Date;
  lockType: 'timer' | 'schedule' | 'until_date' | 'nuclear';
}

export default function CountdownRing({ unlocksAt, lockType }: CountdownRingProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Update countdown every second
    const updateCountdown = () => {
      const now = new Date();
      const diffMs = unlocksAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('Unlocked');
        setProgress(100);
        return;
      }

      // Calculate time components
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      // Format time remaining
      if (diffDays > 0) {
        setTimeRemaining(`${diffDays}d ${diffHours % 24}h`);
      } else if (diffHours > 0) {
        setTimeRemaining(`${diffHours}h ${diffMins % 60}m`);
      } else if (diffMins > 0) {
        setTimeRemaining(`${diffMins}m ${diffSeconds % 60}s`);
      } else {
        setTimeRemaining(`${diffSeconds}s`);
      }

      // Calculate progress (0-100)
      // For timer locks: assume 24-hour cycle
      // For schedule locks: calculate based on schedule window
      // For until_date locks: calculate based on total days
      const totalMs = calculateTotalDuration(lockType, unlocksAt);
      const elapsedMs = totalMs - diffMs;
      const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
      setProgress(progressPercent);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [unlocksAt, lockType]);

  // Get color based on lock type
  const getColor = () => {
    switch (lockType) {
      case 'timer':
        return '#ffa726'; // Orange
      case 'schedule':
        return '#66bb6a'; // Green
      case 'until_date':
        return '#42a5f5'; // Blue
      case 'nuclear':
        return '#ef5350'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  };

  // SVG circle properties
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color = getColor();

  return (
    <div className="countdown-ring-container">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="countdown-ring-svg"
        role="img"
        aria-label={`Time remaining: ${timeRemaining}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="countdown-ring-progress"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />

        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="countdown-ring-text"
          fill={color}
        >
          {timeRemaining}
        </text>
      </svg>

      <style jsx>{`
        .countdown-ring-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .countdown-ring-svg {
          max-width: 100%;
          height: auto;
        }

        .countdown-ring-progress {
          transition: stroke-dashoffset 0.5s ease;
        }

        .countdown-ring-text {
          font-size: 28px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        @media (max-width: 768px) {
          .countdown-ring-container {
            padding: 15px;
          }

          .countdown-ring-text {
            font-size: 24px;
          }
        }

        @media (max-width: 480px) {
          .countdown-ring-container {
            padding: 10px;
          }

          .countdown-ring-text {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Calculate total duration for progress calculation
 * Exported for testing purposes
 */
export function calculateTotalDuration(lockType: string, unlocksAt: Date): number {
  const now = new Date();

  switch (lockType) {
    case 'timer':
      // Timer locks reset at midnight, so total duration is from start of day to unlock
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return unlocksAt.getTime() - startOfDay.getTime();

    case 'schedule':
      // Schedule locks have a fixed window, estimate 8 hours
      return 8 * 60 * 60 * 1000;

    case 'until_date':
      // Until date locks: calculate from now to unlock date
      return unlocksAt.getTime() - now.getTime();

    case 'nuclear':
      // Nuclear locks don't have a defined end, use arbitrary large value
      return 365 * 24 * 60 * 60 * 1000; // 1 year

    default:
      return 24 * 60 * 60 * 1000; // Default to 24 hours
  }
}
