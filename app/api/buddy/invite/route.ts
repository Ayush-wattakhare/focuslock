// Buddy Invite API Route
// POST /api/buddy/invite - Send buddy invitation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface BuddyInviteRequest {
  buddy_email: string;
  rules_watching?: string[]; // Optional array of lock_rule IDs
}

// Response interface
interface BuddyInviteResponse {
  buddy: {
    id: string;
    user_id: string;
    buddy_user_id: string;
    rules_watching: string[] | null;
    status: 'pending' | 'active' | 'removed';
    invited_at: string;
    accepted_at: string | null;
  };
  invite_sent: boolean;
}

// POST /api/buddy/invite - Create buddy invitation
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
    const body: BuddyInviteRequest = await request.json();

    // Validate required fields
    if (!body.buddy_email) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required field: buddy_email' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.buddy_email)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid email format' 
          } 
        },
        { status: 400 }
      );
    }

    // Find buddy user by email
    // Note: This requires the profiles table to have an email column or
    // we need to query auth.users which requires service role key
    // For now, we'll use a workaround by looking up via Supabase auth
    
    // Get all users and find by email (requires service role)
    // In production, consider adding email to profiles table for better performance
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listing users:', usersError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to lookup user by email' 
          } 
        },
        { status: 500 }
      );
    }
    
    const buddyUser = users?.find(u => u.email === body.buddy_email);
    
    if (!buddyUser) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'User with this email not found' 
          } 
        },
        { status: 404 }
      );
    }

    // Prevent self-invitation
    if (buddyUser.id === user.id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Cannot invite yourself as a buddy' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate rules_watching if provided
    if (body.rules_watching && body.rules_watching.length > 0) {
      // Verify all rules belong to the user
      const { data: rules, error: rulesError } = await supabase
        .from('lock_rules')
        .select('id')
        .eq('user_id', user.id)
        .in('id', body.rules_watching);

      if (rulesError || !rules || rules.length !== body.rules_watching.length) {
        return NextResponse.json(
          { 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: 'One or more lock rules not found or do not belong to user' 
            } 
          },
          { status: 400 }
        );
      }
    }

    // Check if buddy relationship already exists
    const { data: existingBuddy, error: existingError } = await supabase
      .from('buddies')
      .select('*')
      .eq('user_id', user.id)
      .eq('buddy_user_id', buddyUser.id)
      .maybeSingle();

    if (existingBuddy) {
      if (existingBuddy.status === 'removed') {
        // Reactivate removed buddy relationship
        const { data: updatedBuddy, error: updateError } = await supabase
          .from('buddies')
          .update({
            status: 'pending',
            rules_watching: body.rules_watching || null,
            invited_at: new Date().toISOString(),
            accepted_at: null,
          })
          .eq('id', existingBuddy.id)
          .select()
          .single();

        if (updateError || !updatedBuddy) {
          console.error('Error updating buddy relationship:', updateError);
          return NextResponse.json(
            { 
              error: { 
                code: 'DATABASE_ERROR', 
                message: 'Failed to update buddy relationship' 
              } 
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          buddy: updatedBuddy,
          invite_sent: true,
        }, { status: 200 });
      }

      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: `Buddy relationship already exists with status: ${existingBuddy.status}` 
          } 
        },
        { status: 400 }
      );
    }

    // Create new buddy relationship
    const { data: buddy, error: buddyError } = await supabase
      .from('buddies')
      .insert({
        user_id: user.id,
        buddy_user_id: buddyUser.id,
        rules_watching: body.rules_watching || null,
        status: 'pending',
      })
      .select()
      .single();

    if (buddyError || !buddy) {
      console.error('Error creating buddy relationship:', buddyError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to create buddy relationship',
            details: buddyError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Create notification for the invited buddy
    const { error: notifError } = await supabase
      .from('buddy_notifications')
      .insert({
        from_user_id: user.id,
        to_user_id: buddyUser.id,
        event_type: 'weekly_summary', // Using weekly_summary as generic invitation type
        message: `You have been invited to be an accountability buddy`,
        is_read: false,
      });

    if (notifError) {
      console.error('Error creating buddy invitation notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    // Return success response
    const response: BuddyInviteResponse = {
      buddy,
      invite_sent: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/buddy/invite:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
