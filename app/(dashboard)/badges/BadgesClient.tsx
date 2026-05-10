'use client';

/**
 * Badges Client Component
 * 
 * Displays user's badges with streak visualization.
 * 
 * Features:
 * - StreakDots component showing current and longest streak
 * - Grid of BadgeCard components (earned and locked)
 * - Earned badges displayed in color with earned date
 * - Locked badges displayed in grayscale with unlock conditions
 * 
 * Requirements: 6.1-6.7, 7.1-7.6
 */

import React from 'react';
import { User } from '@supabase/supabase-js';
import StreakDots from '@/components/features/StreakDots';
import BadgeCard from '@/components/features/BadgeCard';
import type { Streak, BadgeDefinition, UserBadge } from '@/types/database';

interface BadgesClientProps {
  user: User;
  streak: Streak | null;
  badgeDefinitions: BadgeDefinition[];
  userBadges: UserBadge[];
}

export default function BadgesClient({
  user,
  streak,
  badgeDefinitions,
  userBadges,
}: BadgesClientProps) {
  // Create a map of earned badge IDs to earned dates
  const earnedBadgesMap = new Map<string, Date>();
  userBadges.forEach((userBadge) => {
    earnedBadgesMap.set(userBadge.badge_id, new Date(userBadge.earned_at));
  });

  // Separate earned and locked badges
  const earnedBadges = badgeDefinitions.filter((badge) =>
    earnedBadgesMap.has(badge.id)
  );
  const lockedBadges = badgeDefinitions.filter(
    (badge) => !earnedBadgesMap.has(badge.id)
  );

  return (
    <div className="badges-page">
      {/* Page Header */}
      <header className="badges-header">
        <h1 className="badges-title">Your Badges</h1>
        <p className="badges-subtitle">
          Track your progress and unlock achievements
        </p>
      </header>

      {/* Streak Visualization */}
      <section className="badges-streak-section">
        <StreakDots
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak ?? 0}
        />
      </section>

      {/* Earned Badges Section */}
      {earnedBadges.length > 0 && (
        <section className="badges-section">
          <h2 className="badges-section-title">
            Earned Badges ({earnedBadges.length})
          </h2>
          <div className="badges-grid">
            {earnedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={true}
                earnedAt={earnedBadgesMap.get(badge.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Locked Badges Section */}
      {lockedBadges.length > 0 && (
        <section className="badges-section">
          <h2 className="badges-section-title">
            Locked Badges ({lockedBadges.length})
          </h2>
          <div className="badges-grid">
            {lockedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {badgeDefinitions.length === 0 && (
        <div className="badges-empty">
          <p>No badges available yet. Check back soon!</p>
        </div>
      )}

      <style jsx>{`
        .badges-page {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .badges-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .badges-title {
          font-size: 32px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }

        .badges-subtitle {
          font-size: 16px;
          color: #666;
        }

        .badges-streak-section {
          max-width: 600px;
          margin: 0 auto 48px;
        }

        .badges-section {
          margin-bottom: 48px;
        }

        .badges-section-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
        }

        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 24px;
        }

        .badges-empty {
          text-align: center;
          padding: 48px 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .badges-empty p {
          font-size: 16px;
          color: #666;
        }

        @media (max-width: 768px) {
          .badges-page {
            padding: 20px;
          }

          .badges-title {
            font-size: 28px;
          }

          .badges-subtitle {
            font-size: 14px;
          }

          .badges-streak-section {
            margin-bottom: 40px;
          }

          .badges-section {
            margin-bottom: 40px;
          }

          .badges-section-title {
            font-size: 22px;
            margin-bottom: 20px;
          }

          .badges-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 480px) {
          .badges-page {
            padding: 16px;
          }

          .badges-title {
            font-size: 24px;
          }

          .badges-subtitle {
            font-size: 13px;
          }

          .badges-streak-section {
            margin-bottom: 32px;
          }

          .badges-section {
            margin-bottom: 32px;
          }

          .badges-section-title {
            font-size: 20px;
            margin-bottom: 16px;
          }

          .badges-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .badges-empty {
            padding: 32px 16px;
          }
        }
      `}</style>
    </div>
  );
}
