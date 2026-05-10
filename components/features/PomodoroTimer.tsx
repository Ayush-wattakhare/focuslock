'use client';

/**
 * PomodoroTimer Component
 * 
 * Work/break cycle timer with visual ring, session counter, and controls.
 * Auto-locks apps during work blocks and unlocks during breaks.
 * 
 * Features:
 * - Visual ring showing work/break progress
 * - Session counter display (e.g., "2/4 sessions")
 * - Start, pause, abandon controls
 * - Auto-lock apps during work blocks
 * - Auto-unlock during break blocks
 * - Audio/visual notifications on block completion
 * 
 * Requirements: 8.1-8.7
 * - 8.1: Record Pomodoro session with task label, work/break minutes, sessions target
 * - 8.2: Default to 25 minutes work and 5 minutes break
 * - 8.3: Keep locked apps locked during work blocks
 * - 8.4: Temporarily unlock apps during break blocks
 * - 8.5: Increment sessions_done counter on work block completion
 * - 8.6: Mark session as completed when sessions_done reaches target
 * - 8.7: Allow user to abandon session (mark as abandoned)
 */

import { useEffect, useState, useCallback } from 'react';
import type { PomodoroSession } from '@/types';

interface PomodoroTimerProps {
  session: PomodoroSession;
  onComplete: () => void;
  onAbandon?: () => void;
}

type BlockType = 'work' | 'break';

