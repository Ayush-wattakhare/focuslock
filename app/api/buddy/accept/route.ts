// Buddy Accept API Route
// POST /api/buddy/accept - Accept buddy invitation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface BuddyAcceptRequest {
  buddy_id: string; // ID of the buddy relationship to accept
}

// Response interface
interface BuddyAcceptResponse {
  buddy: {
    id: string;
    user_id: string;
    buddy_user_id: string;
    rules_watching: string[] | null;
    status: 'pending' | 'active' | 'removed';
    invited_at: string;
    accepted_at: string | null;
  };
  accepted: boolean;
}

// POST /api/buddy/accept - Accept a pending buddy invitation
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
    const body: BuddyAcceptRequest = await request.json();

    // Validate required fields
    if (!body.buddy_id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required field: buddy_id' 
          } 
        },
        { status: 400 }
      );
    }

    // Find the buddy relationship
    const { data: buddyRelationship, error: findError } = await supabase
      .from('buddies')
      .select('*')
      .eq('id', body.buddy_id)
      .eq('buddy_user_id', user.id) // Must be the invited user
      .single();

    if (findError || !buddyRelationship) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Buddy invitation not found or you are not the invited user' 
          } 
        },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (buddyRelationship.status === 'active') {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Buddy invitation already accepted' 
          } 
        },
        { status: 400 }
      );
    }

    // Check if removed
    if (buddyRelationship.status === 'removed') {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Buddy relationship has been removed' 
          } 
        },
        { status: 400 }
      );
    }

    // Update buddy relationship to active
    const { data: updatedBuddy, error: updateError } = await supabase
      .from('buddies')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', body.buddy_id)
      .select()
      .single();

    if (updateError || !updatedBuddy) {
      console.error('Error accepting buddy invitation:', updateError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to accept buddy invitation',
            details: updateError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Create notification for the inviter
    const { error: notifError } = await supabase
      .from('buddy_notifications')
      .insert({
        from_user_id: user.id,
        to_user_id: buddyRelationship.user_id,
        event_type: 'weekly_summary', // Using weekly_summary as generic acceptance type
        message: `Your buddy invitation has been accepted`,
        is_read: false,
      });

    if (notifError) {
      console.error('Error creating acceptance notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    // Return success response
    const response: BuddyAcceptResponse = {
      buddy: updatedBuddy,
      accepted: true,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/buddy/accept:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
