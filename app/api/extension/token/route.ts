import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/extension/token
 * Generate an API token for browser extension authentication
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Generate a secure token (using user's session token)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: { code: 'SESSION_ERROR', message: 'Failed to get session' } },
        { status: 500 }
      );
    }

    // Return the access token for extension use
    return NextResponse.json({
      token: session.access_token,
      expiresAt: session.expires_at,
      userId: user.id,
    });
  } catch (error) {
    console.error('Failed to generate extension token:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate token',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/extension/token
 * Get current API token (same as POST for convenience)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
