/**
 * ChallengeClient Component Tests
 * 
 * Tests for the weekly challenge display component.
 * 
 * Requirements: 11.1-11.7
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChallengeClient from '../ChallengeClient';
import type { WeeklyChallenge } from '@/types/database';

// Mock active challenge
const mockActiveChallenge: WeeklyChallenge = {
  id: 'challenge-123',
  user_id: 'user-123',
  app_name: 'Instagram',
  daily_limit: 30,
  week_start: '2024-01-08',
  week_end: '2024-01-12',
  days_completed: 2,
  status: 'active',
  created_at: '2024-01-08T06:00:00Z',
};

// Mock completed challenge
const mockCompletedChallenge: WeeklyChallenge = {
  ...mockActiveChallenge,
  days_completed: 5,
  status: 'completed',
};

// Mock progress
const mockProgress = {
  days_completed: 2,
  days_remaining: 3,
  current_day_usage: 15,
  is_today_completed: true,
};

describe('ChallengeClient', () => {
  describe('Empty State', () => {
    it('should render empty state when no challenge exists', () => {
      render(
        <ChallengeClient
          challenge={null}
          progress={null}
        />
      );

      expect(screen.getByText('No Active Challenge')).toBeInTheDocument();
      expect(screen.getByText(/Challenges are generated every Monday/i)).toBeInTheDocument();
      expect(screen.getByText(/Check back on Monday/i)).toBeInTheDocument();
    });

    it('should display challenge emoji in empty state', () => {
      render(
        <ChallengeClient
          challenge={null}
          progress={null}
        />
      );

      expect(screen.getByText('🎯')).toBeInTheDocument();
    });
  });

  describe('Active Challenge Display', () => {
    it('should render challenge app name', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('should display daily limit goal', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText(/Daily Limit:/i)).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
    });

    it('should format daily limit in hours when >= 60 minutes', () => {
      const challengeWithHours = {
        ...mockActiveChallenge,
        daily_limit: 120,
      };

      render(
        <ChallengeClient
          challenge={challengeWithHours}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('should format daily limit with hours and minutes', () => {
      const challengeWithMixed = {
        ...mockActiveChallenge,
        daily_limit: 90,
      };

      render(
        <ChallengeClient
          challenge={challengeWithMixed}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    it('should display status badge for active challenge', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should display status badge for completed challenge', () => {
      render(
        <ChallengeClient
          challenge={mockCompletedChallenge}
          progress={{ ...mockProgress, days_completed: 5 }}
        />
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Day-Dot Row (Requirement 11.7)', () => {
    it('should render all 5 day labels (M T W T F)', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      // Get all elements with day labels
      const dayLabels = screen.getAllByText(/^[MTWF]$/);
      expect(dayLabels).toHaveLength(5);
      
      // Verify the sequence
      expect(dayLabels[0]).toHaveTextContent('M');
      expect(dayLabels[1]).toHaveTextContent('T');
      expect(dayLabels[2]).toHaveTextContent('W');
      expect(dayLabels[3]).toHaveTextContent('T');
      expect(dayLabels[4]).toHaveTextContent('F');
    });

    it('should show checkmarks for completed days', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      // Should have 2 checkmarks for 2 completed days
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks).toHaveLength(2);
    });

    it('should show all checkmarks when challenge is completed', () => {
      render(
        <ChallengeClient
          challenge={mockCompletedChallenge}
          progress={{ ...mockProgress, days_completed: 5 }}
        />
      );

      // Should have 5 checkmarks for all completed days
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks).toHaveLength(5);
    });
  });

  describe('Progress Display', () => {
    it('should display days completed counter', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('2 / 5')).toBeInTheDocument();
      expect(screen.getByText('Days Completed')).toBeInTheDocument();
    });

    it('should display today\'s usage for active challenge', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText(/Today's usage:/i)).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();
    });

    it('should show "On track" badge when today is completed', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('✓ On track')).toBeInTheDocument();
    });

    it('should not show "On track" badge when today is not completed', () => {
      const progressNotCompleted = {
        ...mockProgress,
        is_today_completed: false,
      };

      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={progressNotCompleted}
        />
      );

      expect(screen.queryByText('✓ On track')).not.toBeInTheDocument();
    });

    it('should display days remaining', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('3 days remaining')).toBeInTheDocument();
    });

    it('should use singular "day" when 1 day remaining', () => {
      const progressOneDay = {
        ...mockProgress,
        days_remaining: 1,
      };

      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={progressOneDay}
        />
      );

      expect(screen.getByText('1 day remaining')).toBeInTheDocument();
    });
  });

  describe('Completed Challenge', () => {
    it('should display completion message', () => {
      render(
        <ChallengeClient
          challenge={mockCompletedChallenge}
          progress={{ ...mockProgress, days_completed: 5 }}
        />
      );

      expect(screen.getByText(/Congratulations!/i)).toBeInTheDocument();
      expect(screen.getByText(/You've completed the challenge!/i)).toBeInTheDocument();
    });

    it('should display trophy emoji', () => {
      render(
        <ChallengeClient
          challenge={mockCompletedChallenge}
          progress={{ ...mockProgress, days_completed: 5 }}
        />
      );

      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('should not show today\'s usage for completed challenge', () => {
      render(
        <ChallengeClient
          challenge={mockCompletedChallenge}
          progress={{ ...mockProgress, days_completed: 5 }}
        />
      );

      expect(screen.queryByText(/Today's usage:/i)).not.toBeInTheDocument();
    });
  });

  describe('Challenge Period', () => {
    it('should display challenge date range', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={mockProgress}
        />
      );

      // Should display formatted dates
      expect(screen.getByText(/Jan 8/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 12/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle challenge with 0 days completed', () => {
      const progressZero = {
        ...mockProgress,
        days_completed: 0,
      };

      render(
        <ChallengeClient
          challenge={{ ...mockActiveChallenge, days_completed: 0 }}
          progress={progressZero}
        />
      );

      expect(screen.getByText('0 / 5')).toBeInTheDocument();
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });

    it('should handle missing progress data', () => {
      render(
        <ChallengeClient
          challenge={mockActiveChallenge}
          progress={null}
        />
      );

      // Should still render challenge info
      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('0 / 5')).toBeInTheDocument();
    });

    it('should handle failed challenge status', () => {
      const failedChallenge = {
        ...mockActiveChallenge,
        status: 'failed' as const,
      };

      render(
        <ChallengeClient
          challenge={failedChallenge}
          progress={mockProgress}
        />
      );

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
});
