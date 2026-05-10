/**
 * Streak Manager Module
 * 
 * Manages user streak calculation and updates. Runs daily via Vercel Cron
 * to check if users maintained their lock rules without overrides.
 * 
 * Key features:
 * - Check for overrides on previous day
 * - Increment streak for compliant days
 * - Reset streak to 0 on override
 * - Update longest streak when current exceeds it
 * - Check and award streak-related badges
 * - Notify buddies when streaks are broken
 * 
 * Validates: Requirements 6.1-6.7
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Result of checking and updating all user streaks
 */
export interface StreakCheckResult {
  streaksIncremented: number;
  streaksBroken: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Checks all users and updates streaks based on yesterday's activity
 * Called by Vercel Cron at midnight UTC
 * 
 * Algorithm:
 * 1. Get yesterday's date
 * 2. Fetch all users
 * 3. For each user:
 *    - Check if they had any overrides yesterday
 *    - If yes: reset streak and notify buddy
 *    - If no: increment streak and check for badges
 * 
 * @returns Summary of streak updates
 */
export async function checkAndUpdateStreaks(): Promise<StreakCheckResult> {
  const supabase = await createClient();
  const yesterday = getYesterday();
  
  let streaksIncremented = 0;
  let streaksBroken = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  // Get all users with profiles
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id');

  if (usersError || !users) {
    throw new Error(`Failed to fetch users: ${usersError?.message}`);
  }

  // Process each user
  for (const user of users) {
    try {
      const hadOverride = await checkOverrideOnDate(user.id, yesterday);
      
      if (hadOverride) {
        // Break streak
        await resetStreak(user.id);
        streaksBroken++;
        
        // Notify buddy if configured
        await notifyBuddyStreakBroken(user.id);
      } else {
        // Increment streak
        await incrementStreak(user.id, yesterday);
        streaksIncremented++;
        
        // Check for badge awards
        await checkStreakBadges(user.id);
      }
    } catch (error) {
      errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { streaksIncremented, streaksBroken, errors };
}

/**
 * Increments a user's streak for a compliant day
 * 
 * Algorithm:
 * 1. Get current streak record
 * 2. Check if this is a consecutive day (last_active_date was yesterday)
 * 3. If consecutive: increment current_streak by 1
 * 4. If not consecutive: reset to 1 (new streak starts)
 * 5. Update longest_streak if current exceeds it
 * 6. Update last_active_date to the given date
 * 
 * @param userId - User ID to increment streak for
 * @param date - Date of the compliant day
 * @returns New current streak value
 */
export async function incrementStreak(userId: string, date: Date): Promise<number> {
  const supabase = await createClient();
  
  // Get current streak
  const { data: streak, error: fetchError } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError || !streak) {
    throw new Error(`Failed to fetch streak for user ${userId}: ${fetchError?.message}`);
  }

  // Check if this is consecutive day
  const lastActiveDate = streak.last_active_date ? new Date(streak.last_active_date) : null;
  const isConsecutive = lastActiveDate && isYesterday(lastActiveDate, date);

  const newCurrentStreak = isConsecutive ? streak.current_streak + 1 : 1;
  const newLongestStreak = Math.max(newCurrentStreak, streak.longest_streak);

  // Update streak
  const { error: updateError } = await supabase
    .from('streaks')
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_active_date: date.toISOString().split('T')[0] // YYYY-MM-DD format
    })
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(`Failed to update streak for user ${userId}: ${updateError.message}`);
  }

  return newCurrentStreak;
}

/**
 * Resets a user's current streak to 0
 * Called when a user logs an override
 * 
 * Note: longest_streak is preserved
 * 
 * @param userId - User ID to reset streak for
 */
export async function resetStreak(userId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('streaks')
    .update({
      current_streak: 0
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to reset streak for user ${userId}: ${error.message}`);
  }
}

/**
 * Checks if a user had any overrides on a specific date
 * 
 * @param userId - User ID to check
 * @param date - Date to check for overrides
 * @returns True if user had at least one override on that date
 */
async function checkOverrideOnDate(userId: string, date: Date): Promise<boolean> {
  const supabase = await createClient();
  
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const startOfDay = `${dateStr}T00:00:00Z`;
  const endOfDay = `${dateStr}T23:59:59Z`;

  const { data, error } = await supabase
    .from('override_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('overridden_at', startOfDay)
    .lte('overridden_at', endOfDay)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check overrides for user ${userId}: ${error.message}`);
  }

  return data && data.length > 0;
}

/**
 * Checks and awards streak-related badges
 * Uses the database function check_streak_badges
 * 
 * Badges awarded:
 * - first_week: 7-day streak
 * - seven_day_warrior: 7-day streak
 * - social_detox: 30-day streak
 * 
 * @param userId - User ID to check badges for
 */
async function checkStreakBadges(userId: string): Promise<void> {
  const supabase = await createClient();
  
  // Call database function to check and award badges
  const { error } = await supabase.rpc('check_streak_badges', {
    p_user_id: userId
  });

  if (error) {
    // Log error but don't throw - badge awarding is not critical
    console.error(`Failed to check streak badges for user ${userId}:`, error.message);
  }
}

/**
 * Notifies all active buddies when a user's streak is broken
 * Creates buddy_notification records for each active buddy
 * 
 * @param userId - User ID whose streak was broken
 */
async function notifyBuddyStreakBroken(userId: string): Promise<void> {
  const supabase = await createClient();
  
  // Get all active buddies for this user
  const { data: buddies, error: fetchError } = await supabase
    .from('buddies')
    .select('buddy_user_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (fetchError) {
    console.error(`Failed to fetch buddies for user ${userId}:`, fetchError.message);
    return;
  }

  if (!buddies || buddies.length === 0) {
    return; // No buddies to notify
  }

  // Create notifications for each buddy
  const notifications = buddies.map(buddy => ({
    from_user_id: userId,
    to_user_id: buddy.buddy_user_id,
    event_type: 'streak_broken' as const,
    app_name: null,
    message: 'Your buddy\'s streak was broken',
    is_read: false
  }));

  const { error: insertError } = await supabase
    .from('buddy_notifications')
    .insert(notifications);

  if (insertError) {
    console.error(`Failed to create buddy notifications for user ${userId}:`, insertError.message);
  }
}

/**
 * Gets yesterday's date at midnight UTC
 * 
 * @returns Date object for yesterday at 00:00:00 UTC
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  return yesterday;
}

/**
 * Checks if a date is exactly one day before another date
 * Used to determine if streak is consecutive
 * 
 * @param date1 - The earlier date
 * @param date2 - The later date
 * @returns True if date1 is exactly one day before date2
 */
function isYesterday(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
}
