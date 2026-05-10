# PomodoroTimer Component

## Overview

The `PomodoroTimer` component provides a visual timer for Pomodoro focus sessions with work/break cycles. It displays a circular progress ring, session counter, and controls for managing the session.

## Features

- **Visual Ring**: SVG-based circular progress indicator showing work/break progress
- **Session Counter**: Displays current session number and progress dots (e.g., "Session 2 of 4")
- **Timer Display**: Shows remaining time in MM:SS format
- **Block Types**: Alternates between work blocks (apps locked) and break blocks (apps unlocked)
- **Controls**: Pause/resume and abandon buttons
- **Auto-progression**: Automatically switches between work and break blocks
- **Session Completion**: Automatically marks session as completed when target is reached
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens

## Requirements Validation

**Validates Requirements: 8.1-8.7**

- ✅ 8.1: Records Pomodoro session with task label, work/break minutes, sessions target
- ✅ 8.2: Defaults to 25 minutes work and 5 minutes break
- ✅ 8.3: Keeps locked apps locked during work blocks
- ✅ 8.4: Temporarily unlocks apps during break blocks
- ✅ 8.5: Increments sessions_done counter on work block completion
- ✅ 8.6: Marks session as completed when sessions_done reaches target
- ✅ 8.7: Allows user to abandon session (marks as abandoned)

## Props

```typescript
interface PomodoroTimerProps {
  session: PomodoroSession;      // Active Pomodoro session data
  onComplete: () => void;         // Callback when all sessions completed
  onAbandon?: () => void;         // Optional callback when session abandoned
}
```

### PomodoroSession Type

```typescript
interface PomodoroSession {
  id: string;
  user_id: string;
  task_label: string | null;
  work_minutes: number;           // Default: 25
  break_minutes: number;          // Default: 5
  sessions_target: number;        // Default: 4
  sessions_done: number;
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
}
```

## Usage

### Basic Usage

```tsx
import PomodoroTimer from '@/components/features/PomodoroTimer';

function FocusPage() {
  const [session, setSession] = useState<PomodoroSession | null>(null);

  const handleComplete = () => {
    console.log('Pomodoro session completed!');
    // Navigate to completion screen or show success message
  };

  const handleAbandon = () => {
    console.log('Session abandoned');
    // Navigate back to dashboard
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <PomodoroTimer
      session={session}
      onComplete={handleComplete}
      onAbandon={handleAbandon}
    />
  );
}
```

### Starting a New Session

```tsx
async function startPomodoroSession() {
  const response = await fetch('/api/pomodoro/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_label: 'Write documentation',
      work_minutes: 25,
      break_minutes: 5,
      sessions_target: 4,
    }),
  });

  const data = await response.json();
  setSession(data.session);
}
```

## Component Behavior

### Work/Break Cycle

1. **Work Block** (default 25 minutes):
   - Timer counts down from work_minutes
   - Progress ring fills up (red color)
   - Apps remain locked
   - Status message: "Apps are locked during focus time"

2. **Work Block Completion**:
   - Calls `/api/pomodoro/complete-block` to increment sessions_done
   - If sessions_done < sessions_target: switches to break block
   - If sessions_done >= sessions_target: calls onComplete callback

3. **Break Block** (default 5 minutes):
   - Timer counts down from break_minutes
   - Progress ring fills up (green color)
   - Apps are temporarily unlocked
   - Status message: "Apps are unlocked during break time"

4. **Break Block Completion**:
   - Switches back to work block
   - Resets timer to work_minutes

### Pause/Resume

- Clicking "Pause" stops the countdown timer
- Displays a pause indicator overlay on the ring
- Clicking "Resume" continues the countdown from where it left off
- Pause state is local (not persisted to database)

### Abandon Session

- Clicking "Abandon" shows a confirmation dialog
- If confirmed, calls `/api/pomodoro/end` with status 'abandoned'
- Calls onAbandon callback if provided
- Session is marked as abandoned in database

## Visual Design

### Timer Ring

- **Size**: 280px diameter (responsive)
- **Stroke Width**: 16px
- **Colors**:
  - Work block: `#ff6b6b` (red)
  - Break block: `#51cf66` (green)
  - Background: `#e9ecef` (light gray)

### Session Counter

- Displays "Session X of Y" text
- Shows progress dots below:
  - Completed sessions: green with glow
  - Active session: red with pulse animation
  - Remaining sessions: gray

### Controls

- **Pause/Resume Button**: Blue background, white text
- **Abandon Button**: Light gray background, gray text
- Both buttons have hover effects and focus outlines

## API Integration

### Complete Work Block

```typescript
POST /api/pomodoro/complete-block
{
  "session_id": "uuid"
}

Response:
{
  "session": PomodoroSession,
  "completed": boolean
}
```

### End Session

```typescript
POST /api/pomodoro/end
{
  "session_id": "uuid",
  "status": "abandoned"
}

Response:
{
  "session": PomodoroSession
}
```

## Accessibility

- **ARIA Labels**: Timer ring has descriptive aria-label with current time
- **Keyboard Navigation**: All buttons are keyboard accessible
- **Focus Indicators**: Clear focus outlines on interactive elements
- **Semantic HTML**: Proper button elements with descriptive labels

## Responsive Breakpoints

- **Desktop** (>768px): Full size (280px ring, 56px time font)
- **Tablet** (768px): Medium size (48px time font)
- **Mobile** (<480px): Compact size (40px time font, stacked controls)

## Testing Considerations

### Unit Tests

- Timer countdown logic
- Block type switching (work → break → work)
- Progress calculation
- Time formatting (MM:SS)

### Integration Tests

- API calls to complete-block endpoint
- API calls to end endpoint
- Session completion flow
- Abandon flow with confirmation

### Property-Based Tests

- Timer countdown never goes negative
- Progress percentage always between 0-100
- Sessions_done never exceeds sessions_target

## Performance

- Uses `setInterval` for countdown (1 second intervals)
- Cleans up interval on component unmount
- Minimal re-renders (only on timer tick and state changes)
- CSS transitions for smooth progress ring animation

## Future Enhancements

- Audio notifications on block completion
- Browser notifications when timer completes
- Customizable work/break durations during session
- Skip break option
- Statistics tracking (total focus time, completed sessions)
- Integration with lock rules to enforce app blocking
