'use client';

import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import StatsChart from '@/components/features/StatsChart';

interface DailyUsageData {
  date: string;
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

interface Compliance {
  days_without_override: number;
  total_days: number;
  percentage: number;
}

interface StatsResponse {
  dailyUsage: DailyUsageData[];
  perAppBreakdown: PerAppBreakdown[];
  weekOverWeek: WeekOverWeek;
  compliance: Compliance;
  timeSaved: number;
}

interface StatsClientProps {
  user: User;
}

export default function StatsClient({ user }: StatsClientProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/stats?period=week');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch statistics');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Helper to format minutes to hours and minutes
  function formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  }

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-header">
          <h1>Statistics Dashboard</h1>
          <p>Weekly usage analytics and insights</p>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading statistics...</p>
        </div>

        <style jsx>{`
          .stats-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          .stats-header {
            margin-bottom: 30px;
          }

          .stats-header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 8px 0;
          }

          .stats-header p {
            font-size: 16px;
            color: #6b7280;
            margin: 0;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            gap: 15px;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .loading-state p {
            font-size: 14px;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="stats-header">
          <h1>Statistics Dashboard</h1>
          <p>Weekly usage analytics and insights</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Failed to Load Statistics</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>

        <style jsx>{`
          .stats-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          .stats-header {
            margin-bottom: 30px;
          }

          .stats-header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 8px 0;
          }

          .stats-header p {
            font-size: 16px;
            color: #6b7280;
            margin: 0;
          }

          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            gap: 15px;
            text-align: center;
          }

          .error-icon {
            font-size: 48px;
          }

          .error-state h2 {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin: 0;
          }

          .error-state p {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }

          .retry-button {
            margin-top: 10px;
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
          }

          .retry-button:hover {
            background: #2563eb;
          }
        `}</style>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>Statistics Dashboard</h1>
        <p>Weekly usage analytics and insights</p>
      </div>

      {/* Main chart component */}
      <StatsChart
        dailyUsage={stats.dailyUsage}
        perAppBreakdown={stats.perAppBreakdown}
        weekOverWeek={stats.weekOverWeek}
      />

      {/* Additional metrics */}
      <div className="additional-metrics">
        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Compliance Rate</h3>
            <div className="metric-value">{stats.compliance.percentage.toFixed(1)}%</div>
            <p className="metric-description">
              {stats.compliance.days_without_override} of {stats.compliance.total_days} days without overrides
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Time Saved</h3>
            <div className="metric-value">{formatMinutes(stats.timeSaved)}</div>
            <p className="metric-description">
              Estimated time saved by staying focused
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stats-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .stats-header {
          margin-bottom: 30px;
        }

        .stats-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .stats-header p {
          font-size: 16px;
          color: #6b7280;
          margin: 0;
        }

        .additional-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }

        .metric-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .metric-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .metric-content {
          flex: 1;
        }

        .metric-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px 0;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .metric-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        @media (max-width: 640px) {
          .stats-page {
            padding: 15px;
          }

          .stats-header h1 {
            font-size: 24px;
          }

          .stats-header p {
            font-size: 14px;
          }

          .additional-metrics {
            grid-template-columns: 1fr;
          }

          .metric-card {
            padding: 20px;
          }

          .metric-value {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
