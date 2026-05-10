// Profile Update API Route
// PATCH /api/profile - Update user profile

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProfileUpdate } from '@/types/database';

export async function PATCH(request: Request) {
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

    // Parse request body
    const body = await request.json();
    const { 
      full_name, 
      avatar_url, 
      timezone,
      notify_unlock,
      notify_buddy_override,
      notify_streak_broken,
      notify_badge_earned
    } = body;

    // Build update object
    const profileUpdate: ProfileUpdate = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url;
    if (timezone !== undefined) profileUpdate.timezone = timezone;
    if (notify_unlock !== undefined) profileUpdate.notify_unlock = notify_unlock;
    if (notify_buddy_override !== undefined) profileUpdate.notify_buddy_override = notify_buddy_override;
    if (notify_streak_broken !== undefined) profileUpdate.notify_streak_broken = notify_streak_broken;
    if (notify_badge_earned !== undefined) profileUpdate.notify_badge_earned = notify_badge_earned;

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to update profile', 
            details: updateError.message 
          } 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updatedProfile }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/profile:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
