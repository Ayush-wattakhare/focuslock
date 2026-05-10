/**
 * PomodoroTimer Component Tests
 * 
 * Unit tests for the PomodoroTimer component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PomodoroTimer from '../PomodoroTimer';
import type { PomodoroSession } from '@/types';

// Mock fetch
global.fetch = jest.fn();

describe('PomodoroTimer', () => {
  const mockSession: PomodoroSession = {
    id: 'test-session-1',
    user_id: 'user-123',
    task_label: 'Test Task',
    work_minutes: 25,
    break_minutes: 5,
    sessions_target: 4,
    sessions_done: 0,
    status: 'active',
    started_at: new Date().toISOString(),
    ended_at: null,
  };

  const mockOnComplete = jest.fn();
  const mockOnAbandon = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the component with session data', () => {
    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
        onAbandon={mockOnAbandon}
      />
    );

    // Check task label is displayed
    expect(screen.getByText('Test Task')).toBeInTheDocument();

    // Check session counter is displayed
    expect(screen.getByText(/Session 1 of 4/i)).toBeInTheDocument();

    // Check controls are present
    expect(screen.getByLabelText(/Pause timer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Abandon session/i)).toBeInTheDocument();
  });

  it('displays correct initial time', () => {
    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
      />
    );

    // Should show 25:00 for 25 minute work block
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('shows work block status message', () => {
    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Apps are locked/i)).toBeInTheDocument();
    expect(screen.getByText(/during focus time/i)).toBeInTheDocument();
  });

  it('renders without task label', () => {
    const sessionWithoutLabel = { ...mockSession, task_label: null };
    
    render(
      <PomodoroTimer
        session={sessionWithoutLabel}
        onComplete={mockOnComplete}
      />
    );

    // Task label section should not be rendered
    expect(screen.queryByText('🎯')).not.toBeInTheDocument();
  });

  it('displays correct session counter for in-progress session', () => {
    const inProgressSession = { ...mockSession, sessions_done: 2 };
    
    render(
      <PomodoroTimer
        session={inProgressSession}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Session 3 of 4/i)).toBeInTheDocument();
  });

  it('handles pause button click', () => {
    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
      />
    );

    const pauseButton = screen.getByLabelText(/Pause timer/i);
    fireEvent.click(pauseButton);

    // Button text should change to Resume
    expect(screen.getByLabelText(/Resume timer/i)).toBeInTheDocument();
    
    // Pause indicator should be visible
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('handles abandon button click with confirmation', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session: mockSession }),
    });

    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
        onAbandon={mockOnAbandon}
      />
    );

    const abandonButton = screen.getByLabelText(/Abandon session/i);
    fireEvent.click(abandonButton);

    // Confirm dialog should be shown
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to abandon this Pomodoro session?'
    );

    // API should be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pomodoro/end',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            session_id: 'test-session-1',
            status: 'abandoned',
          }),
        })
      );
    });

    // onAbandon callback should be called
    await waitFor(() => {
      expect(mockOnAbandon).toHaveBeenCalled();
    });
  });

  it('does not abandon when user cancels confirmation', () => {
    window.confirm = jest.fn(() => false);

    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
        onAbandon={mockOnAbandon}
      />
    );

    const abandonButton = screen.getByLabelText(/Abandon session/i);
    fireEvent.click(abandonButton);

    // API should not be called
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockOnAbandon).not.toHaveBeenCalled();
  });

  it('renders progress dots correctly', () => {
    const inProgressSession = { ...mockSession, sessions_done: 2 };
    
    render(
      <PomodoroTimer
        session={inProgressSession}
        onComplete={mockOnComplete}
      />
    );

    const dots = screen.getAllByRole('generic').filter(
      el => el.className.includes('counter-dot')
    );

    // Should have 4 dots total
    expect(dots).toHaveLength(4);
  });

  it('displays correct color for work block', () => {
    const { container } = render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
      />
    );

    // Check for work block indicator
    expect(screen.getByText(/🔒 Focus Time/i)).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    render(
      <PomodoroTimer
        session={mockSession}
        onComplete={mockOnComplete}
      />
    );

    // Initial time should be 25:00
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });
});
