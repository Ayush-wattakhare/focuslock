// Buddy Notify API Route
// POST /api/buddy/notify - Fire notifications to buddies

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface BuddyNotifyRequest {
  to_user_id: string;
  event_type: 'override' | 'streak_broken' | 'weekly_summary';
  app_name?: string;
  message: string;
}

// Response interface
interface BuddyNotifyResponse {
  notification: {
    id: string;
    from_user_id: string;
    to_user_id: string;
    event_type: 'override' | 'streak_broken' | 'weekly_summary';
    app_name: string | null;
    message: string | null;
    is_read: boolean;
    created_at: string;
  };
  sent: boolean;
}

// POST /api/buddy/notify - Create a notification for a buddy
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
    const body: BuddyNotifyRequest = await request.json();

    // Validate required fields
    if (!body.to_user_id || !body.event_type || !body.message) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required fields: to_user_id, event_type, message' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate event_type
    const validEventTypes = ['override', 'streak_broken', 'weekly_summary'];
    if (!validEventTypes.includes(body.event_type)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
          } 
        },
        { status: 400 }
      );
    }

    // Verify buddy relationship exists and is active
    const { data: buddyRelationship, error: buddyError } = await supabase
      .from('buddies')
      .select('*')
      .eq('user_id', user.id)
      .eq('buddy_user_id', body.to_user_id)
      .eq('status', 'active')
      .maybeSingle();

    if (buddyError) {
      console.error('Error checking buddy relationship:', buddyError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to verify buddy relationship' 
          } 
        },
        { status: 500 }
      );
    }

    if (!buddyRelationship) {
      return NextResponse.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'No active buddy relationship with this user' 
          } 
        },
        { status: 403 }
      );
    }

    // Create the notification
    const { data: notification, error: notifError } = await supabase
      .from('buddy_notifications')
      .insert({
        from_user_id: user.id,
        to_user_id: body.to_user_id,
        event_type: body.event_type,
        app_name: body.app_name || null,
        message: body.message,
        is_read: false,
      })
      .select()
      .single();

    if (notifError || !notification) {
      console.error('Error creating buddy notification:', notifError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to create notification',
            details: notifError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Notification is automatically broadcast via Supabase Realtime
    // when inserted into the buddy_notifications table
    // Clients subscribe to changes on this table filtered by to_user_id

    // Return success response
    const response: BuddyNotifyResponse = {
      notification,
      sent: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/buddy/notify:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
