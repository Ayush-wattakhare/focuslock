/**
 * Unit tests for StatsChart component
 */

import { render, screen } from '@testing-library/react';
import StatsChart from '../StatsChart';

describe('StatsChart', () => {
  const mockDailyUsage = [
    {
      date: '2024-01-15',
      apps: [
        { app_name: 'Instagram', minutes: 45 },
        { app_name: 'YouTube', minutes: 30 },
      ],
    },
    {
      date: '2024-01-16',
      apps: [
        { app_name: 'Instagram', minutes: 60 },
      ],
    },
    {
      date: '2024-01-17',
      apps: [],
    },
    {
      date: '2024-01-18',
      apps: [
        { app_name: 'YouTube', minutes: 70 },
      ],
    },
    {
      date: '2024-01-19',
      apps: [
        { app_name: 'Instagram', minutes: 40 },
      ],
    },
    {
      date: '2024-01-20',
      apps: [
        { app_name: 'Instagram', minutes: 80 },
      ],
    },
    {
      date: '2024-01-21',
      apps: [
        { app_name: 'YouTube', minutes: 45 },
      ],
    },
  ];

  const mockPerAppBreakdown = [
    {
      app_name: 'Instagram',
      total_minutes: 225,
      override_count: 3,
    },
    {
      app_name: 'YouTube',
      total_minutes: 145,
      override_count: 1,
    },
  ];

  const mockWeekOverWeek = {
    current_week_minutes: 370,
    previous_week_minutes: 450,
    change_percentage: -17.8,
  };

  it('renders week-over-week comparison', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('Week-over-Week Comparison')).toBeInTheDocument();
    expect(screen.getByText('Current Week:')).toBeInTheDocument();
    expect(screen.getByText('Previous Week:')).toBeInTheDocument();
    expect(screen.getByText('Change:')).toBeInTheDocument();
  });

  it('displays current and previous week minutes', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    // Current week: 370 minutes = 6h 10m
    expect(screen.getByText('6h 10m')).toBeInTheDocument();
    
    // Previous week: 450 minutes = 7h 30m
    expect(screen.getByText('7h 30m')).toBeInTheDocument();
  });

  it('displays percentage change with correct sign', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('-17.8%')).toBeInTheDocument();
  });

  it('renders bar chart with SVG', () => {
    const { container } = render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    const svg = container.querySelector('svg.usage-chart');
    expect(svg).toBeInTheDocument();
  });

  it('renders daily usage chart title', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('Daily Usage by App')).toBeInTheDocument();
  });

  it('renders per-app breakdown table', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('Per-App Breakdown')).toBeInTheDocument();
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.getByText('Total Time')).toBeInTheDocument();
    expect(screen.getByText('Overrides')).toBeInTheDocument();
  });

  it('displays app names in breakdown table', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('displays total minutes for each app', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    // Instagram: 225 minutes = 3h 45m
    expect(screen.getByText('3h 45m')).toBeInTheDocument();
    
    // YouTube: 145 minutes = 2h 25m
    expect(screen.getByText('2h 25m')).toBeInTheDocument();
  });

  it('displays override counts', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    const overrideCells = screen.getAllByText('3');
    expect(overrideCells.length).toBeGreaterThan(0);
    
    const overrideCell1 = screen.getAllByText('1');
    expect(overrideCell1.length).toBeGreaterThan(0);
  });

  it('handles empty per-app breakdown', () => {
    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={[]}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('No usage data for this week')).toBeInTheDocument();
  });

  it('handles zero change percentage', () => {
    const zeroChangeWeekOverWeek = {
      current_week_minutes: 100,
      previous_week_minutes: 100,
      change_percentage: 0,
    };

    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={zeroChangeWeekOverWeek}
      />
    );

    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('handles positive change percentage', () => {
    const positiveChangeWeekOverWeek = {
      current_week_minutes: 500,
      previous_week_minutes: 400,
      change_percentage: 25.0,
    };

    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={positiveChangeWeekOverWeek}
      />
    );

    expect(screen.getByText('+25.0%')).toBeInTheDocument();
  });

  it('formats minutes correctly when less than 60', () => {
    const shortUsageBreakdown = [
      {
        app_name: 'Twitter',
        total_minutes: 45,
        override_count: 0,
      },
    ];

    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={shortUsageBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('formats hours correctly when minutes is 0', () => {
    const exactHoursBreakdown = [
      {
        app_name: 'Netflix',
        total_minutes: 120,
        override_count: 0,
      },
    ];

    render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={exactHoursBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('renders legend with app names', () => {
    const { container } = render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    const legend = container.querySelector('.chart-legend');
    expect(legend).toBeInTheDocument();
    
    const legendItems = container.querySelectorAll('.legend-item');
    expect(legendItems.length).toBeGreaterThan(0);
  });

  it('applies correct CSS class for positive change', () => {
    const positiveChangeWeekOverWeek = {
      current_week_minutes: 500,
      previous_week_minutes: 400,
      change_percentage: 25.0,
    };

    const { container } = render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={positiveChangeWeekOverWeek}
      />
    );

    const changeValue = container.querySelector('.stat-value.negative');
    expect(changeValue).toBeInTheDocument();
  });

  it('applies correct CSS class for negative change', () => {
    const { container } = render(
      <StatsChart
        dailyUsage={mockDailyUsage}
        perAppBreakdown={mockPerAppBreakdown}
        weekOverWeek={mockWeekOverWeek}
      />
    );

    const changeValue = container.querySelector('.stat-value.positive');
    expect(changeValue).toBeInTheDocument();
  });
});
