// Unit tests for GET /api/family/child-stats

import { GET } from '../child-stats/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('GET /api/family/child-stats', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

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

    mockRequest = new NextRequest('http://localhost:3000/api/family/child-stats?child_user_id=child-id', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return 400 if child_user_id is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/child-stats', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('child_user_id');
  });

  it('should return 403 if child is not linked to parent', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/child-stats?child_user_id=unlinked-child', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should return child stats with privacy respected', async () => {
    const parentId = 'parent-id';
    const childId = 'child-id';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: parentId } },
      error: null,
    });

    const mockFrom = jest.fn();
    mockSupabase.from = mockFrom;

    // Mock child_profiles check
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'link-id', child_user_id: childId },
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock profiles query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: childId,
              full_name: 'Child Name',
              avatar_url: 'https://avatar.url',
            },
            error: null,
          }),
        }),
      }),
    });

    // Mock lock_rules query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'rule-1',
                app_name: 'Instagram',
                lock_type: 'timer',
                is_active: true,
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    // Mock streaks query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              current_streak: 5,
              longest_streak: 10,
            },
            error: null,
          }),
        }),
      }),
    });

    // Mock recent overrides query (note: no reason_text)
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'override-1',
                  app_name: 'Instagram',
                  mood: 'bored',
                  overridden_at: '2024-01-15T14:30:00Z',
                  // reason_text is intentionally NOT included (privacy)
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock week overrides query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [
                { id: 'override-1', overridden_at: '2024-01-15T14:30:00Z' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock total overrides count
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          count: 15,
          error: null,
        }),
      }),
    });

    mockRequest = new NextRequest(`http://localhost:3000/api/family/child-stats?child_user_id=${childId}`, {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.child_info).toBeDefined();
    expect(data.child_info.full_name).toBe('Child Name');
    expect(data.lock_rules).toHaveLength(1);
    expect(data.lock_rules[0].app_name).toBe('Instagram');
    expect(data.recent_overrides).toHaveLength(1);
    
    // Verify privacy: reason_text should NOT be in response
    expect(data.recent_overrides[0]).not.toHaveProperty('reason_text');
    expect(data.recent_overrides[0].mood).toBe('bored');
    
    expect(data.compliance).toBeDefined();
    expect(data.compliance.current_streak).toBe(5);
    expect(data.compliance.longest_streak).toBe(10);
    expect(data.compliance.total_overrides_this_week).toBe(1);
    expect(data.compliance.total_overrides_all_time).toBe(15);
  });

  it('should handle missing streak data gracefully', async () => {
    const parentId = 'parent-id';
    const childId = 'child-id';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: parentId } },
      error: null,
    });

    const mockFrom = jest.fn();
    mockSupabase.from = mockFrom;

    // Mock child_profiles check
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'link-id', child_user_id: childId },
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock profiles query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: childId, full_name: 'Child', avatar_url: null },
            error: null,
          }),
        }),
      }),
    });

    // Mock lock_rules query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    // Mock streaks query - no data
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    // Mock recent overrides query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock week overrides query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock total overrides count
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      }),
    });

    mockRequest = new NextRequest(`http://localhost:3000/api/family/child-stats?child_user_id=${childId}`, {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.compliance.current_streak).toBe(0);
    expect(data.compliance.longest_streak).toBe(0);
    expect(data.compliance.total_overrides_all_time).toBe(0);
  });
});
