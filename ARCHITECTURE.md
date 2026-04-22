# FocusLock Architecture

## Overview

FocusLock is built using Next.js 14 with the App Router, following a modern serverless architecture. The application is structured to support Progressive Web App (PWA) capabilities, browser extensions, and real-time features.

## Directory Structure

### `/app` - Next.js App Router

The app directory contains all routes and layouts using Next.js 14's App Router pattern.

- `(auth)/` - Route group for authentication pages (login, signup, callback)
- `(dashboard)/` - Route group for main application pages (dashboard, stats, settings)
- `api/` - API route handlers (serverless functions)
- `layout.tsx` - Root layout with global providers
- `page.tsx` - Landing page

### `/components` - React Components

Organized by purpose and reusability:

- `ui/` - Reusable UI components (buttons, inputs, modals, cards)
- `features/` - Feature-specific components (AppGrid, LockCard, MoodPrompt, etc.)
- `layouts/` - Layout components (headers, footers, sidebars)

### `/lib` - Business Logic & Utilities

Core application logic separated from UI:

- `core/` - Core business logic modules:
  - `lockEvaluator.ts` - Lock status evaluation algorithm
  - `streakManager.ts` - Streak calculation and updates
  - `badgeEngine.ts` - Badge award logic
  - `aiCoach.ts` - AI coaching integration
  - `notificationService.ts` - Notification handling
- `api/` - API client functions for frontend
- `hooks/` - Custom React hooks
- `utils/` - Utility functions (date formatting, timezone conversion, etc.)

### `/types` - TypeScript Definitions

Centralized type definitions for the entire application, ensuring type safety across frontend and backend.

### `/config` - Configuration Files

Application constants, environment-specific configs, and feature flags.

### `/public` - Static Assets

Images, icons, fonts, and other static files served directly.

## Key Design Patterns

### Server Components by Default

Following Next.js 14 best practices, we use Server Components by default for better performance and SEO. Client Components are used only when needed for interactivity.

### API Route Handlers

All backend logic is implemented as Next.js API routes, deployed as Vercel Edge Functions for low latency.

### Row-Level Security

Database access is secured using Supabase RLS policies, ensuring users can only access their own data.

### Real-time Updates

Supabase Realtime is used for buddy notifications and live updates without polling.

### Offline-First PWA

Service workers cache critical assets and lock rules for offline functionality.

## Data Flow

### Lock Evaluation Flow

1. User opens app → Dashboard loads
2. Fetch lock rules from Supabase
3. Fetch today's usage sessions
4. Run `lockEvaluator.evaluateLock()` for each rule
5. Render lock status UI

### Override Flow

1. User clicks locked app → Show countdown screen
2. User clicks override → Show mood prompt
3. User selects mood + reason → POST to `/api/override`
4. Log to `override_logs` table
5. Check buddy relationships → Fire Realtime notification
6. Reset streak if applicable
7. Return to dashboard

### Buddy Notification Flow

1. User A overrides lock → POST `/api/override`
2. Check `buddies` table for active relationships
3. Find buddies watching this rule
4. Create `buddy_notification` record
5. Supabase Realtime broadcasts to User B
6. User B sees notification in real-time

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: CSS Modules
- **Backend**: Next.js API Routes (Vercel Edge Functions)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel
- **Browser Extensions**: Chrome MV3, Firefox WebExtensions

## Development Workflow

1. **Local Development**: `npm run dev`
2. **Type Checking**: TypeScript compiler checks types on build
3. **Linting**: ESLint with Next.js config
4. **Formatting**: Prettier for consistent code style
5. **Building**: `npm run build` for production optimization
6. **Deployment**: Automatic deployment via Vercel on git push

## Security Considerations

- Environment variables for sensitive keys
- Row-level security policies in Supabase
- API routes validate user authentication
- CSRF protection via Supabase Auth
- Input validation on all forms
- XSS prevention via React's built-in escaping

## Performance Optimizations

- Server Components reduce client-side JavaScript
- Static generation for public pages
- Edge Functions for low-latency API responses
- Image optimization via Next.js Image component
- Code splitting and lazy loading
- Service worker caching for offline support

## Testing Strategy

- Unit tests for core business logic (`lockEvaluator`, `streakManager`, etc.)
- Integration tests for API routes
- End-to-end tests for critical user flows
- Property-based tests for lock evaluation edge cases

## Future Considerations

- Mobile apps (React Native)
- Desktop apps (Electron)
- Additional AI providers
- Advanced analytics dashboard
- Team/organization accounts
