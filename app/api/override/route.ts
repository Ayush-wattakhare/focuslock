// Override API Route
// POST /api/override - Log override with mood, reset streak, notify buddies

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetStreak } from '@/lib/core/streakManager';
import type { OverrideLogInsert, BuddyNotification } from '@/types/database';

// Request body interface
interface OverrideRequest {
  lock_rule_id: string;
  app_name: string;
  mood: 'bored' | 'stressed' | 'tired' | 'news' | 'other';
  reason_text?: string;
}

// Response interface
interface OverrideResponse {
  log: {
    id: string;
    user_id: string;
    lock_rule_id: string | null;
    app_name: string;
    mood: string | null;
    reason_text: string | null;
    overridden_at: string;
  };
  streakBroken: boolean;
  buddyNotified: boolean;
}

// POST /api/override - Log override and handle side effects
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body: OverrideRequest = await request.json();

    // Validate required fields
    if (!body.lock_rule_id || !body.app_name || !body.mood) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required fields: lock_rule_id, app_name, mood' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate mood value
    const validMoods = ['bored', 'stressed', 'tired', 'news', 'other'];
    if (!validMoods.includes(body.mood)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: `Invalid mood. Must be one of: ${validMoods.join(', ')}` 
          } 
        },
        { status: 400 }
      );
    }

    // Verify the lock rule belongs to the user
    const { data: lockRule, error: ruleError } = await supabase
      .from('lock_rules')
      .select('id, user_id, lock_type')
      .eq('id', body.lock_rule_id)
      .eq('user_id', user.id)
      .single();

    if (ruleError || !lockRule) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Lock rule not found or does not belong to user' 
          } 
        },
        { status: 404 }
      );
    }

    // Check if rule is nuclear mode (should not allow override)
    if (lockRule.lock_type === 'nuclear') {
      return NextResponse.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Cannot override nuclear mode lock' 
          } 
        },
        { status: 403 }
      );
    }

    // 1. Log the override
    const overrideData: OverrideLogInsert = {
      user_id: user.id,
      lock_rule_id: body.lock_rule_id,
      app_name: body.app_name,
      mood: body.mood,
      reason_text: body.reason_text || null,
    };

    const { data: log, error: logError } = await supabase
      .from('override_logs')
      .insert(overrideData)
      .select()
      .single();

    if (logError || !log) {
      console.error('Error creating override log:', logError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to log override', 
            details: logError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // 2. Reset streak
    let streakBroken = false;
    try {
      await resetStreak(user.id);
      streakBroken = true;
    } catch (error) {
      console.error('Error resetting streak:', error);
      // Don't fail the request if streak reset fails
    }

    // 3. Check for active buddies watching this rule
    const { data: buddies, error: buddiesError } = await supabase
      .from('buddies')
      .select('buddy_user_id, rules_watching')
      .eq('user_id', user.id)
      .eq('status', 'active');

    let buddyNotified = false;

    if (!buddiesError && buddies && buddies.length > 0) {
      // Filter buddies who are watching this specific rule or all rules
      const watchingBuddies = buddies.filter(buddy => {
        // If rules_watching is null or empty, buddy watches all rules
        if (!buddy.rules_watching || buddy.rules_watching.length === 0) {
          return true;
        }
        // Check if this rule is in the watched rules
        return buddy.rules_watching.includes(body.lock_rule_id);
      });

      if (watchingBuddies.length > 0) {
        // Create notifications for watching buddies
        const notifications = watchingBuddies.map(buddy => ({
          from_user_id: user.id,
          to_user_id: buddy.buddy_user_id,
          event_type: 'override' as const,
          app_name: body.app_name,
          message: `Your buddy overrode their ${body.app_name} lock`,
          is_read: false,
        }));

        const { error: notifError } = await supabase
          .from('buddy_notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error creating buddy notifications:', notifError);
          // Don't fail the request if notification creation fails
        } else {
          buddyNotified = true;

          // Trigger Supabase Realtime broadcast for each buddy
          // The notifications are automatically broadcast via Supabase Realtime
          // when inserted into the buddy_notifications table
          // Clients subscribe to changes on this table filtered by to_user_id
        }
      }
    }

    // Return success response
    const response: OverrideResponse = {
      log,
      streakBroken,
      buddyNotified,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/override:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
