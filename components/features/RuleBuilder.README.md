# RuleBuilder Component

## Overview

The RuleBuilder component is a multi-step form wizard for creating and editing lock rules in the FocusLock application. It provides a user-friendly interface with dynamic fields that adapt based on the selected lock type, comprehensive validation, and advanced configuration options.

## Features

- **Multi-step wizard**: 3-step process (Basic Info → Lock Configuration → Advanced Options)
- **Dynamic fields**: Form fields change based on selected lock type
- **Comprehensive validation**: Real-time validation for all inputs
- **Responsive design**: Works seamlessly on desktop, tablet, and mobile
- **Accessible**: Full keyboard navigation and ARIA labels
- **Visual feedback**: Step indicators, error messages, and hover states

## Requirements Coverage

This component implements Requirements 2.1-2.12:

- **2.1**: Requires app name and lock type
- **2.2**: Supports four lock types (timer, schedule, until_date, nuclear)
- **2.3**: Timer requires daily limit in minutes
- **2.4**: Schedule requires start time, end time, and days of week
- **2.5**: Until_date requires unlock date
- **2.6**: Nuclear mode disables all override capabilities
- **2.7**: Configure hide_from_home setting
- **2.8**: Configure hide_from_search setting
- **2.9**: Enable strict mode on individual rules
- **2.10**: Persists changes with updated timestamp (handled by parent)
- **2.11**: Delete rule functionality (handled by parent)
- **2.12**: Row-level security enforcement (handled by API)

## Props

```typescript
interface RuleBuilderProps {
  initialRule?: LockRule;  // Optional: for editing existing rules
  onSave: (rule: Partial<LockRule>) => void;  // Callback when form is submitted
  onCancel?: () => void;  // Optional: callback when user cancels
}
```

## Usage

### Creating a New Rule

```tsx
import RuleBuilder from '@/components/features/RuleBuilder';

function CreateRulePage() {
  const handleSave = async (rule: Partial<LockRule>) => {
    // Call API to create rule
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    
    if (response.ok) {
      // Navigate to dashboard or show success message
      router.push('/dashboard');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <RuleBuilder 
      onSave={handleSave} 
      onCancel={handleCancel}
    />
  );
}
```

### Editing an Existing Rule

```tsx
import RuleBuilder from '@/components/features/RuleBuilder';

function EditRulePage({ ruleId }: { ruleId: string }) {
  const [rule, setRule] = useState<LockRule | null>(null);

  useEffect(() => {
    // Fetch existing rule
    fetch(`/api/rules/${ruleId}`)
      .then(res => res.json())
      .then(data => setRule(data.rule));
  }, [ruleId]);

  const handleSave = async (updatedRule: Partial<LockRule>) => {
    // Call API to update rule
    const response = await fetch(`/api/rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRule),
    });
    
    if (response.ok) {
      router.push('/dashboard');
    }
  };

  if (!rule) return <div>Loading...</div>;

  return (
    <RuleBuilder 
      initialRule={rule}
      onSave={handleSave} 
      onCancel={() => router.push('/dashboard')}
    />
  );
}
```

## Form Steps

### Step 1: Basic Information

- **App Name** (required): Name of the app to lock
- **App Icon URL** (optional): URL to the app's icon image
- **App URL Scheme** (optional): Deep link scheme (e.g., `instagram://`)
- **Lock Type** (required): Choose from timer, schedule, until_date, or nuclear

### Step 2: Lock Configuration

Dynamic fields based on selected lock type:

#### Timer Lock
- **Daily Limit** (required): Minutes allowed per day (1-1440)

#### Schedule Lock
- **Start Time** (required): When the lock begins (HH:MM format)
- **End Time** (required): When the lock ends (HH:MM format)
- **Days** (required): Days of the week when lock is active

#### Until Date Lock
- **Unlock Date** (required): Date when the lock expires (must be future date)

#### Nuclear Mode
- Warning message explaining that no override is possible

### Step 3: Advanced Options

- **Hide from Home**: Don't show app on dashboard (lock still applies)
- **Hide from Search**: Don't show app in search results
- **Strict Mode**: Require written explanation (min 10 chars) before override
- **Rule Summary**: Review all configured settings

## Validation Rules

### App Name
- Required field
- Cannot be empty or whitespace only

### Lock Type
- Required field
- Must be one of: timer, schedule, until_date, nuclear

### Timer Lock
- Daily limit must be greater than 0
- Daily limit cannot exceed 1440 minutes (24 hours)

### Schedule Lock
- Start time is required
- End time is required
- End time must be after start time
- At least one day must be selected

### Until Date Lock
- Unlock date is required
- Unlock date must be in the future

## Styling

The component uses scoped CSS-in-JS (styled-jsx) for styling. Key design features:

- **Color scheme**: Primary blue (#4a90e2), error red (#f44336)
- **Spacing**: Consistent 8px grid system
- **Typography**: System font stack with clear hierarchy
- **Animations**: Smooth transitions and fade-in effects
- **Responsive breakpoints**: 768px (tablet), 480px (mobile)

## Accessibility

- Full keyboard navigation support
- ARIA labels and roles for screen readers
- Focus indicators on all interactive elements
- Error messages linked to form fields via `aria-describedby`
- Required fields marked with `aria-required`
- Invalid fields marked with `aria-invalid`

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

See `components/features/__tests__/RuleBuilder.test.ts` for unit tests covering:

- Form validation
- Step navigation
- Lock type switching
- Field visibility based on lock type
- Submit behavior
- Cancel behavior

## Related Components

- **LockCard**: Displays individual lock rules
- **AppGrid**: Shows all apps with lock status
- **MoodPrompt**: Handles override flow with mood tracking

## API Integration

The component outputs a `Partial<LockRule>` object that should be sent to:

- **POST /api/rules**: Create new rule
- **PUT /api/rules/[id]**: Update existing rule

The API handles:
- User authentication
- Row-level security
- Database persistence
- Timestamp management
