/**
 * PomodoroTimer Component Examples
 * 
 * This file demonstrates various usage scenarios for the PomodoroTimer component.
 */

import { useState } from 'react';
import PomodoroTimer from './PomodoroTimer';
import type { PomodoroSession } from '@/types';

// Example 1: Basic Pomodoro Session (25/5 minutes, 4 sessions)
export function BasicPomodoroExample() {
  const [session] = useState<PomodoroSession>({
    id: 'example-session-1',
    user_id: 'user-123',
    task_label: 'Write documentation',
    work_minutes: 25,
    break_minutes: 5,
    sessions_target: 4,
    sessions_done: 0,
    status: 'active',
    started_at: new Date().toISOString(),
    ended_at: null,
  });

  const handleComplete = () => {
    console.log('All 4 Pomodoro sessions completed! 🎉');
    alert('Congratulations! You completed all sessions!');
  };

  const handleAbandon = () => {
    console.log('Session abandoned');
    alert('Session abandoned. You can start a new one anytime.');
  };

  return (
    <div>
      <h2>Basic Pomodoro Session</h2>
      <p>Standard 25-minute work blocks with 5-minute breaks</p>
      <PomodoroTimer
        session={session}
        onComplete={handleComplete}
        onAbandon={handleAbandon}
      />
    </div>
  );
}

// Example 2: Custom Duration (50/10 minutes, 2 sessions)
export function CustomDurationExample() {
  const [session] = useState<PomodoroSession>({
    id: 'example-session-2',
    user_id: 'user-123',
    task_label: 'Deep work on complex feature',
    work_minutes: 50,
    break_minutes: 10,
    sessions_target: 2,
    sessions_done: 0,
    status: 'active',
    started_at: new Date().toISOString(),
    ended_at: null,
  });

  const handleComplete = () => {
    console.log('Custom duration session completed!');
  };

  return (
    <div>
      <h2>Custom Duration Session</h2>
      <p>Longer 50-minute work blocks with 10-minute breaks</p>
      <PomodoroTimer
        session={session}
        onComplete={handleComplete}
      />
    </div>
  );
}

// Example 3: Session in Progress (2 of 4 completed)
export function SessionInProgressExample() {
  const [session] = useState<PomodoroSession>({
    id: 'example-session-3',
    user_id: 'user-123',
    task_label: 'Code review',
    work_minutes: 25,
    break_minutes: 5,
    sessions_target: 4,
    sessions_done: 2, // Already completed 2 sessions
    status: 'active',
    started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Started 1 hour ago
    ended_at: null,
  });

  const handleComplete = () => {
    console.log('Session completed!');
  };

  return (
    <div>
      <h2>Session in Progress</h2>
      <p>Continuing from session 3 of 4</p>
      <PomodoroTimer
        session={session}
        onComplete={handleComplete}
      />
    </div>
  );
}

// Example 4: No Task Label
export function NoTaskLabelExample() {
  const [session] = useState<PomodoroSession>({
    id: 'example-session-4',
    user_id: 'user-123',
    task_label: null, // No task label
    work_minutes: 25,
    break_minutes: 5,
    sessions_target: 4,
    sessions_done: 0,
    status: 'active',
    started_at: new Date().toISOString(),
    ended_at: null,
  });

  const handleComplete = () => {
    console.log('Session completed!');
  };

  return (
    <div>
      <h2>Session Without Task Label</h2>
      <p>Pomodoro session without a specific task</p>
      <PomodoroTimer
        session={session}
        onComplete={handleComplete}
      />
    </div>
  );
}

// Example 5: Full Page Integration
export function FullPageExample() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pomodoro/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_label: 'Focus work',
          work_minutes: 25,
          break_minutes: 5,
          sessions_target: 4,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start Pomodoro session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    alert('🎉 Congratulations! You completed all Pomodoro sessions!');
    setSession(null);
  };

  const handleAbandon = () => {
    setSession(null);
  };

  if (!session) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1>Pomodoro Focus Timer</h1>
        <p>Start a Pomodoro session to boost your productivity</p>
        <button
          onClick={startSession}
          disabled={isLoading}
          style={{
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: 600,
            background: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Starting...' : '🍅 Start Pomodoro'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PomodoroTimer
        session={session}
        onComplete={handleComplete}
        onAbandon={handleAbandon}
      />
    </div>
  );
}

// Example 6: Multiple Sessions Comparison
export function MultipleSessionsExample() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', padding: '20px' }}>
      <div>
        <h3>Standard Session</h3>
        <BasicPomodoroExample />
      </div>
      <div>
        <h3>Custom Duration</h3>
        <CustomDurationExample />
      </div>
      <div>
        <h3>In Progress</h3>
        <SessionInProgressExample />
      </div>
    </div>
  );
}

// Example 7: With Custom Styling
export function CustomStyledExample() {
  const [session] = useState<PomodoroSession>({
    id: 'example-session-7',
    user_id: 'user-123',
    task_label: 'Design mockups',
    work_minutes: 25,
    break_minutes: 5,
    sessions_target: 4,
    sessions_done: 0,
    status: 'active',
    started_at: new Date().toISOString(),
    ended_at: null,
  });

  const handleComplete = () => {
    console.log('Session completed!');
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#333' }}>
          Focus Session
        </h2>
        <PomodoroTimer
          session={session}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}

// Export all examples
const PomodoroTimerExamples = {
  BasicPomodoroExample,
  CustomDurationExample,
  SessionInProgressExample,
  NoTaskLabelExample,
  FullPageExample,
  MultipleSessionsExample,
  CustomStyledExample,
};

export default PomodoroTimerExamples;
