// Tests for Share Card API
// GET /api/share-card

import { GET } from '@/app/api/share-card/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('GET /api/share-card', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return share card data with time saved, compliance %, streak, and watermark', async () => {
    const mockUserId = 'user-123';
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock usage sessions
    const mockUsageSessions = [
      { minutes_used: 30, date: '2024-01-15' },
      { minutes_used: 45, date: '2024-01-16' },
      { minutes_used: 20, date: '2024-01-17' },
    ];

    // Mock override logs (1 override on 2024-01-16)
    const mockOverrideLogs = [
      { overridden_at: '2024-01-16T14:30:00' },
    ];

    // Mock streak
    const mockStreak = { current_streak: 5 };

    // Setup mock chain for usage_sessions
    const usageSessionsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: mockUsageSessions, error: null }),
    };

    // Setup mock chain for override_logs
    const overrideLogsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: mockOverrideLogs, error: null }),
    };

    // Setup mock chain for streaks
    const streaksMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockStreak, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'usage_sessions') return usageSessionsMock;
      if (table === 'override_logs') return overrideLogsMock;
      if (table === 'streaks') return streaksMock;
      return null;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('timeSaved');
    expect(data).toHaveProperty('compliancePercentage');
    expect(data).toHaveProperty('currentStreak');
    expect(data).toHaveProperty('watermark');
    expect(data.watermark).toBe('focuslock.app');
    expect(data.currentStreak).toBe(5);
    expect(typeof data.timeSaved).toBe('number');
    expect(typeof data.compliancePercentage).toBe('number');
  });

  it('should calculate compliance percentage correctly', async () => {
    const mockUserId = 'user-123';
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Get current week dates dynamically
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Generate dates for current week
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    // Mock 7 days of usage (current week)
    const mockUsageSessions = weekDates.map(date => ({
      minutes_used: 30,
      date,
    }));

    // Mock 2 overrides (on 2 different days)
    const mockOverrideLogs = [
      { overridden_at: `${weekDates[1]}T14:30:00` },
      { overridden_at: `${weekDates[3]}T10:00:00` },
    ];

    const mockStreak = { current_streak: 3 };

    const usageSessionsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: mockUsageSessions, error: null }),
    };

    const overrideLogsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: mockOverrideLogs, error: null }),
    };

    const streaksMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockStreak, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'usage_sessions') return usageSessionsMock;
      if (table === 'override_logs') return overrideLogsMock;
      if (table === 'streaks') return streaksMock;
      return null;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    // 5 days without override out of 7 days = 71.4%
    // Allow some tolerance for rounding and date calculation differences
    expect(data.compliancePercentage).toBeGreaterThanOrEqual(70);
    expect(data.compliancePercentage).toBeLessThanOrEqual(75);
  });

  it('should handle database errors gracefully', async () => {
    const mockUserId = 'user-123';
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock database error
    const usageSessionsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      }),
    };

    mockSupabase.from.mockReturnValue(usageSessionsMock);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('DATABASE_ERROR');
  });

  it('should return default values when no data exists', async () => {
    const mockUserId = 'user-123';
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock empty data
    const usageSessionsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const overrideLogsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const streaksMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'usage_sessions') return usageSessionsMock;
      if (table === 'override_logs') return overrideLogsMock;
      if (table === 'streaks') return streaksMock;
      return null;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.timeSaved).toBe(0);
    // No overrides means 100% compliance (all days are compliant)
    expect(data.compliancePercentage).toBe(100);
    expect(data.currentStreak).toBe(0);
    expect(data.watermark).toBe('focuslock.app');
  });

  it('should include FocusLock watermark in response', async () => {
    const mockUserId = 'user-123';
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    const usageSessionsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const overrideLogsMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const streaksMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { current_streak: 0 }, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'usage_sessions') return usageSessionsMock;
      if (table === 'override_logs') return overrideLogsMock;
      if (table === 'streaks') return streaksMock;
      return null;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.watermark).toBe('focuslock.app');
  });
});
