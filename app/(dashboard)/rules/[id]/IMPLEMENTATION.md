# Edit Lock Rule Page Implementation

## Overview
This directory implements the edit lock rule page at `/rules/[id]`, allowing users to modify existing lock rules and delete them with confirmation.

## Requirements Coverage
**Requirements: 2.1-2.12**

### Requirement 2.1-2.9: Lock Rule Management
- ✅ Fetches existing rule data from API
- ✅ Renders RuleBuilder component with initial values
- ✅ Supports all lock types: timer, schedule, until_date, nuclear
- ✅ Validates lock-type-specific fields
- ✅ Configures visibility settings (hide_from_home, hide_from_search)
- ✅ Enables strict mode configuration

### Requirement 2.10: Update Lock Rules
- ✅ Handles form submission to PUT /api/rules/[id]
- ✅ Persists changes with updated timestamp
- ✅ Redirects to dashboard on success

### Requirement 2.11: Delete Lock Rules
- ✅ Includes delete button with confirmation dialog
- ✅ Shows rule name in confirmation message
- ✅ Requires explicit confirmation before DELETE request
- ✅ Handles DELETE to /api/rules/[id]
- ✅ Cascade behavior: sets override_logs.lock_rule_id to NULL

### Requirement 2.12: Row-Level Security
- ✅ Server component checks authentication
- ✅ Fetches rule with user_id filter
- ✅ Redirects to dashboard if rule not found or unauthorized
- ✅ API enforces user ownership on PUT and DELETE

## File Structure

```
app/(dashboard)/rules/[id]/
├── page.tsx              # Server component (auth check, data fetching)
├── EditRuleClient.tsx    # Client component (form, delete dialog)
└── IMPLEMENTATION.md     # This file
```

## Components

### page.tsx (Server Component)
**Purpose:** Protected route that fetches rule data and handles authentication

**Flow:**
1. Check user authentication via Supabase
2. Redirect to /login if not authenticated
3. Fetch lock rule by ID with user_id filter
4. Redirect to /dashboard if rule not found or unauthorized
5. Pass rule data to EditRuleClient

**Security:**
- Row-level security enforced via `.eq('user_id', user.id)`
- Prevents users from accessing other users' rules

### EditRuleClient.tsx (Client Component)
**Purpose:** Client-side form handling with RuleBuilder and delete functionality

**Features:**
1. **RuleBuilder Integration**
   - Passes initialRule prop to pre-populate form
   - Handles onSave callback for PUT request
   - Handles onCancel callback to return to dashboard

2. **Update Functionality**
   - Submits PUT request to `/api/rules/[id]`
   - Shows loading spinner during submission
   - Displays error messages on failure
   - Redirects to dashboard on success

3. **Delete Functionality**
   - Delete button below RuleBuilder
   - Confirmation dialog with rule name
   - Warning about permanent deletion
   - Submits DELETE request to `/api/rules/[id]`
   - Shows loading spinner during deletion
   - Redirects to dashboard on success

4. **Error Handling**
   - Displays error banner for API failures
   - Dismissible error messages
   - Prevents multiple simultaneous requests

5. **Loading States**
   - Full-screen overlay during submission
   - Full-screen overlay during deletion
   - Disabled buttons during operations

## Responsive Design

### Mobile (320px-767px)
- Single column layout
- Full-width form elements
- Touch-friendly buttons (min 44px height)
- Stacked modal actions

### Tablet (768px-1023px)
- Optimized spacing and typography
- Larger touch targets
- Enhanced visual hierarchy

### Desktop (1024px+)
- Centered layout with max-width constraint (800px)
- Larger text and spacing
- Hover effects on interactive elements

## Accessibility

### ARIA Support
- `role="dialog"` and `aria-modal="true"` on delete confirmation
- `aria-labelledby` linking dialog title
- `role="alert"` on error messages
- `role="status"` and `aria-live="polite"` on loading overlays

### Keyboard Navigation
- All interactive elements keyboard accessible
- Focus management in modal dialog
- Escape key support (browser default)

### Visual Accessibility
- High contrast mode support
- Reduced motion support
- Touch-friendly targets (44px minimum)
- Clear visual feedback for all states

## API Integration

### GET (Server-side)
```typescript
// Fetch rule in page.tsx
const { data: rule, error } = await supabase
  .from('lock_rules')
  .select('*')
  .eq('id', params.id)
  .eq('user_id', user.id)
  .single()
```

### PUT (Client-side)
```typescript
// Update rule in EditRuleClient
const response = await fetch(`/api/rules/${initialRule.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(rule),
})
```

### DELETE (Client-side)
```typescript
// Delete rule in EditRuleClient
const response = await fetch(`/api/rules/${initialRule.id}`, {
  method: 'DELETE',
})
```

## User Flow

1. **Navigate to Edit Page**
   - User clicks edit button on dashboard
   - Navigates to `/rules/[id]`

2. **Page Load**
   - Server checks authentication
   - Fetches rule data from database
   - Renders EditRuleClient with initial data

3. **Edit Rule**
   - User modifies form fields in RuleBuilder
   - Clicks "Update Rule" button
   - Loading overlay appears
   - PUT request sent to API
   - Redirects to dashboard on success

4. **Delete Rule**
   - User clicks "Delete Lock Rule" button
   - Confirmation dialog appears
   - User confirms deletion
   - Loading overlay appears
   - DELETE request sent to API
   - Redirects to dashboard on success

## Error Scenarios

### Authentication Errors
- Not logged in → Redirect to /login
- Session expired → Redirect to /login

### Authorization Errors
- Rule not found → Redirect to /dashboard
- Rule belongs to another user → Redirect to /dashboard

### Validation Errors
- Invalid form data → Display error banner
- API validation failure → Display error message

### Network Errors
- Request timeout → Display error banner
- Server error → Display error message

## Testing Considerations

### Manual Testing Checklist
- [ ] Can edit timer lock rule
- [ ] Can edit schedule lock rule
- [ ] Can edit until_date lock rule
- [ ] Can edit nuclear lock rule
- [ ] Can toggle visibility settings
- [ ] Can toggle strict mode
- [ ] Can delete rule with confirmation
- [ ] Cannot access other users' rules
- [ ] Redirects work correctly
- [ ] Error messages display properly
- [ ] Loading states work correctly
- [ ] Responsive design works on all breakpoints
- [ ] Keyboard navigation works
- [ ] Screen reader announces states correctly

### Edge Cases
- [ ] Editing rule while another user deletes it
- [ ] Network failure during submission
- [ ] Browser back button during submission
- [ ] Multiple rapid clicks on submit button
- [ ] Extremely long app names
- [ ] Special characters in app names

## Future Enhancements

1. **Optimistic Updates**
   - Update UI immediately before API response
   - Revert on error

2. **Undo Delete**
   - Soft delete with 30-second undo window
   - Toast notification with undo button

3. **Change History**
   - Track rule modifications
   - Show audit log of changes

4. **Bulk Operations**
   - Select multiple rules to delete
   - Batch update operations

5. **Duplicate Rule**
   - Clone existing rule with modifications
   - Quick setup for similar apps
