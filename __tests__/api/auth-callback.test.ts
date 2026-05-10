/**
 * Auth Callback Route Tests
 * Tests profile creation, streak initialization, and redirect logic
 */

import { GET } from '@/app/(auth)/auth/callback/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Auth Callback Route', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        exchangeCodeForSession: jest.fn(),
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to error page when no code is provided', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback');
    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toContain('/auth/auth-error');
  });

  it('should redirect to error page when code exchange fails', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      error: new Error('Invalid code'),
    });

    const request = new NextRequest('http://localhost:3000/auth/callback?code=invalid');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/auth-error');
  });

  it('should create profile and streak for new user and redirect to onboarding', async () => {
    const mockUser = {
      id: 'user-123',
      user_metadata: {
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const mockProfileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }), // No existing profile
    };

    const mockProfileInsert = jest.fn().mockResolvedValue({ error: null });
    const mockStreakInsert = jest.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          ...mockProfileQuery,
          insert: mockProfileInsert,
        };
      }
      if (table === 'streaks') {
        return {
          insert: mockStreakInsert,
        };
      }
      return mockProfileQuery;
    });

    const request = new NextRequest('http://localhost:3000/auth/callback?code=valid-code');
    const response = await GET(request);

    // Verify profile was created with correct data
    expect(mockProfileInsert).toHaveBeenCalledWith({
      id: 'user-123',
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
      timezone: 'Asia/Kolkata',
    });

    // Verify streak was initialized
    expect(mockStreakInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
    });

    // Verify redirect to onboarding for new user
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/onboarding');
  });

  it('should redirect existing user to dashboard', async () => {
    const mockUser = {
      id: 'user-123',
      user_metadata: {},
    };

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const mockProfileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-123' } }), // Existing profile
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const request = new NextRequest('http://localhost:3000/auth/callback?code=valid-code');
    const response = await GET(request);

    // Verify redirect to dashboard for existing user
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('should respect custom next parameter', async () => {
    const mockUser = {
      id: 'user-123',
      user_metadata: {},
    };

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const mockProfileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-123' } }),
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const request = new NextRequest('http://localhost:3000/auth/callback?code=valid-code&next=/custom-page');
    const response = await GET(request);

    // Verify redirect to custom page
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/custom-page');
  });

  it('should handle Google OAuth metadata correctly', async () => {
    const mockUser = {
      id: 'user-456',
      user_metadata: {
        name: 'Jane Smith', // Google uses 'name' instead of 'full_name'
        picture: 'https://google.com/photo.jpg', // Google uses 'picture' instead of 'avatar_url'
      },
    };

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const mockProfileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    };

    const mockProfileInsert = jest.fn().mockResolvedValue({ error: null });
    const mockStreakInsert = jest.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          ...mockProfileQuery,
          insert: mockProfileInsert,
        };
      }
      if (table === 'streaks') {
        return {
          insert: mockStreakInsert,
        };
      }
      return mockProfileQuery;
    });

    const request = new NextRequest('http://localhost:3000/auth/callback?code=valid-code');
    await GET(request);

    // Verify profile was created with Google OAuth metadata
    expect(mockProfileInsert).toHaveBeenCalledWith({
      id: 'user-456',
      full_name: 'Jane Smith',
      avatar_url: 'https://google.com/photo.jpg',
      timezone: 'Asia/Kolkata',
    });
  });
});
