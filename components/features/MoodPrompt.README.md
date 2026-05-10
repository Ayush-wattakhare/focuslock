# MoodPrompt Component

## Overview

The MoodPrompt component is a modal dialog that provides a friction layer before allowing users to override lock rules. It requires users to select their emotional state and optionally provide a text reason for the override.

## Features

- **Mood Selection**: Five mood options (bored, stressed, tired, news, other) with emoji icons
- **Optional Reason Text**: Textarea for users to provide additional context
- **Strict Mode Validation**: Enforces minimum 10 characters for strict mode rules
- **Accessible**: Full keyboard navigation and ARIA labels
- **Responsive**: Adapts to mobile, tablet, and desktop screens
- **Animated**: Smooth slide-up animation on mount

## Requirements

This component validates the following requirements:

- **4.1**: Display mood prompt before allowing override
- **4.2**: Provide mood options: bored, stressed, tired, news, other
- **4.3**: Allow optional text reason for override
- **4.4**: Log override with mood and reason
- **17.1**: Display text input prompt for strict mode rules
- **17.2**: Require minimum 10 characters for strict mode
- **17.3**: Save reason text to override log
- **17.4**: AI Coach references recurring intention reasons

## Props

```typescript
interface MoodPromptProps {
  onSubmit: (mood: Mood, reason: string) => void;
  isStrictMode: boolean;
  onCancel?: () => void;
}
```

### `onSubmit`
- **Type**: `(mood: Mood, reason: string) => void`
- **Required**: Yes
- **Description**: Callback function called when user submits the mood prompt. Receives the selected mood and reason text.

### `isStrictMode`
- **Type**: `boolean`
- **Required**: Yes
- **Description**: When true, enforces minimum 10 characters for reason text and changes UI messaging to be more intentional.

### `onCancel`
- **Type**: `() => void`
- **Required**: No
- **Description**: Optional callback function called when user cancels the prompt. If not provided, cancel button is hidden.

## Usage

### Basic Usage

```tsx
import MoodPrompt from '@/components/features/MoodPrompt';

function OverrideFlow() {
  const [showPrompt, setShowPrompt] = useState(false);

  const handleSubmit = (mood: Mood, reason: string) => {
    // Log override with mood and reason
    console.log('Override:', { mood, reason });
    setShowPrompt(false);
  };

  return (
    <>
      <button onClick={() => setShowPrompt(true)}>
        Override Lock
      </button>
      
      {showPrompt && (
        <MoodPrompt
          onSubmit={handleSubmit}
          isStrictMode={false}
        />
      )}
    </>
  );
}
```

### Strict Mode Usage

```tsx
import MoodPrompt from '@/components/features/MoodPrompt';

function StrictOverrideFlow() {
  const [showPrompt, setShowPrompt] = useState(false);

  const handleSubmit = (mood: Mood, reason: string) => {
    // Reason text is guaranteed to be at least 10 characters
    logOverride({ mood, reason });
    setShowPrompt(false);
  };

  const handleCancel = () => {
    setShowPrompt(false);
  };

  return (
    <>
      <button onClick={() => setShowPrompt(true)}>
        Override Strict Lock
      </button>
      
      {showPrompt && (
        <MoodPrompt
          onSubmit={handleSubmit}
          isStrictMode={true}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
```

### With API Integration

```tsx
import MoodPrompt from '@/components/features/MoodPrompt';
import { useState } from 'react';

function OverrideWithAPI() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (mood: Mood, reason: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lock_rule_id: 'rule-123',
          app_name: 'Instagram',
          mood,
          reason_text: reason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Override logged:', data);
        setShowPrompt(false);
      } else {
        console.error('Failed to log override');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowPrompt(true)}>
        Override Lock
      </button>
      
      {showPrompt && (
        <MoodPrompt
          onSubmit={handleSubmit}
          isStrictMode={false}
          onCancel={() => setShowPrompt(false)}
        />
      )}
    </>
  );
}
```

## Mood Options

The component provides five mood options:

