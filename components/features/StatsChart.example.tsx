/**
 * StatsChart Component Example
 * 
 * This file demonstrates how to use the StatsChart component
 * with sample data matching the API response format.
 */

import StatsChart from './StatsChart';

// Sample data for demonstration
const sampleDailyUsage = [
  {
    date: '2024-01-15', // Monday
    apps: [
      { app_name: 'Instagram', minutes: 45 },
      { app_name: 'YouTube', minutes: 30 },
      { app_name: 'TikTok', minutes: 20 },
    ],
  },
  {
    date: '2024-01-16', // Tuesday
    apps: [
      { app_name: 'Instagram', minutes: 60 },
      { app_name: 'YouTube', minutes: 40 },
    ],
  },
  {
    date: '2024-01-17', // Wednesday
    apps: [
      { app_name: 'Instagram', minutes: 30 },
      { app_name: 'TikTok', minutes: 50 },
      { app_name: 'Twitter', minutes: 25 },
    ],
  },
  {
    date: '2024-01-18', // Thursday
    apps: [
      { app_name: 'YouTube', minutes: 70 },
      { app_name: 'Instagram', minutes: 20 },
    ],
  },
  {
    date: '2024-01-19', // Friday
    apps: [
      { app_name: 'Instagram', minutes: 40 },
      { app_name: 'TikTok', minutes: 35 },
      { app_name: 'YouTube', minutes: 25 },
    ],
  },
  {
    date: '2024-01-20', // Saturday
    apps: [
      { app_name: 'Instagram', minutes: 80 },
      { app_name: 'YouTube', minutes: 60 },
      { app_name: 'TikTok', minutes: 40 },
    ],
  },
  {
    date: '2024-01-21', // Sunday
    apps: [
      { app_name: 'Instagram', minutes: 50 },
      { app_name: 'YouTube', minutes: 45 },
    ],
  },
];

const samplePerAppBreakdown = [
  {
    app_name: 'Instagram',
    total_minutes: 325,
    override_count: 3,
  },
  {
    app_name: 'YouTube',
    total_minutes: 270,
    override_count: 1,
  },
  {
    app_name: 'TikTok',
    total_minutes: 145,
    override_count: 2,
  },
  {
    app_name: 'Twitter',
    total_minutes: 25,
    override_count: 0,
  },
];

const sampleWeekOverWeek = {
  current_week_minutes: 765,
  previous_week_minutes: 920,
  change_percentage: -16.8,
};

// Example 1: Basic usage with sample data
export function BasicExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Weekly Usage Statistics</h2>
      <StatsChart
        dailyUsage={sampleDailyUsage}
        perAppBreakdown={samplePerAppBreakdown}
        weekOverWeek={sampleWeekOverWeek}
      />
    </div>
  );
}

// Example 2: With API data fetching
export function WithAPIExample() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats?period=week');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading statistics...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  return (
    <div>
      <h2>Your Weekly Stats</h2>
      <StatsChart
        dailyUsage={stats.dailyUsage}
        perAppBreakdown={stats.perAppBreakdown}
        weekOverWeek={stats.weekOverWeek}
      />
      
      {/* Additional stats from API */}
      <div style={{ marginTop: '20px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
        <h3>Additional Metrics</h3>
        <p>
          <strong>Compliance:</strong> {stats.compliance.percentage}% 
          ({stats.compliance.days_without_override} of {stats.compliance.total_days} days)
        </p>
        <p>
          <strong>Time Saved:</strong> {Math.floor(stats.timeSaved / 60)}h {stats.timeSaved % 60}m
        </p>
      </div>
    </div>
  );
}

// Example 3: Empty state (no usage data)
export function EmptyStateExample() {
  const emptyDailyUsage = [
    { date: '2024-01-15', apps: [] },
    { date: '2024-01-16', apps: [] },
    { date: '2024-01-17', apps: [] },
    { date: '2024-01-18', apps: [] },
    { date: '2024-01-19', apps: [] },
    { date: '2024-01-20', apps: [] },
    { date: '2024-01-21', apps: [] },
  ];

  const emptyWeekOverWeek = {
    current_week_minutes: 0,
    previous_week_minutes: 0,
    change_percentage: 0,
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>No Usage This Week</h2>
      <StatsChart
        dailyUsage={emptyDailyUsage}
        perAppBreakdown={[]}
        weekOverWeek={emptyWeekOverWeek}
      />
    </div>
  );
}

// Example 4: High usage scenario
export function HighUsageExample() {
  const highUsageDailyUsage = [
    {
      date: '2024-01-15',
      apps: [
        { app_name: 'Instagram', minutes: 180 },
        { app_name: 'YouTube', minutes: 240 },
        { app_name: 'TikTok', minutes: 120 },
      ],
    },
    {
      date: '2024-01-16',
      apps: [
        { app_name: 'Instagram', minutes: 200 },
        { app_name: 'YouTube', minutes: 180 },
        { app_name: 'Twitter', minutes: 90 },
      ],
    },
    {
      date: '2024-01-17',
      apps: [
        { app_name: 'Instagram', minutes: 150 },
        { app_name: 'TikTok', minutes: 200 },
        { app_name: 'YouTube', minutes: 160 },
      ],
    },
    {
      date: '2024-01-18',
      apps: [
        { app_name: 'YouTube', minutes: 220 },
        { app_name: 'Instagram', minutes: 140 },
        { app_name: 'TikTok', minutes: 100 },
      ],
    },
    {
      date: '2024-01-19',
      apps: [
        { app_name: 'Instagram', minutes: 190 },
        { app_name: 'TikTok', minutes: 170 },
        { app_name: 'YouTube', minutes: 150 },
      ],
    },
    {
      date: '2024-01-20',
      apps: [
        { app_name: 'Instagram', minutes: 250 },
        { app_name: 'YouTube', minutes: 200 },
        { app_name: 'TikTok', minutes: 180 },
      ],
    },
    {
      date: '2024-01-21',
      apps: [
        { app_name: 'Instagram', minutes: 210 },
        { app_name: 'YouTube', minutes: 190 },
        { app_name: 'Twitter', minutes: 80 },
      ],
    },
  ];

  const highUsageBreakdown = [
    { app_name: 'Instagram', total_minutes: 1320, override_count: 12 },
    { app_name: 'YouTube', total_minutes: 1340, override_count: 8 },
    { app_name: 'TikTok', total_minutes: 770, override_count: 10 },
    { app_name: 'Twitter', total_minutes: 170, override_count: 2 },
  ];

  const highUsageWeekOverWeek = {
    current_week_minutes: 3600,
    previous_week_minutes: 2400,
    change_percentage: 50.0,
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>High Usage Week</h2>
      <p style={{ color: '#ef4444', marginBottom: '20px' }}>
        ⚠️ Your usage increased by 50% this week
      </p>
      <StatsChart
        dailyUsage={highUsageDailyUsage}
        perAppBreakdown={highUsageBreakdown}
        weekOverWeek={highUsageWeekOverWeek}
      />
    </div>
  );
}

export default BasicExample;
