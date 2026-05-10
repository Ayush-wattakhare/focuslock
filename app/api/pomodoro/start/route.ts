// Pomodoro Session Start API Route
// POST /api/pomodoro/start - Start a new Pomodoro session

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PomodoroSessionInsert } from '@/types/database';

// Request body interface
interface StartPomodoroRequest {
  task_label?: string;
  work_minutes?: number;
  break_minutes?: number;
  sessions_target?: number;
}

// Response interface
interface StartPomodoroResponse {
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

// POST /api/pomodoro/start - Start a new Pomodoro session
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

    // Parse request body
    const body: StartPomodoroRequest = await request.json();

    // Create Pomodoro session with defaults
    const sessionData: PomodoroSessionInsert = {
      user_id: user.id,
      task_label: body.task_label || null,
      work_minutes: body.work_minutes || 25,
      break_minutes: body.break_minutes || 5,
      sessions_target: body.sessions_target || 4,
      sessions_done: 0,
      status: 'active',
      started_at: new Date().toISOString(),
    };

    const { data: session, error } = await supabase
      .from('pomodoro_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error || !session) {
      console.error('Error creating Pomodoro session:', error);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to start Pomodoro session', 
            details: error?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: StartPomodoroResponse = {
      session,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pomodoro/start:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
