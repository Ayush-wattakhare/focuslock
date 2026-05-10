/**
 * BadgesClient Component Tests
 * 
 * Tests the badges page client component functionality
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BadgesClient from '../BadgesClient';
import type { User } from '@supabase/supabase-js';
import type { Streak, BadgeDefinition, UserBadge } from '@/types/database';

// Mock the components
jest.mock('@/components/features/StreakDots', () => {
  return function MockStreakDots({ currentStreak, longestStreak }: any) {
    return (
      <div data-testid="streak-dots">
        Current: {currentStreak}, Longest: {longestStreak}
      </div>
    );
  };
});

jest.mock('@/components/features/BadgeCard', () => {
  return function MockBadgeCard({ badge, earned, earnedAt }: any) {
    return (
      <div data-testid={`badge-${badge.id}`}>
        {badge.name} - {earned ? 'Earned' : 'Locked'}
        {earnedAt && ` on ${earnedAt.toISOString()}`}
      </div>
    );
  };
});

describe('BadgesClient', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockStreak: Streak = {
    user_id: 'user-123',
    current_streak: 5,
    longest_streak: 10,
    last_active_date: '2024-01-15',
    updated_at: '2024-01-15T12:00:00Z',
  };

  const mockBadgeDefinitions: BadgeDefinition[] = [
    {
      id: 'quick_start',
      name: 'Quick Starter',
      description: 'Complete setup within 10 minutes',
      icon: '⚡',
      condition: 'Setup completed in <10 min',
    },
    {
      id: 'first_week',
      name: 'First Week Clean',
      description: 'Maintain 7-day streak',
      icon: '🌱',
      condition: '7-day streak',
    },
    {
      id: 'seven_day_warrior',
      name: 'Seven Day Warrior',
      description: 'No overrides for 7 days',
      icon: '⚔️',
      condition: 'No overrides for 7 days',
    },
  ];

  const mockUserBadges: UserBadge[] = [
    {
      id: 'ub-1',
      user_id: 'user-123',
      badge_id: 'quick_start',
      earned_at: '2024-01-10T10:00:00Z',
    },
  ];

  it('renders page header', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={mockUserBadges}
      />
    );

    expect(screen.getByText('Your Badges')).toBeInTheDocument();
    expect(screen.getByText('Track your progress and unlock achievements')).toBeInTheDocument();
  });

  it('renders StreakDots component with correct props', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={mockUserBadges}
      />
    );

    const streakDots = screen.getByTestId('streak-dots');
    expect(streakDots).toHaveTextContent('Current: 5, Longest: 10');
  });

  it('displays earned badges section with correct count', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={mockUserBadges}
      />
    );

    expect(screen.getByText('Earned Badges (1)')).toBeInTheDocument();
    expect(screen.getByTestId('badge-quick_start')).toHaveTextContent('Quick Starter - Earned');
  });

  it('displays locked badges section with correct count', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={mockUserBadges}
      />
    );

    expect(screen.getByText('Locked Badges (2)')).toBeInTheDocument();
    expect(screen.getByTestId('badge-first_week')).toHaveTextContent('First Week Clean - Locked');
    expect(screen.getByTestId('badge-seven_day_warrior')).toHaveTextContent('Seven Day Warrior - Locked');
  });

  it('handles null streak data gracefully', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={null}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={mockUserBadges}
      />
    );

    const streakDots = screen.getByTestId('streak-dots');
    expect(streakDots).toHaveTextContent('Current: 0, Longest: 0');
  });

  it('displays empty state when no badges are available', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={[]}
        userBadges={[]}
      />
    );

    expect(screen.getByText('No badges available yet. Check back soon!')).toBeInTheDocument();
  });

  it('displays all badges as locked when user has no earned badges', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={[]}
      />
    );

    expect(screen.queryByText(/Earned Badges/)).not.toBeInTheDocument();
    expect(screen.getByText('Locked Badges (3)')).toBeInTheDocument();
  });

  it('displays all badges as earned when user has earned all badges', () => {
    const allEarnedBadges: UserBadge[] = mockBadgeDefinitions.map((badge, index) => ({
      id: `ub-${index}`,
      user_id: 'user-123',
      badge_id: badge.id,
      earned_at: '2024-01-10T10:00:00Z',
    }));

    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={allEarnedBadges}
      />
    );

    expect(screen.getByText('Earned Badges (3)')).toBeInTheDocument();
    expect(screen.queryByText(/Locked Badges/)).not.toBeInTheDocument();
  });

  it('passes earned date to BadgeCard for earned badges', () => {
    render(
      <BadgesClient
        user={mockUser}
        streak={mockStreak}
        badgeDefinitions={mockBadgeDefinitions}
        userBadges={mockUserBadges}
      />
    );

    const earnedBadge = screen.getByTestId('badge-quick_start');
    expect(earnedBadge).toHaveTextContent('2024-01-10T10:00:00.000Z');
  });
});
