# Onboarding Flow Implementation

## Overview

This implementation provides a 3-step onboarding wizard for new users to quickly set up their first lock rule and learn about FocusLock's key features.

## Requirements Implemented

### Requirement 20.1: Display 3-step onboarding wizard
✅ **WHEN a new user completes authentication, THE FocusLock_System SHALL display a 3-step onboarding wizard**

New users are redirected to `/onboarding` from the auth callback route. The wizard displays three distinct steps with a progress indicator.

### Requirement 20.2: Guide user to add first lock rule
✅ **THE FocusLock_System SHALL guide the user to add their first lock rule in step 1**

Step 1 displays the RuleBuilder component with clear instructions to create the first lock rule. The rule is saved via POST /api/rules.

### Requirement 20.3: Explain mood prompt and override system
✅ **THE FocusLock_System SHALL explain the mood prompt and override system in step 2**

Step 2 displays four information cards explaining:
- Countdown screen behavior
- Mood prompt functionality
- Optional reason text
- Streak impact of overrides

### Requirement 20.4: Introduce streak and badge system
✅ **THE FocusLock_System SHALL introduce the streak and badge system in step 3**

Step 3 displays four information cards explaining:
- Streak building mechanics
- Badge earning system
- Quick Start badge opportunity
- Buddy system overview

### Requirement 20.5: Award quick_start badge
✅ **WHEN a user completes onboarding within 10 minutes, THE FocusLock_System SHALL award the 'quick_start' badge**

When the user clicks "Get Started" on step 3, the component calls POST /api/badges/check with eventType='onboarding_complete'. The badgeEngine evaluates if the user completed onboarding within 10 minutes of profile creation and awards the badge accordingly.

### Requirement 20.6: Allow skip functionality
✅ **THE FocusLock_System SHALL allow users to skip onboarding and access the dashboard directly**

A "Skip" button is displayed in the header throughout all steps. Clicking it redirects to /dashboard immediately.

## Implementation Details

### File Structure

```
app/(dashboard)/onboarding/
├── page.tsx                 # Server component - auth check and data fetching
├── OnboardingClient.tsx     # Client component - wizard UI and logic
└── IMPLEMENTATION.md        # This file
```

### Component Architecture

**page.tsx (Server Component)**
- Checks user authentication
- Fetches user profile
- Redirects to /login if not authenticated
- Passes user and profile data to OnboardingClient

**OnboardingClient.tsx (Client Component)**
- Manages wizard state (currentStep, isSubmitting, error)
- Renders 3 steps with progress indicator
- Handles rule creation via POST /api/rules
- Handles badge check via POST /api/badges/check
- Provides skip functionality

### API Integration

**POST /api/rules**
- Called in step 1 when user saves their first lock rule
- Request body: Partial<LockRule>
- Response: { rule: LockRule }

**POST /api/badges/check**
- Called when user completes step 3
- Request body: { eventType: 'onboarding_complete', context: {} }
- Response: { success: boolean }
- Triggers badgeEngine.checkAndAwardBadges()

### Badge Award Logic

The quick_start badge is awarded by the badgeEngine when:
1. eventType is 'onboarding_complete'
2. Time since profile creation ≤ 10 minutes

Calculation:
```typescript
const timeSinceCreation = Date.now() - new Date(profile.created_at).getTime();
return timeSinceCreation <= 10 * 60 * 1000; // 10 minutes
```

### User Flow

1. **New user completes authentication** → Redirected to /onboarding
2. **Step 1: Add first rule**
   - User fills out RuleBuilder form
   - Clicks "Save" → POST /api/rules
   - On success → Move to step 2
3. **Step 2: Learn about overrides**
   - User reads information cards
   - Clicks "Next" → Move to step 3
4. **Step 3: Learn about gamification**
   - User reads information cards
   - Clicks "Get Started" → POST /api/badges/check
   - Redirect to /dashboard
5. **Skip option available at any step** → Redirect to /dashboard

### Responsive Design

**Mobile (320px-767px)**
- Single column layout
- Full-width cards
- Stacked progress indicator
- Touch-friendly buttons (min 44px)

**Tablet (768px+)**
- 2-column grid for info cards
- Larger typography
- Wider progress indicator

**Desktop (1024px+)**
- Max-width constraint (900px)
- Optimized spacing
- Enhanced hover effects

### Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management
- Error announcements with role="alert"
- Reduced motion support
- High contrast mode support

### Error Handling

- Network errors during rule creation displayed in error banner
- Badge check failures logged but don't block completion
- User always redirected to dashboard on completion
- Skip button provides escape hatch at any point

## Testing Considerations

### Unit Tests
- Test step navigation (forward, backward)
- Test skip functionality
- Test rule creation success/error handling
- Test badge check API call

### Integration Tests
- Test complete onboarding flow (all 3 steps)
- Test quick_start badge award (within 10 minutes)
- Test quick_start badge not awarded (after 10 minutes)
- Test skip functionality from each step

### E2E Tests
- Test new user onboarding flow end-to-end
- Test rule creation in step 1
- Test navigation between steps
- Test completion and redirect to dashboard
- Test skip button functionality

## Future Enhancements

- Add animations between steps
- Add tooltips for additional guidance
- Add video tutorials for each step
- Add progress persistence (resume if user leaves)
- Add onboarding analytics tracking
- Add A/B testing for different onboarding flows
