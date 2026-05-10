// Pomodoro Complete Block API Route
// POST /api/pomodoro/complete-block - Increment sessions_done counter

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface CompleteBlockRequest {
  session_id: string;
}

// Response interface
interface CompleteBlockResponse {
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
  completed: boolean;
}

// POST /api/pomodoro/complete-block - Increment sessions_done
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
    const body: CompleteBlockRequest = await request.json();

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

    // Fetch current session
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

    // Check if session is active
    if (currentSession.status !== 'active') {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Cannot complete block for non-active session' 
          } 
        },
        { status: 400 }
      );
    }

    // Increment sessions_done
    const newSessionsDone = currentSession.sessions_done + 1;
    const isCompleted = newSessionsDone >= currentSession.sessions_target;

    // Update session
    const updateData: {
      sessions_done: number;
      status?: 'completed';
      ended_at?: string;
    } = {
      sessions_done: newSessionsDone,
    };

    // If target reached, mark as completed
    if (isCompleted) {
      updateData.status = 'completed';
      updateData.ended_at = new Date().toISOString();
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('pomodoro_sessions')
      .update(updateData)
      .eq('id', body.session_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedSession) {
      console.error('Error updating Pomodoro session:', updateError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to complete block', 
            details: updateError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: CompleteBlockResponse = {
      session: updatedSession,
      completed: isCompleted,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pomodoro/complete-block:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
