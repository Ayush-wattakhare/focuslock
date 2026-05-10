# ShareCard Component

## Overview

The ShareCard component generates a shareable progress image displaying user statistics including time saved, compliance percentage, and current streak. It provides export options for WhatsApp, Instagram Stories, and PNG download.

## Features

- **Visual Progress Card**: Beautiful gradient card with user statistics
- **Time Saved Display**: Shows minutes/hours saved this week
- **Compliance Percentage**: Displays percentage of days without overrides
- **Current Streak**: Shows consecutive days without overrides
- **FocusLock Watermark**: Includes app branding (focuslock.app)
- **Export Options**:
  - WhatsApp: Share with pre-formatted text
  - Instagram: Download image + copy caption to clipboard
  - PNG Download: Save high-quality image locally

## Requirements Implemented

- **14.1**: Generate shareable stats card with time saved and compliance %
- **14.2**: Include current streak in share card
- **14.3**: Add FocusLock watermark to share card
- **14.4**: Support export to WhatsApp, Instagram, PNG download

## Props

```typescript
interface ShareCardStats {
  timeSaved: number;           // Minutes saved this week
  compliancePercentage: number; // Percentage (0-100)
  currentStreak: number;        // Days
  watermark: string;            // "focuslock.app"
}

interface ShareCardProps {
  stats: ShareCardStats;
}
```

## Usage

```tsx
import ShareCard from '@/components/features/ShareCard';

// Fetch stats from API
const response = await fetch('/api/share-card');
const stats = await response.json();

// Render component
<ShareCard stats={stats} />
```

## Data Source

The component expects data from the `/api/share-card` endpoint:

```typescript
GET /api/share-card

Response:
{
  "timeSaved": 180,
  "compliancePercentage": 85.7,
  "currentStreak": 12,
  "watermark": "focuslock.app"
}
```

## Export Functionality

### WhatsApp Share
- Opens WhatsApp with pre-formatted message
- Includes all stats in text format
- Works on mobile and desktop

### Instagram Share
1. Downloads the card as PNG
2. Copies caption text to clipboard
3. User manually posts to Instagram Stories

### PNG Download
- Uses html2canvas library to capture the card
- Generates high-quality 2x scale image
- Downloads with timestamp filename

## Dependencies

The component requires the `html2canvas` library for PNG export:

```bash
npm install html2canvas
```

## Styling

- Gradient background (purple to violet)
- Glassmorphism effect on stat cards
- Responsive design for mobile/tablet/desktop
- Decorative circles for visual interest
- Smooth hover animations

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- High contrast text on gradient background

## Responsive Breakpoints

- **Desktop**: 3-column stats grid
- **Tablet** (< 640px): Single column stats grid
- **Mobile** (< 480px): Optimized spacing and font sizes

## Example Integration

```tsx
'use client';

import { useEffect, useState } from 'react';
import ShareCard from '@/components/features/ShareCard';

export default function SharePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/share-card');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>Error loading stats</div>;

  return <ShareCard stats={stats} />;
}
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Clipboard API for Instagram share (HTTPS required)
- Canvas API for PNG export

## Performance Considerations

- html2canvas is dynamically imported to reduce initial bundle size
- Image generation happens on-demand (not on component mount)
- 2x scale for retina displays without excessive memory usage

## Future Enhancements

- Add more social platforms (Twitter, LinkedIn)
- Custom color themes
- Animated stats counters
- Weekly comparison charts
- Badge showcase on card
