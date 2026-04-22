// Sign Out Route
// Handles user sign out

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { authConfig } from '@/config/auth'

export async function POST() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  return NextResponse.redirect(new URL(authConfig.defaultLogoutRedirect, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}
