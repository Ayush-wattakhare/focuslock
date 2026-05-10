/**
 * Test Helpers for Integration Tests
 * Provides utilities for creating test users, clients, and cleaning up test data
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client with service role for admin operations
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Creates a Supabase client authenticated as a specific user
 */
export function createAuthenticatedClient(accessToken: string) {
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Set the auth token
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: 'dummy-refresh-token',
  });

  return client;
}

/**
 * Creates a test user and returns user ID and access token
 */
export async function createTestUser(email?: string) {
  const serviceClient = createServiceClient();
  const testEmail = email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: testEmail,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  // Generate access token for the user
  const { data: sessionData, error: sessionError } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: testEmail,
  });

  if (sessionError) {
    throw new Error(`Failed to generate session: ${sessionError.message}`);
  }

  return {
    userId: data.user.id,
    email: testEmail,
    accessToken: sessionData.properties.access_token || '',
  };
}

/**
 * Deletes a test user and all associated data
 */
export async function deleteTestUser(userId: string) {
  const serviceClient = createServiceClient();

  // Delete user (cascade will handle related data)
  const { error } = await serviceClient.auth.admin.deleteUser(userId);

  if (error) {
    console.warn(`Failed to delete test user ${userId}:`, error.message);
  }
}

/**
 * Creates a test profile for a user
 */
export async function createTestProfile(userId: string, data?: Partial<Database['public']['Tables']['profiles']['Insert']>) {
  const serviceClient = createServiceClient();

  const { data: profile, error } = await serviceClient
    .from('profiles')
    .insert({
      id: userId,
      full_name: data?.full_name || 'Test User',
      timezone: data?.timezone || 'Asia/Kolkata',
      ...data,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test profile: ${error.message}`);
  }

  return profile;
}

/**
 * Creates a test lock rule
 */
export async function createTestLockRule(
  userId: string,
  data: Partial<Database['public']['Tables']['lock_rules']['Insert']>
) {
  const serviceClient = createServiceClient();

  const { data: rule, error } = await serviceClient
    .from('lock_rules')
    .insert({
      user_id: userId,
      app_name: data.app_name || 'TestApp',
      lock_type: data.lock_type || 'timer',
      daily_limit_minutes: data.daily_limit_minutes,
      schedule_start: data.schedule_start,
      schedule_end: data.schedule_end,
      schedule_days: data.schedule_days,
      unlock_date: data.unlock_date,
      hide_from_home: data.hide_from_home ?? true,
      hide_from_search: data.hide_from_search ?? true,
      strict_mode: data.strict_mode ?? false,
      is_active: data.is_active ?? true,
      ...data,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test lock rule: ${error.message}`);
  }

  return rule;
}

/**
 * Creates a test override log
 */
export async function createTestOverrideLog(
  userId: string,
  lockRuleId: string,
  data?: Partial<Database['public']['Tables']['override_logs']['Insert']>
) {
  const serviceClient = createServiceClient();

  const { data: log, error } = await serviceClient
    .from('override_logs')
    .insert({
      user_id: userId,
      lock_rule_id: lockRuleId,
      app_name: data?.app_name || 'TestApp',
      mood: data?.mood || 'bored',
      reason_text: data?.reason_text,
      overridden_at: data?.overridden_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test override log: ${error.message}`);
  }

  return log;
}

/**
 * Creates a test buddy relationship
 */
export async function createTestBuddyRelationship(
  userId: string,
  buddyUserId: string,
  data?: Partial<Database['public']['Tables']['buddies']['Insert']>
) {
  const serviceClient = createServiceClient();

  const { data: buddy, error } = await serviceClient
    .from('buddies')
    .insert({
      user_id: userId,
      buddy_user_id: buddyUserId,
      rules_watching: data?.rules_watching || null,
      status: data?.status || 'active',
      invited_at: data?.invited_at || new Date().toISOString(),
      accepted_at: data?.accepted_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test buddy relationship: ${error.message}`);
  }

  return buddy;
}

/**
 * Creates a test usage session
 */
export async function createTestUsageSession(
  userId: string,
  data: Partial<Database['public']['Tables']['usage_sessions']['Insert']>
) {
  const serviceClient = createServiceClient();

  const sessionStart = data.session_start || new Date().toISOString();
  const sessionEnd = data.session_end || new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const minutesUsed = data.minutes_used || Math.floor((new Date(sessionEnd).getTime() - new Date(sessionStart).getTime()) / 60000);

  const { data: session, error } = await serviceClient
    .from('usage_sessions')
    .insert({
      user_id: userId,
      app_name: data.app_name || 'TestApp',
      session_start: sessionStart,
      session_end: sessionEnd,
      minutes_used: minutesUsed,
      date: data.date || new Date().toISOString().split('T')[0],
      ...data,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test usage session: ${error.message}`);
  }

  return session;
}

/**
 * Initializes a test streak record
 */
export async function createTestStreak(
  userId: string,
  data?: Partial<Database['public']['Tables']['streaks']['Insert']>
) {
  const serviceClient = createServiceClient();

  const { data: streak, error } = await serviceClient
    .from('streaks')
    .insert({
      user_id: userId,
      current_streak: data?.current_streak || 0,
      longest_streak: data?.longest_streak || 0,
      last_active_date: data?.last_active_date,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test streak: ${error.message}`);
  }

  return streak;
}

/**
 * Waits for a specified duration (for Realtime subscriptions)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleans up all test data for a user
 */
export async function cleanupTestData(userId: string) {
  const serviceClient = createServiceClient();

  // Delete in order to respect foreign key constraints
  await serviceClient.from('buddy_notifications').delete().eq('from_user_id', userId);
  await serviceClient.from('buddy_notifications').delete().eq('to_user_id', userId);
  await serviceClient.from('buddies').delete().eq('user_id', userId);
  await serviceClient.from('buddies').delete().eq('buddy_user_id', userId);
  await serviceClient.from('user_badges').delete().eq('user_id', userId);
  await serviceClient.from('override_logs').delete().eq('user_id', userId);
  await serviceClient.from('usage_sessions').delete().eq('user_id', userId);
  await serviceClient.from('lock_rules').delete().eq('user_id', userId);
  await serviceClient.from('streaks').delete().eq('user_id', userId);
  await serviceClient.from('pomodoro_sessions').delete().eq('user_id', userId);
  await serviceClient.from('weekly_challenges').delete().eq('user_id', userId);
  await serviceClient.from('child_profiles').delete().eq('parent_user_id', userId);
  await serviceClient.from('child_profiles').delete().eq('child_user_id', userId);
  await serviceClient.from('profiles').delete().eq('id', userId);
}
