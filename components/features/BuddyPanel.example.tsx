/**
 * BuddyPanel Component Example
 * 
 * This file demonstrates how to use the BuddyPanel component
 * with sample data and handlers.
 */

import BuddyPanel from './BuddyPanel';
import { Buddy, LockRule } from '@/types';

// Sample lock rules data
const sampleLockRules: LockRule[] = [
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
  {
    id: 'rule-3',
    user_id: 'user-123',
    app_name: 'TikTok',
    app_icon_url: null,
    app_scheme: null,
    lock_type: 'nuclear',
    daily_limit_minutes: null,
    schedule_start: null,
    schedule_end: null,
    schedule_days: null,
    unlock_date: null,
    hide_from_home: true,
    hide_from_search: true,
    strict_mode: false,
    is_active: true,
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z',
  },
];

// Sample buddies data
const sampleBuddies: Buddy[] = [
  {
    id: 'buddy-1',
    user_id: 'user-123',
    buddy_user_id: 'user-456',
    rules_watching: ['rule-1', 'rule-2'], // Watching Instagram and YouTube
    status: 'active',
    invited_at: '2024-01-10T10:00:00Z',
    accepted_at: '2024-01-11T14:30:00Z',
  },
  {
    id: 'buddy-2',
    user_id: 'user-123',
    buddy_user_id: 'user-789',
    rules_watching: null, // Watching all rules
    status: 'active',
    invited_at: '2024-01-12T10:00:00Z',
    accepted_at: '2024-01-12T15:00:00Z',
  },
  {
    id: 'buddy-3',
    user_id: 'user-123',
    buddy_user_id: 'user-101',
    rules_watching: ['rule-3'], // Watching TikTok only
    status: 'pending',
    invited_at: '2024-01-18T10:00:00Z',
    accepted_at: null,
  },
];

// Example 1: Basic usage with all features
export function BuddyPanelBasicExample() {
  const handleInvite = async (email: string, rulesWatching: string[]) => {
    console.log('Inviting buddy:', email);
    console.log('Rules to watch:', rulesWatching);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, call API:
    // const response = await fetch('/api/buddy/invite', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ buddy_email: email, rules_watching: rulesWatching }),
    // });
  };

  const handleRemove = async (buddyId: string) => {
    console.log('Removing buddy:', buddyId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In real implementation, call API:
    // await fetch(`/api/buddy/${buddyId}`, { method: 'DELETE' });
  };

  return (
    <BuddyPanel
      buddies={sampleBuddies}
      lockRules={sampleLockRules}
      onInvite={handleInvite}
      onRemove={handleRemove}
    />
  );
}

// Example 2: Empty state (no buddies)
export function BuddyPanelEmptyExample() {
  const handleInvite = async (email: string, rulesWatching: string[]) => {
    console.log('Inviting first buddy:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <BuddyPanel
      buddies={[]}
      lockRules={sampleLockRules}
      onInvite={handleInvite}
    />
  );
}

// Example 3: No lock rules yet
export function BuddyPanelNoRulesExample() {
  const handleInvite = async (email: string, rulesWatching: string[]) => {
    console.log('Inviting buddy (no rules to watch):', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <BuddyPanel
      buddies={sampleBuddies}
      lockRules={[]}
      onInvite={handleInvite}
    />
  );
}

// Example 4: Only active buddies
export function BuddyPanelActiveOnlyExample() {
  const activeBuddies = sampleBuddies.filter(b => b.status === 'active');

  const handleInvite = async (email: string, rulesWatching: string[]) => {
    console.log('Inviting buddy:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <BuddyPanel
      buddies={activeBuddies}
      lockRules={sampleLockRules}
      onInvite={handleInvite}
    />
  );
}

// Example 5: With error handling
export function BuddyPanelWithErrorHandlingExample() {
  const handleInvite = async (email: string, rulesWatching: string[]) => {
    // Simulate validation error
    if (email === 'invalid@test.com') {
      throw new Error('This user is already your buddy');
    }
    
    // Simulate network error
    if (email === 'error@test.com') {
      throw new Error('Network error: Failed to send invitation');
    }
    
    console.log('Invitation sent successfully to:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleRemove = async (buddyId: string) => {
    // Simulate error
    if (buddyId === 'buddy-1') {
      throw new Error('Cannot remove buddy: Active notifications pending');
    }
    
    console.log('Buddy removed successfully:', buddyId);
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  return (
    <BuddyPanel
      buddies={sampleBuddies}
      lockRules={sampleLockRules}
      onInvite={handleInvite}
      onRemove={handleRemove}
    />
  );
}

// Example 6: Read-only mode (no remove functionality)
export function BuddyPanelReadOnlyExample() {
  const handleInvite = async (email: string, rulesWatching: string[]) => {
    console.log('Inviting buddy:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <BuddyPanel
      buddies={sampleBuddies}
      lockRules={sampleLockRules}
      onInvite={handleInvite}
      // No onRemove prop - remove buttons won't be shown
    />
  );
}

// Example 7: Integration with React state
export function BuddyPanelStatefulExample() {
  const [buddies, setBuddies] = React.useState<Buddy[]>(sampleBuddies);
  const [lockRules, setLockRules] = React.useState<LockRule[]>(sampleLockRules);

  const handleInvite = async (email: string, rulesWatching: string[]) => {
    // Create new buddy (simulated)
    const newBuddy: Buddy = {
      id: `buddy-${Date.now()}`,
      user_id: 'user-123',
      buddy_user_id: `user-${Date.now()}`,
      rules_watching: rulesWatching.length > 0 ? rulesWatching : null,
      status: 'pending',
      invited_at: new Date().toISOString(),
      accepted_at: null,
    };

    // Update state
    setBuddies(prev => [...prev, newBuddy]);
  };

  const handleRemove = async (buddyId: string) => {
    // Update buddy status to removed
    setBuddies(prev =>
      prev.map(buddy =>
        buddy.id === buddyId
          ? { ...buddy, status: 'removed' as const }
          : buddy
      ).filter(buddy => buddy.status !== 'removed')
    );
  };

  return (
    <BuddyPanel
      buddies={buddies}
      lockRules={lockRules}
      onInvite={handleInvite}
      onRemove={handleRemove}
    />
  );
}

// Example 8: With real API integration
export function BuddyPanelRealAPIExample() {
  const [buddies, setBuddies] = React.useState<Buddy[]>([]);
  const [lockRules, setLockRules] = React.useState<LockRule[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch buddies
      const buddiesRes = await fetch('/api/buddy');
      const buddiesData = await buddiesRes.json();
      setBuddies(buddiesData.buddies || []);

      // Fetch lock rules
      const rulesRes = await fetch('/api/rules');
      const rulesData = await rulesRes.json();
      setLockRules(rulesData.rules || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email: string, rulesWatching: string[]) => {
    const response = await fetch('/api/buddy/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buddy_email: email,
        rules_watching: rulesWatching.length > 0 ? rulesWatching : null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    // Refresh buddies list
    await fetchData();
  };

  const handleRemove = async (buddyId: string) => {
    const response = await fetch(`/api/buddy/${buddyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove buddy');
    }

    // Refresh buddies list
    await fetchData();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BuddyPanel
      buddies={buddies}
      lockRules={lockRules}
      onInvite={handleInvite}
      onRemove={handleRemove}
    />
  );
}

// Import React for stateful examples
import React from 'react';
