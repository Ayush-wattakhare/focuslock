// Badge Check API Route
// Checks and awards badges based on event type
// Requirements: 7.3, 20.5

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkAndAwardBadges, type BadgeEventType, type BadgeContext } from '@/lib/core/badgeEngine'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { eventType, context = {} } = body as { 
      eventType: BadgeEventType; 
      context?: BadgeContext 
    }

    if (!eventType) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'eventType is required' } },
        { status: 400 }
      )
    }

    // Check and award badges
    await checkAndAwardBadges(user.id, eventType, context)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error checking badges:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to check badges' } },
      { status: 500 }
    )
  }
}
