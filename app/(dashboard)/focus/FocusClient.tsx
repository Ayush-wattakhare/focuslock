'use client';

/**
 * FocusClient Component
 * 
 * Pomodoro session management page with:
 * - Task label input
 * - Session configuration (work/break minutes, sessions target)
 * - Active session display with PomodoroTimer
 * - App locking during work blocks
 * 
 * Requirements: 8.1-8.7
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PomodoroTimer from '@/components/features/PomodoroTimer';
import type { PomodoroSession } from '@/types';
import type { User } from '@supabase/supabase-js';

interface FocusClientProps {
  user: User;
  initialSession: PomodoroSession | null;
}

export default function FocusClient({ initialSession }: FocusClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<PomodoroSession | null>(initialSession);
  const [isStarting, setIsStarting] = useState(false);
  
  // Form state for new session
  const [taskLabel, setTaskLabel] = useState('');
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [sessionsTarget, setSessionsTarget] = useState(4);

  // Start a new Pomodoro session
  const handleStartSession = async () => {
    if (isStarting) return;

    setIsStarting(true);

    try {
      const response = await fetch('/api/pomodoro/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_label: taskLabel.trim() || null,
          work_minutes: workMinutes,
          break_minutes: breakMinutes,
          sessions_target: sessionsTarget,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to start session:', errorData);
        alert('Failed to start Pomodoro session. Please try again.');
        setIsStarting(false);
        return;
      }

      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  // Handle session completion
  const handleComplete = () => {
    alert('🎉 Pomodoro session completed! Great work!');
    setSession(null);
    setTaskLabel('');
    router.refresh();
  };

  // Handle session abandonment
  const handleAbandon = () => {
    setSession(null);
    setTaskLabel('');
    router.refresh();
  };

  // If there's an active session, show the timer
  if (session) {
    return (
      <div className="focus-page">
        <div className="focus-container">
          <header className="focus-header">
            <h1 className="focus-title">🎯 Focus Session</h1>
            <p className="focus-subtitle">Stay focused and productive</p>
          </header>

          <PomodoroTimer
            session={session}
            onComplete={handleComplete}
            onAbandon={handleAbandon}
          />
        </div>

        <style jsx>{`
          .focus-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
          }

          .focus-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .focus-header {
            text-align: center;
            margin-bottom: 40px;
          }

          .focus-title {
            font-size: 32px;
            font-weight: 700;
            color: #343a40;
            margin: 0 0 8px 0;
          }

          .focus-subtitle {
            font-size: 16px;
            color: #868e96;
            margin: 0;
          }

          @media (max-width: 768px) {
            .focus-page {
              padding: 24px 16px;
            }

            .focus-container {
              padding: 32px 24px;
              border-radius: 20px;
            }

            .focus-title {
              font-size: 28px;
            }

            .focus-subtitle {
              font-size: 15px;
            }
          }

          @media (max-width: 480px) {
            .focus-page {
              padding: 20px 12px;
            }

            .focus-container {
              padding: 24px 16px;
              border-radius: 16px;
            }

            .focus-title {
              font-size: 24px;
            }

            .focus-subtitle {
              font-size: 14px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Show session setup form
  return (
    <div className="focus-page">
      <div className="focus-container">
        <header className="focus-header">
          <h1 className="focus-title">🎯 Start Focus Session</h1>
          <p className="focus-subtitle">
            Use the Pomodoro technique to stay focused and productive
          </p>
        </header>

        <form
          className="session-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleStartSession();
          }}
        >
          {/* Task Label Input */}
          <div className="form-group">
            <label htmlFor="task-label" className="form-label">
              What are you working on? <span className="optional">(optional)</span>
            </label>
            <input
              id="task-label"
              type="text"
              className="form-input"
              placeholder="e.g., Write documentation, Study for exam..."
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Session Configuration */}
          <div className="config-grid">
            <div className="form-group">
              <label htmlFor="work-minutes" className="form-label">
                Work Minutes
              </label>
              <input
                id="work-minutes"
                type="number"
                className="form-input"
                min="1"
                max="60"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(parseInt(e.target.value) || 25)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="break-minutes" className="form-label">
                Break Minutes
              </label>
              <input
                id="break-minutes"
                type="number"
                className="form-input"
                min="1"
                max="30"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="sessions-target" className="form-label">
                Sessions Target
              </label>
              <input
                id="sessions-target"
                type="number"
                className="form-input"
                min="1"
                max="10"
                value={sessionsTarget}
                onChange={(e) => setSessionsTarget(parseInt(e.target.value) || 4)}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="info-box">
            <p className="info-title">📱 During Focus Time:</p>
            <ul className="info-list">
              <li>All locked apps will remain locked</li>
              <li>Apps unlock temporarily during breaks</li>
              <li>You can pause or abandon the session anytime</li>
            </ul>
          </div>

          {/* Start Button */}
          <button
            type="submit"
            className="start-button"
            disabled={isStarting}
          >
            {isStarting ? '⏳ Starting...' : '🚀 Start Focus Session'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .focus-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }

        .focus-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .focus-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .focus-title {
          font-size: 32px;
          font-weight: 700;
          color: #343a40;
          margin: 0 0 8px 0;
        }

        .focus-subtitle {
          font-size: 16px;
          color: #868e96;
          margin: 0;
          line-height: 1.5;
        }

        .session-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #343a40;
        }

        .optional {
          font-weight: 400;
          color: #868e96;
          font-size: 13px;
        }

        .form-input {
          padding: 12px 16px;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .info-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid #667eea;
        }

        .info-title {
          font-size: 15px;
          font-weight: 600;
          color: #343a40;
          margin: 0 0 12px 0;
        }

        .info-list {
          margin: 0;
          padding-left: 20px;
          color: #495057;
          font-size: 14px;
          line-height: 1.8;
        }

        .info-list li {
          margin-bottom: 6px;
        }

        .info-list li:last-child {
          margin-bottom: 0;
        }

        .start-button {
          padding: 16px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .start-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .start-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .start-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .start-button:focus {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .focus-page {
            padding: 24px 16px;
          }

          .focus-container {
            padding: 32px 24px;
            border-radius: 20px;
          }

          .focus-title {
            font-size: 28px;
          }

          .focus-subtitle {
            font-size: 15px;
          }

          .config-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .start-button {
            font-size: 17px;
            padding: 15px 28px;
          }
        }

        @media (max-width: 480px) {
          .focus-page {
            padding: 20px 12px;
          }

          .focus-container {
            padding: 24px 16px;
            border-radius: 16px;
          }

          .focus-title {
            font-size: 24px;
          }

          .focus-subtitle {
            font-size: 14px;
          }

          .session-form {
            gap: 20px;
          }

          .form-input {
            padding: 11px 14px;
            font-size: 14px;
          }

          .info-box {
            padding: 16px;
          }

          .info-title {
            font-size: 14px;
          }

          .info-list {
            font-size: 13px;
          }

          .start-button {
            font-size: 16px;
            padding: 14px 24px;
          }
        }
      `}</style>
    </div>
  );
}
