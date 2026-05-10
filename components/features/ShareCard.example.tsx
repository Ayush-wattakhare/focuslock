/**
 * ShareCard Component Example
 * 
 * This file demonstrates various usage scenarios for the ShareCard component.
 */

import ShareCard from './ShareCard';

// Example 1: Basic usage with good stats
export function ShareCardBasicExample() {
  const stats = {
    timeSaved: 180, // 3 hours
    compliancePercentage: 85.7,
    currentStreak: 12,
    watermark: 'focuslock.app',
  };

  return (
    <div>
      <h2>Basic ShareCard Example</h2>
      <ShareCard stats={stats} />
    </div>
  );
}

// Example 2: Perfect week (100% compliance)
export function ShareCardPerfectWeekExample() {
  const stats = {
    timeSaved: 420, // 7 hours
    compliancePercentage: 100,
    currentStreak: 30,
    watermark: 'focuslock.app',
  };

  return (
    <div>
      <h2>Perfect Week Example</h2>
      <ShareCard stats={stats} />
    </div>
  );
}

// Example 3: New user with minimal stats
export function ShareCardNewUserExample() {
  const stats = {
    timeSaved: 25,
    compliancePercentage: 50,
    currentStreak: 1,
    watermark: 'focuslock.app',
  };

  return (
    <div>
      <h2>New User Example</h2>
      <ShareCard stats={stats} />
    </div>
  );
}

// Example 4: High achiever with long streak
export function ShareCardHighAchieverExample() {
  const stats = {
    timeSaved: 600, // 10 hours
    compliancePercentage: 95.5,
    currentStreak: 90,
    watermark: 'focuslock.app',
  };

  return (
    <div>
      <h2>High Achiever Example</h2>
      <ShareCard stats={stats} />
    </div>
  );
}

// Example 5: Zero stats (edge case)
export function ShareCardZeroStatsExample() {
  const stats = {
    timeSaved: 0,
    compliancePercentage: 0,
    currentStreak: 0,
    watermark: 'focuslock.app',
  };

  return (
    <div>
      <h2>Zero Stats Example</h2>
      <ShareCard stats={stats} />
    </div>
  );
}

// Example 6: Fetching from API
export function ShareCardAPIExample() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/share-card');
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
    return <div>Loading your progress...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>API Integration Example</h2>
      <ShareCard stats={stats} />
    </div>
  );
}

// Example 7: Multiple cards comparison
export function ShareCardComparisonExample() {
  const thisWeek = {
    timeSaved: 180,
    compliancePercentage: 85.7,
    currentStreak: 12,
    watermark: 'focuslock.app',
  };

  const lastWeek = {
    timeSaved: 120,
    compliancePercentage: 71.4,
    currentStreak: 5,
    watermark: 'focuslock.app',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <h3>This Week</h3>
        <ShareCard stats={thisWeek} />
      </div>
      <div>
        <h3>Last Week</h3>
        <ShareCard stats={lastWeek} />
      </div>
    </div>
  );
}

// Example 8: With custom styling wrapper
export function ShareCardCustomWrapperExample() {
  const stats = {
    timeSaved: 240,
    compliancePercentage: 90,
    currentStreak: 21,
    watermark: 'focuslock.app',
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px',
      background: '#f9fafb',
      borderRadius: '16px'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        Share Your Achievement
      </h1>
      <ShareCard stats={stats} />
      <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280' }}>
        Keep up the great work! 🎉
      </p>
    </div>
  );
}

// Export all examples
export default {
  Basic: ShareCardBasicExample,
  PerfectWeek: ShareCardPerfectWeekExample,
  NewUser: ShareCardNewUserExample,
  HighAchiever: ShareCardHighAchieverExample,
  ZeroStats: ShareCardZeroStatsExample,
  APIIntegration: ShareCardAPIExample,
  Comparison: ShareCardComparisonExample,
  CustomWrapper: ShareCardCustomWrapperExample,
};
