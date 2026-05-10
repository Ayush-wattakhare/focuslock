/**
 * Badge Engine Module
 * Awards badges based on user achievements and milestones
 * 
 * Supports 7 badge types:
 * - quick_start: Complete setup within 10 minutes
 * - first_week: Maintain 7-day streak
 * - seven_day_warrior: No overrides for 7 days
 * - iron_will: Complete a weekly challenge
 * - social_detox: Maintain 30-day streak
 * - night_owl_slayer: 7 days of bedtime compliance
 * - pomodoro_master: Complete 20 Pomodoro sessions
 */

import { createClient } from '@/lib/supabase/client';
import type { BadgeDefinition, Profile, UserBadge } from '@/types/database';

/**
 * Event types that can trigger badge checks
 */
export type BadgeEventType =
  | 'onboarding_complete'
  | 'streak_updated'
  | 'challenge_completed'
  | 'bedtime_check'
  | 'pomodoro_completed';

/**
 * Context data for badge evaluation
 */
export interface BadgeContext {
  currentStreak?: number;
  completedPomodoros?: number;
  bedtimeCompliance?: {
    consecutiveDays: number;
  };
  [key: string]: any;
}

/**
 * Bedtime compliance data structure
 */
interface BedtimeCompliance {
  consecutiveDays: number;
}

/**
 * Checks if user qualifies for any badges and awards them
 * @param userId - User ID to check
 * @param eventType - Type of event that triggered check
 * @param context - Additional context for badge evaluation
 */
export async function checkAndAwardBadges(
  userId: string,
  eventType: BadgeEventType,
  context: BadgeContext = {}
): Promise<void> {
  const supabase = createClient();

  // Fetch all badge definitions
  const { data: badges, error: badgesError } = await supabase
    .from('badge_definitions')
    .select('*');

  if (badgesError || !badges) {
    console.error('Failed to fetch badge definitions:', badgesError);
    return;
  }

  // Fetch user's already earned badges
  const { data: userBadges, error: userBadgesError } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  if (userBadgesError) {
    console.error('Failed to fetch user badges:', userBadgesError);
    return;
  }

  const earnedBadgeIds = new Set(userBadges?.map((b) => b.badge_id) || []);

  // Check each badge
  for (const badge of badges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    const qualifies = await evaluateBadgeCondition(userId, badge, eventType, context);

    if (qualifies) {
      await awardBadge(userId, badge.id);
      await sendBadgeNotification(userId, badge);
    }
  }
}

/**
 * Evaluates if a user qualifies for a specific badge
 * @param userId - User ID to check
 * @param badge - Badge definition to evaluate
 * @param eventType - Type of event that triggered check
 * @param context - Additional context for badge evaluation
 * @returns True if user qualifies for the badge
 */
export async function evaluateBadgeCondition(
  userId: string,
  badge: BadgeDefinition,
  eventType: BadgeEventType,
  context: BadgeContext
): Promise<boolean> {
  switch (badge.id) {
    case 'quick_start':
      // Awarded if user completes onboarding within 10 minutes
      if (eventType !== 'onboarding_complete') return false;
      const profile = await getProfile(userId);
      if (!profile) return false;
      const timeSinceCreation = Date.now() - new Date(profile.created_at).getTime();
      return timeSinceCreation <= 10 * 60 * 1000; // 10 minutes

    case 'first_week':
    case 'seven_day_warrior':
      // Awarded at 7-day streak
      if (eventType !== 'streak_updated') return false;
      return (context.currentStreak ?? 0) >= 7;

    case 'iron_will':
      // Awarded when weekly challenge is completed
      if (eventType !== 'challenge_completed') return false;
      return true;

    case 'social_detox':
      // Awarded at 30-day streak
      if (eventType !== 'streak_updated') return false;
      return (context.currentStreak ?? 0) >= 30;

    case 'night_owl_slayer':
      // Awarded after 7 consecutive days of bedtime mode compliance
      if (eventType !== 'bedtime_check') return false;
      const bedtimeCompliance = await getBedtimeCompliance(userId, 7);
      return bedtimeCompliance.consecutiveDays >= 7;

    case 'pomodoro_master':
      // Awarded after 20 completed Pomodoro sessions
      if (eventType !== 'pomodoro_completed') return false;
      const completedSessions = await countCompletedPomodoros(userId);
      return completedSessions >= 20;

    default:
      return false;
  }
}

/**
 * Awards a badge to a user with duplicate prevention
 * @param userId - User ID to award badge to
 * @param badgeId - Badge ID to award
 */
export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  const supabase = createClient();

  // Use upsert with onConflict to prevent duplicates
  const { error } = await supabase
    .from('user_badges')
    .upsert(
      {
        user_id: userId,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,badge_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error('Failed to award badge:', error);
  }
}

/**
 * Helper function to get user profile
 */
async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }

  return data;
}

/**
 * Helper function to get bedtime compliance for a user
 * @param userId - User ID to check
 * @param days - Number of days to check
 * @returns Bedtime compliance data
 */
async function getBedtimeCompliance(userId: string, days: number): Promise<BedtimeCompliance> {
  const supabase = createClient();

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch override logs in the date range
  const { data: overrideLogs, error } = await supabase
    .from('override_logs')
    .select('overridden_at')
    .eq('user_id', userId)
    .gte('overridden_at', startDate.toISOString())
    .lte('overridden_at', endDate.toISOString())
    .order('overridden_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch override logs:', error);
    return { consecutiveDays: 0 };
  }

  // Check for consecutive days without overrides
  // For bedtime mode, we need to check if there were no overrides during bedtime hours
  // For simplicity, we'll check if there are no overrides at all in the period
  if (!overrideLogs || overrideLogs.length === 0) {
    return { consecutiveDays: days };
  }

  // Count consecutive days from the end
  let consecutiveDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const nextDate = new Date(checkDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Check if there's an override on this date
    const hasOverride = overrideLogs.some((log) => {
      const logDate = new Date(log.overridden_at);
      return logDate >= checkDate && logDate < nextDate;
    });

    if (hasOverride) {
      break;
    }

    consecutiveDays++;
  }

  return { consecutiveDays };
}

/**
 * Helper function to count completed Pomodoro sessions
 * @param userId - User ID to check
 * @returns Number of completed Pomodoro sessions
 */
async function countCompletedPomodoros(userId: string): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    console.error('Failed to count completed Pomodoros:', error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Helper function to send badge notification to user
 * @param userId - User ID to notify
 * @param badge - Badge that was earned
 */
async function sendBadgeNotification(userId: string, badge: BadgeDefinition): Promise<void> {
  // Import notification service dynamically to avoid SSR issues
  if (typeof window !== 'undefined') {
    const { sendBadgeEarnedNotification } = await import('./notificationService');
    await sendBadgeEarnedNotification(badge.name, badge.icon || '🏆');
  }
  
  console.log(`Badge earned: ${badge.name} for user ${userId}`);
}
