// Authentication Helper Functions
// Utility functions for auth operations

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { authConfig } from '@/config/auth'

/**
 * Sign in with magic link (server-side)
 */
export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}${authConfig.callbackUrl}`,
    },
  })
  
  return { data, error }
}

/**
 * Sign in with Google OAuth (client-side)
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}${authConfig.callbackUrl}`,
      scopes: authConfig.providers.google.scopes,
    },
  })
  
  return { data, error }
}

/**
 * Sign out (works on both client and server)
 */
export async function signOut(isServer = false) {
  if (isServer) {
    const supabase = await createServerClient()
    return await supabase.auth.signOut()
  } else {
    const supabase = createBrowserClient()
    return await supabase.auth.signOut()
  }
}

/**
 * Get current user (server-side)
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  return { user, error }
}

/**
 * Get current session (server-side)
 */
export async function getCurrentSession() {
  const supabase = await createServerClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  return { session, error }
}

/**
 * Check if user is authenticated (server-side)
 */
export async function isAuthenticated() {
  const { user } = await getCurrentUser()
  return !!user
}

/**
 * Get or create user profile
 */
export async function getOrCreateProfile(userId: string, userData?: {
  full_name?: string | null
  avatar_url?: string | null
}) {
  const supabase = await createServerClient()
  
  // Try to get existing profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  
  if (profile) {
    return { profile, error: null }
  }
  
  // Create new profile if it doesn't exist
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      id: userId,
      full_name: userData?.full_name || null,
      avatar_url: userData?.avatar_url || null,
      timezone: 'Asia/Kolkata',
    } as any)
    .select()
    .single()
  
  return { profile: newProfile, error: createError }
}
