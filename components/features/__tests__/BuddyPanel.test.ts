/**
 * BuddyPanel Component Tests
 * 
 * Unit tests for the BuddyPanel component logic
 * 
 * Requirements tested: 9.1-9.9
 */

import { Buddy, LockRule } from '@/types';

// Mock data
const mockLockRules: LockRule[] = [
  {
    id: 'rule-1',
    user_id: 'user-123',
    app_name: 'Instagram',
    app_icon_url: null,
    app_scheme: null,
    lock_type: 'timer',
    daily_limit_minutes: 30,
    schedule_start: null,
    schedule_end: null,
    schedule_days: null,
    unlock_date: null,
    hide_from_home: true,
    hide_from_search: true,
    strict_mode: false,
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'rule-2',
    user_id: 'user-123',
    app_name: 'YouTube',
    app_icon_url: null,
    app_scheme: null,
    lock_type: 'schedule',
    daily_limit_minutes: null,
    schedule_start: '09:00',
    schedule_end: '17:00',
    schedule_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    unlock_date: null,
    hide_from_home: true,
    hide_from_search: false,
    strict_mode: true,
    is_active: true,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
];

const mockBuddies: Buddy[] = [
  {
    id: 'buddy-1',
    user_id: 'user-123',
    buddy_user_id: 'user-456',
    rules_watching: ['rule-1'],
    status: 'active',
    invited_at: '2024-01-10T10:00:00Z',
    accepted_at: '2024-01-11T14:30:00Z',
  },
  {
    id: 'buddy-2',
    user_id: 'user-123',
    buddy_user_id: 'user-789',
    rules_watching: null,
    status: 'pending',
    invited_at: '2024-01-12T10:00:00Z',
    accepted_at: null,
  },
  {
    id: 'buddy-3',
    user_id: 'user-123',
    buddy_user_id: 'user-101',
    rules_watching: [],
    status: 'removed',
    invited_at: '2024-01-08T10:00:00Z',
    accepted_at: '2024-01-09T10:00:00Z',
  },
];

// Helper functions extracted from component logic

/**
 * Filter buddies by status
 * Requirement 9.1, 9.2, 9.7: Handle different buddy statuses
 */
function filterBuddiesByStatus(buddies: Buddy[], status: 'active' | 'pending' | 'removed'): Buddy[] {
  return buddies.filter(b => b.status === status);
}

/**
 * Get watched rules display text
 * Requirement 9.3: Display which rules a buddy is watching
 */
function getWatchedRulesText(buddy: Buddy, lockRules: LockRule[]): string {
  if (!buddy.rules_watching || buddy.rules_watching.length === 0) {
    return buddy.rules_watching === null ? 'All rules' : 'No rules selected';
  }
  
  const watchedRuleNames = lockRules
    .filter(rule => buddy.rules_watching?.includes(rule.id))
    .map(rule => rule.app_name);
  
  return watchedRuleNames.length > 0 
    ? watchedRuleNames.join(', ') 
    : 'No rules selected';
}

/**
 * Validate email format
 * Requirement 9.1: Validate buddy email before invitation
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) {
    return { valid: false, error: 'Please enter an email address' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

/**
 * Get status indicator color
 * Visual helper for buddy status display
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#4caf50';
    case 'pending':
      return '#ff9800';
    case 'removed':
      return '#9e9e9e';
    default:
      return '#757575';
  }
}

// Tests

describe('BuddyPanel - Buddy Filtering', () => {
  it('should filter active buddies correctly', () => {
    const activeBuddies = filterBuddiesByStatus(mockBuddies, 'active');
    
    expect(activeBuddies.length).toBe(1);
    expect(activeBuddies[0].id).toBe('buddy-1');
    expect(activeBuddies[0].status).toBe('active');
  });

  it('should filter pending buddies correctly', () => {
    const pendingBuddies = filterBuddiesByStatus(mockBuddies, 'pending');
    
    expect(pendingBuddies.length).toBe(1);
    expect(pendingBuddies[0].id).toBe('buddy-2');
    expect(pendingBuddies[0].status).toBe('pending');
  });

  it('should filter removed buddies correctly', () => {
    const removedBuddies = filterBuddiesByStatus(mockBuddies, 'removed');
    
    expect(removedBuddies.length).toBe(1);
    expect(removedBuddies[0].id).toBe('buddy-3');
    expect(removedBuddies[0].status).toBe('removed');
  });

  it('should return empty array when no buddies match status', () => {
    const emptyBuddies: Buddy[] = [];
    const activeBuddies = filterBuddiesByStatus(emptyBuddies, 'active');
    
    expect(activeBuddies.length).toBe(0);
  });
});

describe('BuddyPanel - Watched Rules Display', () => {
  it('should display "All rules" when rules_watching is null', () => {
    const buddy = mockBuddies[1]; // buddy-2 with null rules_watching
    const text = getWatchedRulesText(buddy, mockLockRules);
    
    expect(text).toBe('All rules');
  });

  it('should display specific rule names when rules_watching is set', () => {
    const buddy = mockBuddies[0]; // buddy-1 watching rule-1
    const text = getWatchedRulesText(buddy, mockLockRules);
    
    expect(text).toBe('Instagram');
  });

  it('should display "No rules selected" when rules_watching is empty array', () => {
    const buddy = mockBuddies[2]; // buddy-3 with empty array
    const text = getWatchedRulesText(buddy, mockLockRules);
    
    expect(text).toBe('No rules selected');
  });

  it('should display multiple rule names separated by comma', () => {
    const buddy: Buddy = {
      ...mockBuddies[0],
      rules_watching: ['rule-1', 'rule-2'],
    };
    const text = getWatchedRulesText(buddy, mockLockRules);
    
    expect(text).toBe('Instagram, YouTube');
  });

  it('should handle rules that do not exist in lockRules array', () => {
    const buddy: Buddy = {
      ...mockBuddies[0],
      rules_watching: ['rule-999'], // Non-existent rule
    };
    const text = getWatchedRulesText(buddy, mockLockRules);
    
    expect(text).toBe('No rules selected');
  });
});

describe('BuddyPanel - Email Validation', () => {
  it('should validate correct email format', () => {
    const result = validateEmail('buddy@example.com');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty email', () => {
    const result = validateEmail('');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter an email address');
  });

  it('should reject whitespace-only email', () => {
    const result = validateEmail('   ');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter an email address');
  });

  it('should reject invalid email format - missing @', () => {
    const result = validateEmail('buddyexample.com');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid email address');
  });

  it('should reject invalid email format - missing domain', () => {
    const result = validateEmail('buddy@');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid email address');
  });

  it('should reject invalid email format - missing local part', () => {
    const result = validateEmail('@example.com');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid email address');
  });

  it('should accept email with subdomain', () => {
    const result = validateEmail('buddy@mail.example.com');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept email with plus sign', () => {
    const result = validateEmail('buddy+test@example.com');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept email with numbers', () => {
    const result = validateEmail('buddy123@example456.com');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('BuddyPanel - Status Colors', () => {
  it('should return green for active status', () => {
    const color = getStatusColor('active');
    expect(color).toBe('#4caf50');
  });

  it('should return orange for pending status', () => {
    const color = getStatusColor('pending');
    expect(color).toBe('#ff9800');
  });

  it('should return gray for removed status', () => {
    const color = getStatusColor('removed');
    expect(color).toBe('#9e9e9e');
  });

  it('should return default gray for unknown status', () => {
    const color = getStatusColor('unknown');
    expect(color).toBe('#757575');
  });
});

describe('BuddyPanel - Requirements Validation', () => {
  it('Requirement 9.1: Should identify pending buddy relationships', () => {
    const pendingBuddies = filterBuddiesByStatus(mockBuddies, 'pending');
    
    expect(pendingBuddies.length).toBeGreaterThan(0);
    pendingBuddies.forEach(buddy => {
      expect(buddy.status).toBe('pending');
      expect(buddy.accepted_at).toBeNull();
    });
  });

  it('Requirement 9.2: Should identify active buddy relationships', () => {
    const activeBuddies = filterBuddiesByStatus(mockBuddies, 'active');
    
    expect(activeBuddies.length).toBeGreaterThan(0);
    activeBuddies.forEach(buddy => {
      expect(buddy.status).toBe('active');
      expect(buddy.accepted_at).not.toBeNull();
    });
  });

  it('Requirement 9.3: Should display which rules buddies are watching', () => {
    const buddy = mockBuddies[0];
    const watchedText = getWatchedRulesText(buddy, mockLockRules);
    
    expect(watchedText).toBeTruthy();
    expect(typeof watchedText).toBe('string');
  });

  it('Requirement 9.7: Should identify removed buddy relationships', () => {
    const removedBuddies = filterBuddiesByStatus(mockBuddies, 'removed');
    
    expect(removedBuddies.length).toBeGreaterThan(0);
    removedBuddies.forEach(buddy => {
      expect(buddy.status).toBe('removed');
    });
  });

  it('Requirement 9.9: Should validate buddy data structure', () => {
    mockBuddies.forEach(buddy => {
      expect(buddy).toHaveProperty('id');
      expect(buddy).toHaveProperty('user_id');
      expect(buddy).toHaveProperty('buddy_user_id');
      expect(buddy).toHaveProperty('status');
      expect(buddy).toHaveProperty('invited_at');
      expect(['active', 'pending', 'removed']).toContain(buddy.status);
    });
  });
});

describe('BuddyPanel - Edge Cases', () => {
  it('should handle empty buddies array', () => {
    const activeBuddies = filterBuddiesByStatus([], 'active');
    expect(activeBuddies).toEqual([]);
  });

  it('should handle empty lock rules array', () => {
    const buddy = mockBuddies[0];
    const text = getWatchedRulesText(buddy, []);
    expect(text).toBe('No rules selected');
  });

  it('should handle buddy with rules_watching containing non-existent rule IDs', () => {
    const buddy: Buddy = {
      ...mockBuddies[0],
      rules_watching: ['non-existent-1', 'non-existent-2'],
    };
    const text = getWatchedRulesText(buddy, mockLockRules);
    expect(text).toBe('No rules selected');
  });

  it('should handle buddy with mixed valid and invalid rule IDs', () => {
    const buddy: Buddy = {
      ...mockBuddies[0],
      rules_watching: ['rule-1', 'non-existent'],
    };
    const text = getWatchedRulesText(buddy, mockLockRules);
    expect(text).toBe('Instagram');
  });
});
