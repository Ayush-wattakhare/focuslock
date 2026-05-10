// Buddy Notifications API Route
// GET /api/buddy/notifications - Fetch notifications for the authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface NotificationsResponse {
  notifications: Array<{
    id: string;
    from_user_id: string;
    to_user_id: string;
    event_type: 'override' | 'streak_broken' | 'weekly_summary';
    app_name: string | null;
    message: string | null;
    is_read: boolean;
    created_at: string;
    from_user?: {
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
  unread_count: number;
}

// GET /api/buddy/notifications - Fetch notifications for authenticated user
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Limit must be between 1 and 100' 
          } 
        },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('buddy_notifications')
      .select(`
        *,
        from_user:profiles!buddy_notifications_from_user_id_fkey(
          full_name,
          avatar_url
        )
      `)
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by unread if requested
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: notifError } = await query;

    if (notifError) {
      console.error('Error fetching notifications:', notifError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch notifications',
            details: notifError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Count unread notifications
    const { count: unreadCount, error: countError } = await supabase
      .from('buddy_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', user.id)
      .eq('is_read', false);

    if (countError) {
      console.error('Error counting unread notifications:', countError);
      // Don't fail the request, just set unread_count to 0
    }

    // Return success response
    const response: NotificationsResponse = {
      notifications: notifications || [],
      unread_count: unreadCount || 0,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/buddy/notifications:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// PATCH /api/buddy/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
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
    const notificationIds: string[] = body.notification_ids;

    // Validate notification_ids
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'notification_ids must be a non-empty array' 
          } 
        },
        { status: 400 }
      );
    }

    // Mark notifications as read (only if they belong to the user)
    const { data: updatedNotifications, error: updateError } = await supabase
      .from('buddy_notifications')
      .update({ is_read: true })
      .eq('to_user_id', user.id)
      .in('id', notificationIds)
      .select();

    if (updateError) {
      console.error('Error marking notifications as read:', updateError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to mark notifications as read',
            details: updateError.message 
          } 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      updated_count: updatedNotifications?.length || 0,
      notifications: updatedNotifications || [],
    }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/buddy/notifications:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
