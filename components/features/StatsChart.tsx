'use client';

import React from 'react';

// Type definitions matching the API response
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

interface StatsChartProps {
  dailyUsage: DailyUsageData[];
  perAppBreakdown: PerAppBreakdown[];
  weekOverWeek: WeekOverWeek;
}

// Color palette for different apps
const APP_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

// Helper to format date to day name
function formatDayName(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Helper to format minutes to hours and minutes
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function StatsChart({
  dailyUsage,
  perAppBreakdown,
  weekOverWeek,
}: StatsChartProps) {
  // Get unique app names and assign colors
  const appNames = Array.from(
    new Set(dailyUsage.flatMap((day) => day.apps.map((app) => app.app_name)))
  );
  const appColorMap = new Map(
    appNames.map((name, index) => [name, APP_COLORS[index % APP_COLORS.length]])
  );

  // Calculate max daily total for scaling
  const maxDailyTotal = Math.max(
    ...dailyUsage.map((day) =>
      day.apps.reduce((sum, app) => sum + app.minutes, 0)
    ),
    1 // Minimum 1 to avoid division by zero
  );

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 300;
  const barWidth = 60;
  const barSpacing = 20;
  const chartPadding = { top: 20, right: 20, bottom: 60, left: 60 };

  return (
    <div className="stats-chart">
      {/* Week-over-week comparison */}
      <div className="week-comparison">
        <h3>Week-over-Week Comparison</h3>
        <div className="comparison-stats">
          <div className="stat-item">
            <span className="stat-label">Current Week:</span>
            <span className="stat-value">
              {formatMinutes(weekOverWeek.current_week_minutes)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Previous Week:</span>
            <span className="stat-value">
              {formatMinutes(weekOverWeek.previous_week_minutes)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Change:</span>
            <span
              className={`stat-value ${
                weekOverWeek.change_percentage < 0 ? 'positive' : 'negative'
              }`}
            >
              {weekOverWeek.change_percentage > 0 ? '+' : ''}
              {weekOverWeek.change_percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="chart-container">
        <h3>Daily Usage by App</h3>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="usage-chart"
        >
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y =
              chartHeight -
              chartPadding.bottom -
              (percent / 100) * (chartHeight - chartPadding.top - chartPadding.bottom);
            const minutes = Math.round((percent / 100) * maxDailyTotal);
            return (
              <g key={percent}>
                <line
                  x1={chartPadding.left}
                  y1={y}
                  x2={chartWidth - chartPadding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={chartPadding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {formatMinutes(minutes)}
                </text>
              </g>
            );
          })}

          {/* Bars for each day */}
          {dailyUsage.map((day, dayIndex) => {
            const x =
              chartPadding.left +
              dayIndex * (barWidth + barSpacing) +
              barSpacing / 2;
            const dayTotal = day.apps.reduce((sum, app) => sum + app.minutes, 0);

            let stackY = chartHeight - chartPadding.bottom;

            return (
              <g key={day.date}>
                {/* Stacked bars for each app */}
                {day.apps.map((app) => {
                  const barHeight =
                    (app.minutes / maxDailyTotal) *
                    (chartHeight - chartPadding.top - chartPadding.bottom);
                  const barY = stackY - barHeight;
                  const color = appColorMap.get(app.app_name) || '#9ca3af';

                  const bar = (
                    <rect
                      key={app.app_name}
                      x={x}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={color}
                      className="bar-segment"
                    >
                      <title>
                        {app.app_name}: {formatMinutes(app.minutes)}
                      </title>
                    </rect>
                  );

                  stackY = barY;
                  return bar;
                })}

                {/* Day label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - chartPadding.bottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                  fontWeight="500"
                >
                  {formatDayName(day.date)}
                </text>

                {/* Total time label */}
                {dayTotal > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - chartPadding.bottom + 35}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {formatMinutes(dayTotal)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="chart-legend">
          {appNames.map((appName) => (
            <div key={appName} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: appColorMap.get(appName) }}
              />
              <span className="legend-label">{appName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-app breakdown table */}
      <div className="app-breakdown">
        <h3>Per-App Breakdown</h3>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>App</th>
              <th>Total Time</th>
              <th>Overrides</th>
            </tr>
          </thead>
          <tbody>
            {perAppBreakdown.map((app) => (
              <tr key={app.app_name}>
                <td>
                  <div className="app-name-cell">
                    <span
                      className="app-color-indicator"
                      style={{ backgroundColor: appColorMap.get(app.app_name) }}
                    />
                    {app.app_name}
                  </div>
                </td>
                <td className="time-cell">{formatMinutes(app.total_minutes)}</td>
                <td className="override-cell">
                  <span className={app.override_count > 0 ? 'has-overrides' : ''}>
                    {app.override_count}
                  </span>
                </td>
              </tr>
            ))}
            {perAppBreakdown.length === 0 && (
              <tr>
                <td colSpan={3} className="no-data">
                  No usage data for this week
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .stats-chart {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .week-comparison {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .week-comparison h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .comparison-stats {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .stat-value.positive {
          color: #10b981;
        }

        .stat-value.negative {
          color: #ef4444;
        }

        .chart-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .chart-container h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .usage-chart {
          display: block;
          margin: 0 auto;
          max-width: 100%;
          height: auto;
        }

        .bar-segment {
          transition: opacity 0.2s;
        }

        .bar-segment:hover {
          opacity: 0.8;
        }

        .chart-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 20px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-label {
          font-size: 13px;
          color: #374151;
        }

        .app-breakdown {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .app-breakdown h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
        }

        .breakdown-table th {
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid #e5e7eb;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .breakdown-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
          color: #111827;
        }

        .breakdown-table tbody tr:last-child td {
          border-bottom: none;
        }

        .breakdown-table tbody tr:hover {
          background: #f9fafb;
        }

        .app-name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .app-color-indicator {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .time-cell {
          font-weight: 500;
        }

        .override-cell {
          text-align: center;
        }

        .has-overrides {
          color: #ef4444;
          font-weight: 600;
        }

        .no-data {
          text-align: center;
          color: #9ca3af;
          padding: 30px !important;
        }

        @media (max-width: 640px) {
          .stats-chart {
            padding: 10px;
          }

          .comparison-stats {
            flex-direction: column;
            gap: 15px;
          }

          .usage-chart {
            overflow-x: auto;
          }

          .breakdown-table {
            font-size: 13px;
          }

          .breakdown-table th,
          .breakdown-table td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}