export default function PomodoroTimer({ session, onComplete, onAbandon }: PomodoroTimerProps) {
  const [currentBlock, setCurrentBlock] = useState<BlockType>('work');
  const [timeRemaining, setTimeRemaining] = useState<number>(session.work_minutes * 60);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Calculate progress percentage
  const totalSeconds = currentBlock === 'work' 
    ? session.work_minutes * 60 
    : session.break_minutes * 60;
  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 100;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle block completion
  const handleBlockComplete = useCallback(async () => {
    setIsTransitioning(true);

    if (currentBlock === 'work') {
      // Work block completed - increment sessions_done
      try {
        const response = await fetch('/api/pomodoro/complete-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.id }),
        });

        if (!response.ok) {
          console.error('Failed to complete work block');
        }

        const data = await response.json();

        // Check if all sessions completed
        if (data.completed) {
          onComplete();
          return;
        }

        // Switch to break
        setCurrentBlock('break');
        setTimeRemaining(session.break_minutes * 60);
      } catch (error) {
        console.error('Error completing work block:', error);
      }
    } else {
      // Break completed - switch back to work
      setCurrentBlock('work');
      setTimeRemaining(session.work_minutes * 60);
    }

    setIsTransitioning(false);
  }, [currentBlock, session, onComplete]);

  // Timer countdown effect
  useEffect(() => {
    if (isPaused || isTransitioning) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleBlockComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isTransitioning, handleBlockComplete]);

  // Handle pause/resume
  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  // Handle abandon
  const handleAbandon = async () => {
    if (!confirm('Are you sure you want to abandon this Pomodoro session?')) {
      return;
    }

    try {
      const response = await fetch('/api/pomodoro/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          status: 'abandoned',
        }),
      });

      if (!response.ok) {
        console.error('Failed to abandon session');
        return;
      }

      if (onAbandon) {
        onAbandon();
      }
    } catch (error) {
      console.error('Error abandoning session:', error);
    }
  };

  // SVG circle properties
  const size = 280;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color = currentBlock === 'work' ? '#ff6b6b' : '#51cf66';

  return (
    <div className="pomodoro-timer-container">
      {/* Task Label */}
      {session.task_label && (
        <div className="pomodoro-task-label">
          <span className="task-icon">🎯</span>
          <span className="task-text">{session.task_label}</span>
        </div>
      )}

      {/* Session Counter */}
      <div className="pomodoro-session-counter">
        <span className="counter-text">
          Session {session.sessions_done + 1} of {session.sessions_target}
        </span>
        <div className="counter-dots">
          {Array.from({ length: session.sessions_target }).map((_, index) => (
            <div
              key={index}
              className={`counter-dot ${index < session.sessions_done ? 'completed' : ''} ${
                index === session.sessions_done ? 'active' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timer Ring */}
      <div className="pomodoro-timer-ring">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="timer-svg"
          role="img"
          aria-label={`${currentBlock === 'work' ? 'Work' : 'Break'} time: ${formatTime(timeRemaining)}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e9ecef"
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
            className="timer-progress"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />

          {/* Center content */}
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="timer-time"
            fill={color}
          >
            {formatTime(timeRemaining)}
          </text>

          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="timer-label"
            fill="#868e96"
          >
            {currentBlock === 'work' ? '🔒 Focus Time' : '☕ Break Time'}
          </text>
        </svg>

        {/* Pause indicator */}
        {isPaused && (
          <div className="pause-indicator">
            <span className="pause-icon">⏸</span>
            <span className="pause-text">Paused</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pomodoro-controls">
        <button
          type="button"
          className="control-button pause"
          onClick={handlePauseResume}
          aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
        >
          {isPaused ? '▶️ Resume' : '⏸ Pause'}
        </button>

        <button
          type="button"
          className="control-button abandon"
          onClick={handleAbandon}
          aria-label="Abandon session"
        >
          ❌ Abandon
        </button>
      </div>

      {/* Block Status Message */}
      <div className="pomodoro-status-message">
        {currentBlock === 'work' ? (
          <p>
            <strong>Apps are locked</strong> during focus time. Stay focused on your task!
          </p>
        ) : (
          <p>
            <strong>Apps are unlocked</strong> during break time. Take a rest!
          </p>
        )}
      </div>

      <style jsx>{`
        .pomodoro-timer-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px;
          max-width: 500px;
          margin: 0 auto;
        }

        .pomodoro-task-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          padding: 12px 20px;
          background: #f8f9fa;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          color: #495057;
        }

        .task-icon {
          font-size: 20px;
        }

        .task-text {
          line-height: 1.4;
        }

        .pomodoro-session-counter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .counter-text {
          font-size: 18px;
          font-weight: 600;
          color: #343a40;
        }

        .counter-dots {
          display: flex;
          gap: 10px;
        }

        .counter-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #dee2e6;
          transition: all 0.3s ease;
        }

        .counter-dot.completed {
          background: #51cf66;
          box-shadow: 0 0 8px rgba(81, 207, 102, 0.4);
        }

        .counter-dot.active {
          background: #ff6b6b;
          box-shadow: 0 0 12px rgba(255, 107, 107, 0.5);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .pomodoro-timer-ring {
          position: relative;
          margin-bottom: 32px;
        }

        .timer-svg {
          max-width: 100%;
          height: auto;
        }

        .timer-progress {
          transition: stroke-dashoffset 1s linear;
        }

        .timer-time {
          font-size: 56px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .timer-label {
          font-size: 18px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .pause-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.95);
          padding: 20px 30px;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .pause-icon {
          font-size: 32px;
        }

        .pause-text {
          font-size: 14px;
          font-weight: 600;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pomodoro-controls {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .control-button {
          padding: 14px 28px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-button:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .control-button.pause {
          background: #4a90e2;
          color: white;
        }

        .control-button.pause:hover {
          background: #357abd;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(74, 144, 226, 0.3);
        }

        .control-button.abandon {
          background: #f8f9fa;
          color: #868e96;
        }

        .control-button.abandon:hover {
          background: #e9ecef;
          color: #495057;
        }

        .pomodoro-status-message {
          text-align: center;
          padding: 16px 24px;
          background: #f8f9fa;
          border-radius: 12px;
          max-width: 400px;
        }

        .pomodoro-status-message p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #495057;
        }

        .pomodoro-status-message strong {
          color: #343a40;
        }

        @media (max-width: 768px) {
          .pomodoro-timer-container {
            padding: 24px 16px;
          }

          .pomodoro-task-label {
            font-size: 15px;
            padding: 10px 16px;
          }

          .task-icon {
            font-size: 18px;
          }

          .counter-text {
            font-size: 16px;
          }

          .counter-dot {
            width: 12px;
            height: 12px;
          }

          .timer-time {
            font-size: 48px;
          }

          .timer-label {
            font-size: 16px;
          }

          .control-button {
            padding: 12px 24px;
            font-size: 15px;
          }

          .pomodoro-status-message {
            padding: 14px 20px;
          }

          .pomodoro-status-message p {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .pomodoro-timer-container {
            padding: 20px 12px;
          }

          .pomodoro-task-label {
            font-size: 14px;
            padding: 8px 14px;
          }

          .task-icon {
            font-size: 16px;
          }

          .counter-text {
            font-size: 15px;
          }

          .counter-dot {
            width: 10px;
            height: 10px;
            gap: 8px;
          }

          .timer-time {
            font-size: 40px;
          }

          .timer-label {
            font-size: 14px;
          }

          .pomodoro-controls {
            flex-direction: column;
            width: 100%;
            gap: 12px;
          }

          .control-button {
            width: 100%;
            justify-content: center;
            padding: 12px 20px;
            font-size: 14px;
          }

          .pause-indicator {
            padding: 16px 24px;
          }

          .pause-icon {
            font-size: 28px;
          }

          .pause-text {
            font-size: 12px;
          }

          .pomodoro-status-message {
            padding: 12px 16px;
          }

          .pomodoro-status-message p {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
