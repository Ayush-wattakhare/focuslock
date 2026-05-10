// Usage Session End API Route
// POST /api/usage/end - End a usage session and calculate duration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface EndSessionRequest {
  session_id: string;
}

// Response interface
interface EndSessionResponse {
  session: {
    id: string;
    user_id: string;
    app_name: string;
    session_start: string;
    session_end: string;
    minutes_used: number;
    date: string;
    created_at: string;
  };
}

// POST /api/usage/end - End a usage session and calculate duration
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
    const body: EndSessionRequest = await request.json();

    // Validate required fields
    if (!body.session_id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required field: session_id' 
          } 
        },
        { status: 400 }
      );
    }

    // Fetch the session to verify it belongs to the user and hasn't ended yet
    const { data: existingSession, error: fetchError } = await supabase
      .from('usage_sessions')
      .select('*')
      .eq('id', body.session_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSession) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Usage session not found or does not belong to user' 
          } 
        },
        { status: 404 }
      );
    }

    // Check if session has already ended
    if (existingSession.session_end) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Usage session has already ended' 
          } 
        },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const now = new Date();
    const sessionStart = new Date(existingSession.session_start);
    const durationMs = now.getTime() - sessionStart.getTime();
    const minutesUsed = Math.round(durationMs / (1000 * 60)); // Convert to minutes

    // Update the session with end time and duration
    const { data: session, error: updateError } = await supabase
      .from('usage_sessions')
      .update({
        session_end: now.toISOString(),
        minutes_used: minutesUsed,
      })
      .eq('id', body.session_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !session) {
      console.error('Error ending usage session:', updateError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to end usage session', 
            details: updateError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: EndSessionResponse = {
      session,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/usage/end:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
