// Authentication Configuration
// Centralized auth settings for FocusLock

export const authConfig = {
  // Routes that require authentication (EMPTY - login is optional)
  // Users can access all features without login
  // Data will be stored locally and can be synced when they sign in
  protectedRoutes: [
    // No protected routes - all features available without login
  ],
  
  // Routes that should redirect to dashboard if already authenticated
  publicOnlyRoutes: [
    '/login',
    '/signup',
  ],
  
  // Default redirect after login
  defaultLoginRedirect: '/dashboard',
  
  // Default redirect after logout
  defaultLogoutRedirect: '/',
  
  // Auth callback URL
  callbackUrl: '/auth/callback',
  
  // Auth error URL
  errorUrl: '/auth/auth-error',
  
  // OAuth providers
  providers: {
    google: {
      enabled: true,
      scopes: 'email profile',
    },
  },
  
  // Magic link settings
  magicLink: {
    enabled: true,
    emailRedirectTo: undefined, // Will use callbackUrl by default
  },
  
  // Session settings
  session: {
    // JWT expiry in seconds (1 hour)
    jwtExpiry: 3600,
    // Refresh token rotation enabled
    refreshTokenRotation: true,
  },
}

export type AuthConfig = typeof authConfig
