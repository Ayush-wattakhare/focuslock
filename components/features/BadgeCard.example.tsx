/**
 * BadgeCard Component Examples
 * 
 * This file demonstrates various usage patterns for the BadgeCard component.
 */

import BadgeCard from './BadgeCard';
import { BadgeDefinition } from '@/types';

// Example badge definitions
const badges: BadgeDefinition[] = [
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

// Example 1: Earned Badge
export function EarnedBadgeExample() {
  return (
    <div style={{ padding: '20px', maxWidth: '250px' }}>
      <h3>Earned Badge</h3>
      <BadgeCard
        badge={badges[0]}
        earned={true}
        earnedAt={new Date('2024-01-15T10:30:00')}
      />
    </div>
  );
}

// Example 2: Locked Badge
export function LockedBadgeExample() {
  return (
    <div style={{ padding: '20px', maxWidth: '250px' }}>
      <h3>Locked Badge</h3>
      <BadgeCard
        badge={badges[4]}
        earned={false}
      />
    </div>
  );
}

// Example 3: Badge Grid - Mixed States
export function BadgeGridExample() {
  const userBadges = [
    { badge_id: 'quick_start', earned_at: '2024-01-15T10:30:00' },
    { badge_id: 'first_week', earned_at: '2024-01-22T08:15:00' },
    { badge_id: 'seven_day_warrior', earned_at: '2024-01-22T08:15:00' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h3>Badge Collection</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}
      >
        {badges.map(badge => {
          const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
          const earned = !!userBadge;
          const earnedAt = userBadge ? new Date(userBadge.earned_at) : undefined;

          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earned}
              earnedAt={earnedAt}
            />
          );
        })}
      </div>
    </div>
  );
}

// Example 4: Badge Without Icon
export function BadgeWithoutIconExample() {
  const customBadge: BadgeDefinition = {
    id: 'custom_badge',
    name: 'Custom Achievement',
    description: 'A badge without an emoji icon',
    icon: null,
    condition: 'Complete custom task'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '250px' }}>
      <h3>Badge Without Icon</h3>
      <BadgeCard
        badge={customBadge}
        earned={false}
      />
    </div>
  );
}

// Example 5: Recently Earned Badge
export function RecentlyEarnedBadgeExample() {
  const today = new Date();
  
  return (
    <div style={{ padding: '20px', maxWidth: '250px' }}>
      <h3>Recently Earned Badge</h3>
      <BadgeCard
        badge={badges[3]}
        earned={true}
        earnedAt={today}
      />
    </div>
  );
}

// Example 6: Responsive Grid
export function ResponsiveBadgeGridExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h3>Responsive Badge Grid</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '20px'
        }}
      >
        <BadgeCard
          badge={badges[0]}
          earned={true}
          earnedAt={new Date('2024-01-15')}
        />
        <BadgeCard
          badge={badges[1]}
          earned={true}
          earnedAt={new Date('2024-01-22')}
        />
        <BadgeCard
          badge={badges[2]}
          earned={false}
        />
        <BadgeCard
          badge={badges[3]}
          earned={false}
        />
      </div>
    </div>
  );
}

// Example 7: All Badges Showcase
export function AllBadgesShowcaseExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>FocusLock Badge System</h2>
      
      <section style={{ marginTop: '30px' }}>
        <h3>Earned Badges (3)</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '16px'
          }}
        >
          <BadgeCard
            badge={badges[0]}
            earned={true}
            earnedAt={new Date('2024-01-15')}
          />
          <BadgeCard
            badge={badges[1]}
            earned={true}
            earnedAt={new Date('2024-01-22')}
          />
          <BadgeCard
            badge={badges[2]}
            earned={true}
            earnedAt={new Date('2024-01-22')}
          />
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h3>Locked Badges (4)</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '16px'
          }}
        >
          <BadgeCard badge={badges[3]} earned={false} />
          <BadgeCard badge={badges[4]} earned={false} />
          <BadgeCard badge={badges[5]} earned={false} />
          <BadgeCard badge={badges[6]} earned={false} />
        </div>
      </section>
    </div>
  );
}

// Default export for easy importing
export default function BadgeCardExamples() {
  return (
    <div>
      <EarnedBadgeExample />
      <LockedBadgeExample />
      <BadgeGridExample />
    </div>
  );
}
