// Unit tests for POST /api/family/add-child

import { POST } from '../add-child/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('POST /api/family/add-child', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({ child_email: 'child@example.com' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return 400 if child_email is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('child_email');
  });

  it('should return 400 if email format is invalid', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({ child_email: 'invalid-email' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('Invalid email format');
  });

  it('should return 400 if trying to link own account', async () => {
    const userId = 'user-id';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: userId,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: userId, full_name: 'User', avatar_url: null },
            error: null,
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({ child_email: 'self@example.com' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('Cannot link your own account');
  });

  it('should return 404 if child account not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found'),
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({ child_email: 'nonexistent@example.com' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 if child already linked to another parent', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-id' } },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: 'child-id',
      error: null,
    });

    // Mock profile query
    const mockFrom = jest.fn();
    mockSupabase.from = mockFrom;

    // First call: profiles query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'child-id', full_name: 'Child', avatar_url: null },
            error: null,
          }),
        }),
      }),
    });

    // Second call: child_profiles check
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { parent_user_id: 'other-parent-id' },
            error: null,
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({ child_email: 'child@example.com' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
    expect(data.error.message).toContain('already linked to another parent');
  });

  it('should successfully link child account', async () => {
    const parentId = 'parent-id';
    const childId = 'child-id';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: parentId } },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: childId,
      error: null,
    });

    const mockFrom = jest.fn();
    mockSupabase.from = mockFrom;

    // First call: profiles query
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: childId, full_name: 'Child Name', avatar_url: 'https://avatar.url' },
            error: null,
          }),
        }),
      }),
    });

    // Second call: child_profiles check
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

    // Third call: child_profiles insert
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'link-id',
              parent_user_id: parentId,
              child_user_id: childId,
              created_at: '2024-01-15T10:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    });

    mockRequest = new NextRequest('http://localhost:3000/api/family/add-child', {
      method: 'POST',
      body: JSON.stringify({ child_email: 'child@example.com' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.child_profile).toBeDefined();
    expect(data.child_profile.parent_user_id).toBe(parentId);
    expect(data.child_profile.child_user_id).toBe(childId);
    expect(data.child_info).toBeDefined();
    expect(data.child_info.full_name).toBe('Child Name');
  });
});
