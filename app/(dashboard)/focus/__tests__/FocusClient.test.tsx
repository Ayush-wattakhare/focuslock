/**
 * FocusClient Component Tests
 * 
 * Tests for the Pomodoro focus session management page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import FocusClient from '../FocusClient';
import type { PomodoroSession } from '@/types';
import type { User } from '@supabase/supabase-js';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock PomodoroTimer component
jest.mock('@/components/features/PomodoroTimer', () => {
  return function MockPomodoroTimer({ session, onComplete, onAbandon }: any) {
    return (
      <div data-testid="pomodoro-timer">
        <div>Task: {session.task_label}</div>
        <div>Work: {session.work_minutes} min</div>
        <div>Break: {session.break_minutes} min</div>
        <div>Sessions: {session.sessions_done}/{session.sessions_target}</div>
        <button onClick={onComplete}>Complete</button>
        <button onClick={onAbandon}>Abandon</button>
      </div>
    );
  };
});

describe('FocusClient', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
  } as User;

  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  describe('Session Setup Form', () => {
    it('renders setup form when no active session', () => {
      render(<FocusClient user={mockUser} initialSession={null} />);

      expect(screen.getByText(/Start Focus Session/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/What are you working on/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Work Minutes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Break Minutes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sessions Target/i)).toBeInTheDocument();
    });

    it('has default values for work/break/sessions', () => {
      render(<FocusClient user={mockUser} initialSession={null} />);

      const workInput = screen.getByLabelText(/Work Minutes/i) as HTMLInputElement;
      const breakInput = screen.getByLabelText(/Break Minutes/i) as HTMLInputElement;
      const sessionsInput = screen.getByLabelText(/Sessions Target/i) as HTMLInputElement;

      expect(workInput.value).toBe('25');
      expect(breakInput.value).toBe('5');
      expect(sessionsInput.value).toBe('4');
    });

    it('allows user to enter task label', () => {
      render(<FocusClient user={mockUser} initialSession={null} />);

      const taskInput = screen.getByLabelText(/What are you working on/i) as HTMLInputElement;
      fireEvent.change(taskInput, { target: { value: 'Write tests' } });

      expect(taskInput.value).toBe('Write tests');
    });

    it('allows user to change work/break/sessions values', () => {
      render(<FocusClient user={mockUser} initialSession={null} />);

      const workInput = screen.getByLabelText(/Work Minutes/i) as HTMLInputElement;
      const breakInput = screen.getByLabelText(/Break Minutes/i) as HTMLInputElement;
      const sessionsInput = screen.getByLabelText(/Sessions Target/i) as HTMLInputElement;

      fireEvent.change(workInput, { target: { value: '30' } });
      fireEvent.change(breakInput, { target: { value: '10' } });
      fireEvent.change(sessionsInput, { target: { value: '6' } });

      expect(workInput.value).toBe('30');
      expect(breakInput.value).toBe('10');
      expect(sessionsInput.value).toBe('6');
    });

    it('starts session with custom values', async () => {
      const mockSession: PomodoroSession = {
        id: 'session-123',
        user_id: 'user-123',
        task_label: 'Write tests',
        work_minutes: 30,
        break_minutes: 10,
        sessions_target: 6,
        sessions_done: 0,
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      });

      render(<FocusClient user={mockUser} initialSession={null} />);

      const taskInput = screen.getByLabelText(/What are you working on/i);
      const workInput = screen.getByLabelText(/Work Minutes/i);
      const breakInput = screen.getByLabelText(/Break Minutes/i);
      const sessionsInput = screen.getByLabelText(/Sessions Target/i);
      const startButton = screen.getByRole('button', { name: /Start Focus Session/i });

      fireEvent.change(taskInput, { target: { value: 'Write tests' } });
      fireEvent.change(workInput, { target: { value: '30' } });
      fireEvent.change(breakInput, { target: { value: '10' } });
      fireEvent.change(sessionsInput, { target: { value: '6' } });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/pomodoro/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_label: 'Write tests',
            work_minutes: 30,
            break_minutes: 10,
            sessions_target: 6,
          }),
        });
      });

      // Should show timer after starting
      await waitFor(() => {
        expect(screen.getByTestId('pomodoro-timer')).toBeInTheDocument();
      });
    });

    it('starts session with default values when fields are empty', async () => {
      const mockSession: PomodoroSession = {
        id: 'session-123',
        user_id: 'user-123',
        task_label: null,
        work_minutes: 25,
        break_minutes: 5,
        sessions_target: 4,
        sessions_done: 0,
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      });

      render(<FocusClient user={mockUser} initialSession={null} />);

      const startButton = screen.getByRole('button', { name: /Start Focus Session/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/pomodoro/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_label: null,
            work_minutes: 25,
            break_minutes: 5,
            sessions_target: 4,
          }),
        });
      });
    });

    it('shows error alert when session start fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to start session' }),
      });

      render(<FocusClient user={mockUser} initialSession={null} />);

      const startButton = screen.getByRole('button', { name: /Start Focus Session/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to start Pomodoro session. Please try again.');
      });
    });
  });

  describe('Active Session Display', () => {
    const mockActiveSession: PomodoroSession = {
      id: 'session-123',
      user_id: 'user-123',
      task_label: 'Write documentation',
      work_minutes: 25,
      break_minutes: 5,
      sessions_target: 4,
      sessions_done: 1,
      status: 'active',
      started_at: new Date().toISOString(),
      ended_at: null,
    };

    it('renders PomodoroTimer when session is active', () => {
      render(<FocusClient user={mockUser} initialSession={mockActiveSession} />);

      expect(screen.getByTestId('pomodoro-timer')).toBeInTheDocument();
      expect(screen.getByText(/Task: Write documentation/i)).toBeInTheDocument();
      expect(screen.getByText(/Work: 25 min/i)).toBeInTheDocument();
      expect(screen.getByText(/Break: 5 min/i)).toBeInTheDocument();
      expect(screen.getByText(/Sessions: 1\/4/i)).toBeInTheDocument();
    });

    it('shows success alert and refreshes on session completion', async () => {
      render(<FocusClient user={mockUser} initialSession={mockActiveSession} />);

      const completeButton = screen.getByRole('button', { name: /Complete/i });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('🎉 Pomodoro session completed! Great work!');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });

      // Should show setup form after completion
      await waitFor(() => {
        expect(screen.getByText(/Start Focus Session/i)).toBeInTheDocument();
      });
    });

    it('refreshes page on session abandonment', async () => {
      render(<FocusClient user={mockUser} initialSession={mockActiveSession} />);

      const abandonButton = screen.getByRole('button', { name: /Abandon/i });
      fireEvent.click(abandonButton);

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
      });

      // Should show setup form after abandonment
      await waitFor(() => {
        expect(screen.getByText(/Start Focus Session/i)).toBeInTheDocument();
      });
    });
  });
});
