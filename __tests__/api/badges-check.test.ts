/**
 * Badge Check API Route Tests
 * 
 * Tests the POST /api/badges/check endpoint
 * Requirements: 7.3, 20.5
 */

import { POST } from '@/app/api/badges/check/route';
import { createClient } from '@/lib/supabase/server';
import { checkAndAwardBadges } from '@/lib/core/badgeEngine';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/core/badgeEngine');

describe('POST /api/badges/check', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCheckAndAwardBadges = checkAndAwardBadges as jest.MockedFunction<typeof checkAndAwardBadges>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/badges/check', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'onboarding_complete' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return 400 if eventType is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/badges/check', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should call checkAndAwardBadges with correct parameters', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);

    mockCheckAndAwardBadges.mockResolvedValue();

    const request = new NextRequest('http://localhost:3000/api/badges/check', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'onboarding_complete',
        context: {},
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCheckAndAwardBadges).toHaveBeenCalledWith('user-123', 'onboarding_complete', {});
  });

  it('should handle context parameter', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);

    mockCheckAndAwardBadges.mockResolvedValue();

    const request = new NextRequest('http://localhost:3000/api/badges/check', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'streak_updated',
        context: { currentStreak: 7 },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCheckAndAwardBadges).toHaveBeenCalledWith('user-123', 'streak_updated', { currentStreak: 7 });
  });

  it('should return 500 if checkAndAwardBadges throws error', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);

    mockCheckAndAwardBadges.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/badges/check', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'onboarding_complete',
        context: {},
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
