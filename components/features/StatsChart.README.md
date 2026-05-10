# StatsChart Component

## Overview

The `StatsChart` component displays comprehensive usage statistics for the FocusLock application. It provides a visual representation of daily app usage through a stacked bar chart, week-over-week comparison metrics, and a detailed per-app breakdown table.

## Features

- **Stacked Bar Chart**: Shows daily usage by app for the current week with color-coded segments
- **Week-over-Week Comparison**: Displays current week vs. previous week usage with percentage change
- **Per-App Breakdown Table**: Lists each app with total time used and override count
- **Interactive Elements**: Hover over bar segments to see app name and exact time
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens
- **Color-Coded Legend**: Visual legend mapping colors to app names

## Props

```typescript
interface StatsChartProps {
  dailyUsage: DailyUsageData[];
  perAppBreakdown: PerAppBreakdown[];
  weekOverWeek: WeekOverWeek;
}

interface DailyUsageData {
  date: string; // ISO date format (YYYY-MM-DD)
  apps: Array<{
    app_name: string;
    minutes: number;
  }>;
}

interface PerAppBreakdown {
  app_name: string;
  total_minutes: number;
  override_count: number;
}

interface WeekOverWeek {
  current_week_minutes: number;
  previous_week_minutes: number;
  change_percentage: number;
}
```

## Usage

```tsx
import StatsChart from '@/components/features/StatsChart';

function StatsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      const response = await fetch('/api/stats?period=week');
      const data = await response.json();
      setStats(data);
    }
    fetchStats();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <StatsChart
      dailyUsage={stats.dailyUsage}
      perAppBreakdown={stats.perAppBreakdown}
      weekOverWeek={stats.weekOverWeek}
    />
  );
}
```

## Data Requirements

The component expects data from the `/api/stats` endpoint:

- **dailyUsage**: Array of 7 days (Monday-Sunday) with app usage per day
- **perAppBreakdown**: Aggregated totals per app for the week
- **weekOverWeek**: Comparison metrics between current and previous week

## Visual Design

### Bar Chart
- **Height**: 300px (responsive)
- **Width**: 600px (responsive)
- **Bar Width**: 60px
- **Bar Spacing**: 20px
- **Colors**: 8-color palette cycling through apps
- **Y-Axis**: Shows time in minutes/hours with gridlines at 0%, 25%, 50%, 75%, 100%
- **X-Axis**: Shows day names (Mon, Tue, Wed, etc.) with total time below

### Week Comparison
- Displayed in a card above the chart
- Shows current week, previous week, and percentage change
- Positive change (increased usage) shown in red
- Negative change (decreased usage) shown in green

### Breakdown Table
- Three columns: App, Total Time, Overrides
- Color indicator dot matching chart colors
- Override count highlighted in red if > 0
- Sorted by total time (descending)

## Accessibility

- SVG elements include `<title>` tags for tooltips
- Semantic HTML table structure
- Color indicators supplemented with text labels
- Responsive text sizing

## Requirements Validated

This component validates the following requirements:

- **18.1**: Display bar chart of daily usage by app for current week
- **18.2**: Display per-app breakdown showing total minutes and override count
- **18.3**: Display week-over-week comparison with percentage change
- **18.4**: Calculate and display compliance percentage (handled by parent page)
- **18.5**: Calculate and display time saved (handled by parent page)

## Implementation Notes

- Uses SVG for chart rendering (no external chart library required)
- Stacked bars show multiple apps per day
- Automatic color assignment from predefined palette
- Time formatting handles both minutes and hours
- Empty state handling when no data available
- Mobile-responsive with horizontal scroll for chart if needed

## Related Components

- Used in: `/app/(dashboard)/stats/page.tsx`
- Data source: `/app/api/stats/route.ts`
- Related: `BadgeCard`, `StreakDots` (other stats visualizations)
