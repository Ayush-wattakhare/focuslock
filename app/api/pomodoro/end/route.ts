// Pomodoro End Session API Route
// POST /api/pomodoro/end - Mark session as completed or abandoned

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface EndPomodoroRequest {
  session_id: string;
  status: 'completed' | 'abandoned';
}

// Response interface
interface EndPomodoroResponse {
  session: {
    id: string;
    user_id: string;
    task_label: string | null;
    work_minutes: number;
    break_minutes: number;
    sessions_target: number;
    sessions_done: number;
    status: 'active' | 'completed' | 'abandoned';
    started_at: string;
    ended_at: string | null;
  };
}

// POST /api/pomodoro/end - End a Pomodoro session
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
    const body: EndPomodoroRequest = await request.json();

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

    if (!body.status || !['completed', 'abandoned'].includes(body.status)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Status must be either "completed" or "abandoned"' 
          } 
        },
        { status: 400 }
      );
    }

    // Fetch current session to verify ownership
    const { data: currentSession, error: fetchError } = await supabase
      .from('pomodoro_sessions')
      .select()
      .eq('id', body.session_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentSession) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Pomodoro session not found' 
          } 
        },
        { status: 404 }
      );
    }

    // Check if session is already ended
    if (currentSession.status !== 'active') {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Session is already ended' 
          } 
        },
        { status: 400 }
      );
    }

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('pomodoro_sessions')
      .update({
        status: body.status,
        ended_at: new Date().toISOString(),
      })
      .eq('id', body.session_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedSession) {
      console.error('Error ending Pomodoro session:', updateError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to end Pomodoro session', 
            details: updateError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: EndPomodoroResponse = {
      session: updatedSession,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pomodoro/end:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