| Mood | Label | Emoji | Description |
|------|-------|-------|-------------|
| `bored` | Bored | 😐 | Feeling bored or restless |
| `stressed` | Stressed | 😰 | Feeling stressed or anxious |
| `tired` | Tired | 😴 | Feeling tired or exhausted |
| `news` | News | 📰 | Need to check news or updates |
| `other` | Other | 🤔 | Other reason |

## Validation

### Normal Mode
- Mood selection is required
- Reason text is optional

### Strict Mode
- Mood selection is required
- Reason text is required with minimum 10 characters
- Character count is displayed below textarea
- Submit button is disabled until mood is selected

## Accessibility

- **Keyboard Navigation**: Full support for Tab, Enter, and Escape keys
- **ARIA Labels**: All interactive elements have descriptive labels
- **Focus Management**: Proper focus indicators on all buttons and inputs
- **Screen Reader Support**: Modal dialog with proper role and aria-modal attributes
- **Error Announcements**: Validation errors are announced to screen readers

## Styling

The component uses scoped CSS-in-JS (styled-jsx) for styling. Key design features:

- **Modal Overlay**: Semi-transparent backdrop with blur effect
- **Slide-up Animation**: Smooth entrance animation
- **Mood Buttons**: Grid layout with hover and selected states
- **Responsive Grid**: Adapts from 5 columns (desktop) to 2 columns (mobile)
- **Color Scheme**: Blue accent color (#4a90e2) for primary actions

## Responsive Breakpoints

- **Desktop** (>768px): 5-column mood grid, full padding
- **Tablet** (≤768px): 3-column mood grid, reduced padding
- **Mobile** (≤480px): 2-column mood grid, stacked action buttons

## Design Rationale

### Friction-First UX
The MoodPrompt component implements a "friction-first" design philosophy:

1. **Intentional Delay**: Forces users to pause and reflect before overriding
2. **Emotional Awareness**: Mood selection helps users recognize patterns
3. **Reason Articulation**: Writing reasons increases mindfulness
4. **Strict Mode**: For critical locks, requires deeper reflection (10+ characters)

### Data Collection for AI Insights
The mood and reason data collected by this component powers the AI Coach feature:

- **Mood Patterns**: Identifies emotional triggers (e.g., "You tend to override when stressed")
- **Time Patterns**: Combined with timestamp data to find time-of-day patterns
- **App Patterns**: Identifies which apps are overridden most frequently
- **Reason Analysis**: AI Coach references recurring reasons in weekly insights

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MoodPrompt from './MoodPrompt';

describe('MoodPrompt', () => {
  it('should render mood options', () => {
    render(<MoodPrompt onSubmit={jest.fn()} isStrictMode={false} />);
    expect(screen.getByText('Bored')).toBeInTheDocument();
    expect(screen.getByText('Stressed')).toBeInTheDocument();
  });

  it('should require mood selection', () => {
    const onSubmit = jest.fn();
    render(<MoodPrompt onSubmit={onSubmit} isStrictMode={false} />);
    
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Please select a mood')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should enforce 10 character minimum in strict mode', () => {
    const onSubmit = jest.fn();
    render(<MoodPrompt onSubmit={onSubmit} isStrictMode={true} />);
    
    fireEvent.click(screen.getByText('Bored'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Short' } });
    fireEvent.click(screen.getByText('Continue'));
    
    expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with mood and reason', () => {
    const onSubmit = jest.fn();
    render(<MoodPrompt onSubmit={onSubmit} isStrictMode={false} />);
    
    fireEvent.click(screen.getByText('Stressed'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Need to check messages' } });
    fireEvent.click(screen.getByText('Continue'));
    
    expect(onSubmit).toHaveBeenCalledWith('stressed', 'Need to check messages');
  });
});
```

## Related Components

- **LockCard**: Displays locked apps that trigger the MoodPrompt
- **CountdownRing**: Shows time remaining before unlock
- **AIInsightCard**: Displays insights based on mood data collected by this component

## Future Enhancements

- [ ] Add custom mood options
- [ ] Support for voice input for reason text
- [ ] Mood history visualization
- [ ] Quick reason templates (e.g., "Emergency", "Work-related")
- [ ] Haptic feedback on mobile devices
- [ ] Dark mode support
