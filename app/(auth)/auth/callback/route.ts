// Auth Callback Route
// Handles Supabase authentication callback for magic link and OAuth

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        
        let isNewUser = false
        
        // Create profile if it doesn't exist (Requirement 1.3)
        if (!profile) {
          isNewUser = true
          
          // Create profile with default timezone (Requirement 1.4)
          const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
            id: user.id,
            full_name: user.user_metadata.full_name || user.user_metadata.name || null,
            avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
            timezone: 'Asia/Kolkata',
          }
          
          await supabase.from('profiles').insert(profileInsert)
          
          // Initialize streak record for new user (Requirement 6.1)
          await supabase.from('streaks').insert({
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            last_active_date: null,
          })
        }
      
        // Redirect logic:
        // - If 'next' param provided, use it
        // - If new user, redirect to onboarding (Requirement 20.1)
        // - Otherwise, redirect to dashboard
        const redirectUrl = next || (isNewUser ? '/onboarding' : '/dashboard')
        return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-error', requestUrl.origin))
}
