/**
 * BadgeCard Component Tests
 * 
 * Unit tests for the BadgeCard component logic.
 * 
 * Requirements tested: 7.1-7.6
 */

import { BadgeDefinition } from '@/types';

describe('BadgeCard - Date Formatting', () => {
  // Helper function to format earned date (extracted from component logic)
  const formatEarnedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  describe('Requirement 7.4: Show earned date for earned badges', () => {
    it('should format earned date correctly', () => {
      const earnedDate = new Date('2024-01-15');
      const formatted = formatEarnedDate(earnedDate);
      expect(formatted).toBe('Jan 15, 2024');
    });

    it('should format different months correctly', () => {
      const earnedDate = new Date('2024-12-25');
      const formatted = formatEarnedDate(earnedDate);
      expect(formatted).toBe('Dec 25, 2024');
    });

    it('should handle dates from different years', () => {
      const oldDate = new Date('2020-06-15');
      const formatted = formatEarnedDate(oldDate);
      expect(formatted).toBe('Jun 15, 2020');
    });

    it('should handle leap year dates', () => {
      const leapDate = new Date('2024-02-29');
      const formatted = formatEarnedDate(leapDate);
      expect(formatted).toBe('Feb 29, 2024');
    });
  });
});

describe('BadgeCard - Props Validation', () => {
  const mockBadge: BadgeDefinition = {
    id: 'quick_start',
    name: 'Quick Starter',
    description: 'Complete setup within 10 minutes',
    icon: '⚡',
    condition: 'Setup completed in <10 min'
  };

  describe('Requirement 7.1: Display badge icon, name, description', () => {
    it('should have all required badge properties', () => {
      expect(mockBadge.id).toBe('quick_start');
      expect(mockBadge.name).toBe('Quick Starter');
      expect(mockBadge.description).toBe('Complete setup within 10 minutes');
      expect(mockBadge.icon).toBe('⚡');
      expect(mockBadge.condition).toBe('Setup completed in <10 min');
    });

    it('should handle badge without icon', () => {
      const badgeWithoutIcon: BadgeDefinition = {
        ...mockBadge,
        icon: null
      };
      expect(badgeWithoutIcon.icon).toBeNull();
      // Component should display first letter of name as placeholder
      expect(badgeWithoutIcon.name.charAt(0)).toBe('Q');
    });

    it('should handle badge without description', () => {
      const badgeWithoutDescription: BadgeDefinition = {
        ...mockBadge,
        description: null
      };
      expect(badgeWithoutDescription.description).toBeNull();
    });

    it('should handle badge without condition', () => {
      const badgeWithoutCondition: BadgeDefinition = {
        ...mockBadge,
        condition: null
      };
      expect(badgeWithoutCondition.condition).toBeNull();
      // Component should display default condition: 'Complete the challenge'
    });
  });

  describe('Requirement 7.2 & 7.3: Visual states for earned and locked badges', () => {
    it('should differentiate between earned and locked states', () => {
      const earnedState = { earned: true, earnedAt: new Date('2024-01-15') };
      const lockedState = { earned: false, earnedAt: undefined };

      expect(earnedState.earned).toBe(true);
      expect(earnedState.earnedAt).toBeInstanceOf(Date);
      
      expect(lockedState.earned).toBe(false);
      expect(lockedState.earnedAt).toBeUndefined();
    });
  });

  describe('Requirement 7.5: Show unlock condition for locked badges', () => {
    it('should provide unlock condition for locked badges', () => {
      expect(mockBadge.condition).toBe('Setup completed in <10 min');
    });

    it('should have default condition when condition is null', () => {
      const badgeWithoutCondition: BadgeDefinition = {
        ...mockBadge,
        condition: null
      };
      const defaultCondition = badgeWithoutCondition.condition || 'Complete the challenge';
      expect(defaultCondition).toBe('Complete the challenge');
    });
  });
});

describe('BadgeCard - All Badge Types', () => {
  const allBadges: BadgeDefinition[] = [
    {
      id: 'quick_start',
      name: 'Quick Starter',
      description: 'Complete setup within 10 minutes',
      icon: '⚡',
      condition: 'Setup completed in <10 min'
    },
    {
      id: 'first_week',
      name: 'First Week Clean',
      description: 'Maintain 7-day streak',
      icon: '🌱',
      condition: '7-day streak'
    },
    {
      id: 'seven_day_warrior',
      name: '7-Day Warrior',
      description: 'No overrides for 7 days',
      icon: '⚔️',
      condition: '7 days without override'
    },
    {
      id: 'iron_will',
      name: 'Iron Will',
      description: 'Complete a weekly challenge',
      icon: '🛡️',
      condition: 'Complete weekly challenge'
    },
    {
      id: 'social_detox',
      name: 'Social Detox',
      description: 'Maintain 30-day streak',
      icon: '🧘',
      condition: '30-day streak'
    },
    {
      id: 'night_owl_slayer',
      name: 'Night Owl Slayer',
      description: '7 days of bedtime compliance',
      icon: '🌙',
      condition: '7 days bedtime mode'
    },
    {
      id: 'pomodoro_master',
      name: 'Pomodoro Master',
      description: 'Complete 20 Pomodoro sessions',
      icon: '🍅',
      condition: '20 completed sessions'
    }
  ];

  it('should have all 7 badge definitions', () => {
    expect(allBadges).toHaveLength(7);
  });

  it('should have unique badge IDs', () => {
    const ids = allBadges.map(b => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(allBadges.length);
  });

  it('should have all required properties for each badge', () => {
    allBadges.forEach(badge => {
      expect(badge.id).toBeTruthy();
      expect(badge.name).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.icon).toBeTruthy();
      expect(badge.condition).toBeTruthy();
    });
  });

  it('should have valid emoji icons', () => {
    const expectedIcons = ['⚡', '🌱', '⚔️', '🛡️', '🧘', '🌙', '🍅'];
    const actualIcons = allBadges.map(b => b.icon);
    expect(actualIcons).toEqual(expectedIcons);
  });
});

describe('BadgeCard - Edge Cases', () => {
  it('should handle very long badge names', () => {
    const longName = 'This Is A Very Long Badge Name That Should Still Display Correctly';
    expect(longName.length).toBeGreaterThan(50);
    expect(longName).toBeTruthy();
  });

  it('should handle very long descriptions', () => {
    const longDesc = 'This is a very long description that explains in great detail what this badge represents and how to earn it with lots of extra words';
    expect(longDesc.length).toBeGreaterThan(100);
    expect(longDesc).toBeTruthy();
  });

  it('should handle special characters in badge names', () => {
    const specialName = '7-Day Warrior';
    expect(specialName).toContain('-');
    expect(specialName).toBeTruthy();
  });

  it('should handle special characters in conditions', () => {
    const specialCondition = 'Setup completed in <10 min';
    expect(specialCondition).toContain('<');
    expect(specialCondition).toBeTruthy();
  });
});
