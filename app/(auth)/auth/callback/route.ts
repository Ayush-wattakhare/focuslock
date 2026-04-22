// Auth Callback Route
// Handles Supabase authentication callback for magic link and OAuth

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

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
        
        // Create profile if it doesn't exist
        if (!profile) {
          await supabase
            .from('profiles')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({
              id: user.id,
              full_name: user.user_metadata.full_name || user.user_metadata.name || null,
              avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
              timezone: 'Asia/Kolkata',
            } as any)
        }
      }
      
      // Redirect to the next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-error', requestUrl.origin))
}
