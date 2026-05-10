// Unit tests for GET /api/family/children

import { GET } from '../children/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('GET /api/family/children', () => {
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

    mockRequest = new NextRequest('http://localhost:3000/api/family/children', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return empty array if no children linked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/children', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.children).toEqual([]);
  });

  it('should return list of linked children', async () => {
    const parentId = 'parent-id';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: parentId } },
      error: null,
    });

    const mockChildren = [
      {
        id: 'link-1',
        child_user_id: 'child-1',
        created_at: '2024-01-15T10:00:00Z',
        profiles: {
          id: 'child-1',
          full_name: 'Child One',
          avatar_url: 'https://avatar1.url',
          timezone: 'Asia/Kolkata',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
      {
        id: 'link-2',
        child_user_id: 'child-2',
        created_at: '2024-01-14T09:00:00Z',
        profiles: {
          id: 'child-2',
          full_name: 'Child Two',
          avatar_url: null,
          timezone: 'America/New_York',
          created_at: '2024-01-02T00:00:00Z',
        },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockChildren,
            error: null,
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/children', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.children).toHaveLength(2);
    expect(data.children[0].child_user_id).toBe('child-1');
    expect(data.children[0].full_name).toBe('Child One');
    expect(data.children[0].timezone).toBe('Asia/Kolkata');
    expect(data.children[1].child_user_id).toBe('child-2');
    expect(data.children[1].full_name).toBe('Child Two');
  });

  it('should handle database errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/children', {
      method: 'GET',
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('DATABASE_ERROR');
  });
});
