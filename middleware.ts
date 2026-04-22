// Next.js Middleware for Supabase Auth
// This middleware refreshes the user's session automatically and protects routes

import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { authConfig } from '@/config/auth'

export async function middleware(request: NextRequest) {
  // First, update the session
  const response = await updateSession(request)
  
  // Check if the route requires authentication
  const isProtectedRoute = authConfig.protectedRoutes.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  // Check if the route is public-only (should redirect if authenticated)
  const isPublicOnlyRoute = authConfig.publicOnlyRoutes.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  
  // Create a Supabase client to check auth status
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // Redirect authenticated users from public-only routes
  if (isPublicOnlyRoute && user) {
    return NextResponse.redirect(new URL(authConfig.defaultLoginRedirect, request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
