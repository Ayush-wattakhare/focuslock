// Usage Session Start API Route
// POST /api/usage/start - Start a new usage session

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UsageSessionInsert } from '@/types/database';

// Request body interface
interface StartSessionRequest {
  app_name: string;
}

// Response interface
interface StartSessionResponse {
  session: {
    id: string;
    user_id: string;
    app_name: string;
    session_start: string;
    session_end: string | null;
    minutes_used: number | null;
    date: string;
    created_at: string;
  };
}

// POST /api/usage/start - Start a new usage session
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
    const body: StartSessionRequest = await request.json();

    // Validate required fields
    if (!body.app_name) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required field: app_name' 
          } 
        },
        { status: 400 }
      );
    }

    // Create usage session
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const sessionData: UsageSessionInsert = {
      user_id: user.id,
      app_name: body.app_name,
      session_start: now,
      date: today,
    };

    const { data: session, error } = await supabase
      .from('usage_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error || !session) {
      console.error('Error creating usage session:', error);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to start usage session', 
            details: error?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: StartSessionResponse = {
      session,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/usage/start:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
