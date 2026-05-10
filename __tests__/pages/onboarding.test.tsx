/**
 * Onboarding Client Component Tests
 * 
 * Tests the 3-step onboarding wizard functionality
 * Requirements: 20.1-20.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardingClient from '@/app/(dashboard)/onboarding/OnboardingClient';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock RuleBuilder component
jest.mock('@/components/features/RuleBuilder', () => {
  return function MockRuleBuilder({ onSave, onCancel }: any) {
    return (
      <div data-testid="rule-builder">
        <button onClick={() => onSave({ app_name: 'Instagram', lock_type: 'timer', daily_limit_minutes: 30 })}>
          Save Rule
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('OnboardingClient', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockProfile: Profile = {
    id: 'user-123',
    full_name: 'Test User',
    avatar_url: null,
    timezone: 'Asia/Kolkata',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ rule: { id: 'rule-123' } }),
    });
  });

  describe('Requirement 20.1: Display 3-step wizard', () => {
    it('should render step 1 by default', () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      expect(screen.getByText('Create Your First Lock Rule')).toBeInTheDocument();
      expect(screen.getByTestId('rule-builder')).toBeInTheDocument();
    });

    it('should display progress indicator with 3 steps', () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      expect(screen.getByText('Add Rule')).toBeInTheDocument();
      expect(screen.getByText('Learn Override')).toBeInTheDocument();
      expect(screen.getByText('Gamification')).toBeInTheDocument();
    });
  });

  describe('Requirement 20.2: Guide user to add first lock rule', () => {
    it('should render RuleBuilder in step 1', () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      expect(screen.getByTestId('rule-builder')).toBeInTheDocument();
    });

    it('should call POST /api/rules when rule is saved', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            app_name: 'Instagram',
            lock_type: 'timer',
            daily_limit_minutes: 30,
          }),
        });
      });
    });

    it('should move to step 2 after successful rule creation', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Understanding Overrides')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 20.3: Explain mood prompt and override system', () => {
    it('should display override explanation in step 2', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      // Move to step 2
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Understanding Overrides')).toBeInTheDocument();
        expect(screen.getByText('Countdown Screen')).toBeInTheDocument();
        expect(screen.getByText('Mood Prompt')).toBeInTheDocument();
        expect(screen.getByText('Optional Reason')).toBeInTheDocument();
        expect(screen.getByText('Streak Impact')).toBeInTheDocument();
      });
    });

    it('should allow navigation forward to step 3', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      // Move to step 2
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Understanding Overrides')).toBeInTheDocument();
      });

      // Click next button
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(screen.getByText('Streaks & Badges')).toBeInTheDocument();
    });
  });

  describe('Requirement 20.4: Introduce streak and badge system', () => {
    it('should display gamification explanation in step 3', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      // Move to step 2
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Understanding Overrides')).toBeInTheDocument();
      });

      // Move to step 3
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(screen.getByText('Streaks & Badges')).toBeInTheDocument();
      expect(screen.getByText('Build Streaks')).toBeInTheDocument();
      expect(screen.getByText('Earn Badges')).toBeInTheDocument();
      expect(screen.getByText('Quick Start Badge')).toBeInTheDocument();
      expect(screen.getByText('Buddy System')).toBeInTheDocument();
    });
  });

  describe('Requirement 20.5: Award quick_start badge', () => {
    it('should call POST /api/badges/check when completing onboarding', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      // Move to step 2
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Understanding Overrides')).toBeInTheDocument();
      });

      // Move to step 3
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Complete onboarding
      const getStartedButton = screen.getByText('Get Started');
      fireEvent.click(getStartedButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/badges/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: 'onboarding_complete',
            context: {},
          }),
        });
      });
    });

    it('should redirect to dashboard after badge check', async () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      // Move to step 2
      const saveButton = screen.getByText('Save Rule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Understanding Overrides')).toBeInTheDocument();
      });

      // Move to step 3
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Complete onboarding
      const getStartedButton = screen.getByText('Get Started');
      fireEvent.click(getStartedButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Requirement 20.6: Allow skip functionality', () => {
    it('should display skip button in header', () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('should redirect to dashboard when skip is clicked', () => {
      render(<OnboardingClient user={mockUser} profile={mockProfile} />);
      
      const skipButton = screen.getByText('Skip');
      fireEvent.click(skipButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });
});
