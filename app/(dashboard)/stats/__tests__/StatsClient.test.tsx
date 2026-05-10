import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StatsClient from '../StatsClient';
import { User } from '@supabase/supabase-js';

// Mock the StatsChart component
jest.mock('@/components/features/StatsChart', () => ({
  __esModule: true,
  default: ({ dailyUsage, perAppBreakdown, weekOverWeek }: any) => (
    <div data-testid="stats-chart">
      <div data-testid="daily-usage">{JSON.stringify(dailyUsage)}</div>
      <div data-testid="per-app-breakdown">{JSON.stringify(perAppBreakdown)}</div>
      <div data-testid="week-over-week">{JSON.stringify(weekOverWeek)}</div>
    </div>
  ),
}));

// Mock user
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as User;

// Mock stats data
const mockStatsData = {
  dailyUsage: [
    {
      date: '2024-01-01',
      apps: [
        { app_name: 'Instagram', minutes: 30 },
        { app_name: 'Twitter', minutes: 20 },
      ],
    },
    {
      date: '2024-01-02',
      apps: [{ app_name: 'Instagram', minutes: 45 }],
    },
  ],
  perAppBreakdown: [
    { app_name: 'Instagram', total_minutes: 75, override_count: 2 },
    { app_name: 'Twitter', total_minutes: 20, override_count: 0 },
  ],
  weekOverWeek: {
    current_week_minutes: 95,
    previous_week_minutes: 120,
    change_percentage: -20.8,
  },
  compliance: {
    days_without_override: 5,
    total_days: 7,
    percentage: 71.4,
  },
  timeSaved: 180,
};

describe('StatsClient', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  it('should render loading state initially', () => {
    // Mock fetch to never resolve
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Statistics Dashboard' })).toBeInTheDocument();
  });

  it('should fetch and display statistics successfully', async () => {
    // Mock successful fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStatsData),
      } as Response)
    ) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('stats-chart')).toBeInTheDocument();
    });

    // Verify StatsChart receives correct data
    expect(screen.getByTestId('daily-usage')).toHaveTextContent('Instagram');
    expect(screen.getByTestId('per-app-breakdown')).toHaveTextContent('Instagram');
    expect(screen.getByTestId('week-over-week')).toHaveTextContent('95');

    // Verify compliance metric
    expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
    expect(screen.getByText('71.4%')).toBeInTheDocument();
    expect(screen.getByText('5 of 7 days without overrides')).toBeInTheDocument();

    // Verify time saved metric
    expect(screen.getByText('Time Saved')).toBeInTheDocument();
    expect(screen.getByText('3 hours')).toBeInTheDocument();
  });

  it('should display error state when fetch fails', async () => {
    // Mock failed fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: 'Failed to fetch statistics' },
          }),
      } as Response)
    ) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to Load Statistics')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch statistics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('should display error state when network error occurs', async () => {
    // Mock network error
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to Load Statistics')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should call fetch with correct URL', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStatsData),
      } as Response)
    ) as jest.Mock;
    global.fetch = fetchMock;

    render(<StatsClient user={mockUser} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/stats?period=week');
    });
  });

  it('should format time saved correctly for minutes', async () => {
    const dataWithMinutes = {
      ...mockStatsData,
      timeSaved: 45, // Less than 60 minutes
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dataWithMinutes),
      } as Response)
    ) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('45 minutes')).toBeInTheDocument();
    });
  });

  it('should format time saved correctly for hours and minutes', async () => {
    const dataWithHoursAndMinutes = {
      ...mockStatsData,
      timeSaved: 125, // 2 hours 5 minutes
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dataWithHoursAndMinutes),
      } as Response)
    ) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('2h 5m')).toBeInTheDocument();
    });
  });

  it('should format time saved correctly for exact hours', async () => {
    const dataWithExactHours = {
      ...mockStatsData,
      timeSaved: 120, // Exactly 2 hours
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dataWithExactHours),
      } as Response)
    ) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });
  });

  it('should display compliance percentage with one decimal place', async () => {
    const dataWithDecimal = {
      ...mockStatsData,
      compliance: {
        days_without_override: 4,
        total_days: 7,
        percentage: 57.14285714,
      },
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dataWithDecimal),
      } as Response)
    ) as jest.Mock;

    render(<StatsClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('57.1%')).toBeInTheDocument();
    });
  });
});
