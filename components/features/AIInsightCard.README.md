# AIInsightCard Component

## Overview

The `AIInsightCard` component displays Claude-generated AI coaching insights with mood pattern visualization. It provides users with behavioral insights based on their override patterns, helping them understand and improve their app usage habits.

## Features

- **Key Insight Display**: Shows Claude-generated insights (2 sentences max) with warm, non-judgmental tone
- **Mood Pattern Visualization**: Interactive bar chart showing mood breakdown from override logs
- **Actionable Suggestions**: Specific, concrete suggestions with optional CTA button
- **Top Mood Indicator**: Highlights the most common mood trigger
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens
- **Accessible**: ARIA labels, keyboard navigation, and semantic HTML

## Requirements Mapping

- **10.1**: Display Claude-generated insights
- **10.2**: Show one key insight (2 sentences max)
- **10.3**: Show one specific actionable suggestion
- **10.4**: Display most common mood trigger
- **10.5**: Mood pattern visualization (bar chart)
- **10.6**: Warm, non-judgmental tone
- **10.7**: CTA button for actionable suggestion
- **10.8**: Accessible and responsive design

## Props

```typescript
interface AIInsightCardProps {
  insight: string;           // Key insight from Claude (2 sentences max)
  suggestion: string;        // Actionable suggestion
  topMood: string | null;    // Most common mood trigger
  moodBreakdown: Array<{     // Mood frequency data
    mood: string;
    count: number;
  }>;
  onActionClick?: () => void; // Optional callback for CTA button
}
```

## Usage

### Basic Usage

```tsx
import AIInsightCard from '@/components/features/AIInsightCard';

export default function AICoachPage() {
  const insights = {
    insight: "You tend to override locks most often in the evening, especially around 8-9 PM. This pattern suggests you're using apps as a wind-down activity.",
    suggestion: "Try scheduling a 10-minute walk or reading session at 8 PM instead of reaching for your phone.",
    topMood: "stressed",
    moodBreakdown: [
      { mood: "stressed", count: 12 },
      { mood: "bored", count: 8 },
      { mood: "tired", count: 5 }
    ]
  };

  return (
    <AIInsightCard
      insight={insights.insight}
      suggestion={insights.suggestion}
      topMood={insights.topMood}
      moodBreakdown={insights.moodBreakdown}
    />
  );
}
```

### With Action Button

```tsx
import AIInsightCard from '@/components/features/AIInsightCard';
import { useRouter } from 'next/navigation';

export default function AICoachPage() {
  const router = useRouter();
  
  const handleActionClick = () => {
    // Navigate to rules page or show modal
    router.push('/rules/new');
  };

  return (
    <AIInsightCard
      insight="Great job! You haven't overridden any locks this week."
      suggestion="Keep up the momentum by setting a new challenge for next week."
      topMood={null}
      moodBreakdown={[]}
      onActionClick={handleActionClick}
    />
  );
}
```

### Fetching from API

```tsx
'use client';

import { useState, useEffect } from 'react';
import AIInsightCard from '@/components/features/AIInsightCard';

export default function AICoachPage() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch('/api/ai-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: 7 })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }

        const data = await response.json();
        setInsights(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  if (loading) return <div>Loading insights...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!insights) return null;

  return (
    <AIInsightCard
      insight={insights.insight}
      suggestion={insights.suggestion}
      topMood={insights.topMood}
      moodBreakdown={insights.moodBreakdown}
    />
  );
}
```

## Mood Types

The component supports the following mood types with corresponding emojis and colors:

| Mood | Emoji | Color |
|------|-------|-------|
| bored | 😐 | Gray |
| stressed | 😰 | Red |
| tired | 😴 | Purple |
| news | 📰 | Blue |
| other | 🤔 | Dark Gray |

## Styling

The component uses scoped CSS-in-JS (styled-jsx) with:
- Gradient background (purple to violet)
- Glassmorphism effects (frosted glass sections)
- Smooth animations for bar chart
- Responsive breakpoints at 768px and 480px

### Customization

To customize the appearance, modify the `<style jsx>` block in the component:

```tsx
// Change gradient colors
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);

// Adjust card padding
padding: 24px; // Desktop
padding: 20px; // Tablet
padding: 16px; // Mobile
```

## Accessibility

- **ARIA Labels**: All interactive elements have descriptive labels
- **Semantic HTML**: Uses proper heading hierarchy (h2, h3)
- **Keyboard Navigation**: CTA button is fully keyboard accessible
- **Screen Readers**: Progress bars include aria-valuenow/min/max
- **Focus Indicators**: Visible focus outline on interactive elements

## Performance

- **Lightweight**: No external dependencies
- **Optimized Rendering**: Uses CSS transitions for smooth animations
- **Responsive Images**: SVG icons scale without quality loss
- **Minimal Re-renders**: Pure component with stable props

## Error Handling

The component gracefully handles edge cases:

- **No mood data**: Hides mood section if `moodBreakdown` is empty
- **No top mood**: Hides top mood badge if `topMood` is null
- **No action button**: Hides CTA if `onActionClick` is not provided
- **Empty insight**: Displays fallback message (handled by API)

## Testing

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import AIInsightCard from './AIInsightCard';

test('renders insight text', () => {
  render(
    <AIInsightCard
      insight="Test insight"
      suggestion="Test suggestion"
      topMood="stressed"
      moodBreakdown={[{ mood: "stressed", count: 5 }]}
    />
  );
  
  expect(screen.getByText('Test insight')).toBeInTheDocument();
});

test('renders mood chart with correct data', () => {
  const moodBreakdown = [
    { mood: "stressed", count: 10 },
    { mood: "bored", count: 5 }
  ];
  
  render(
    <AIInsightCard
      insight="Test"
      suggestion="Test"
      topMood="stressed"
      moodBreakdown={moodBreakdown}
    />
  );
  
  expect(screen.getByText('Stressed')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
});
```

### Integration Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import AIInsightCard from './AIInsightCard';

test('calls onActionClick when button is clicked', () => {
  const handleClick = jest.fn();
  
  render(
    <AIInsightCard
      insight="Test"
      suggestion="Test"
      topMood={null}
      moodBreakdown={[]}
      onActionClick={handleClick}
    />
  );
  
  const button = screen.getByRole('button', { name: /take action/i });
  fireEvent.click(button);
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Related Components

- **MoodPrompt**: Collects mood data that feeds into this component
- **StatsChart**: Displays usage statistics alongside AI insights
- **BadgeCard**: Shows achievements earned from following suggestions

## API Integration

This component is designed to work with the `/api/ai-coach` endpoint:

```typescript
// POST /api/ai-coach
{
  "days": 7  // Optional, defaults to 7
}

// Response
{
  "insight": "string",
  "suggestion": "string",
  "topMood": "string | null",
  "moodBreakdown": [
    { "mood": "string", "count": number }
  ]
}
```

## Future Enhancements

- [ ] Add animation when card first appears
- [ ] Support for custom mood types
- [ ] Export insights as image/PDF
- [ ] Historical insights comparison
- [ ] Interactive mood chart with tooltips
- [ ] Dark mode support
- [ ] Localization for multiple languages

## Changelog

### v1.0.0 (Current)
- Initial implementation
- Mood pattern visualization
- Actionable suggestions with CTA
- Responsive design
- Accessibility features
