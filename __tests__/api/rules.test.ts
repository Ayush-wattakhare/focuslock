// Unit tests for lock rules API routes

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/rules/route';
import { PUT, DELETE } from '@/app/api/rules/[id]/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Lock Rules API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/rules', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return lock rules for authenticated user', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          user_id: 'user-1',
          app_name: 'Instagram',
          lock_type: 'timer',
          daily_limit_minutes: 30,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockRules, error: null }),
            }),
          }),
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rules).toEqual(mockRules);
    });
  });

  describe('POST /api/rules', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules', {
        method: 'POST',
        body: JSON.stringify({ app_name: 'Instagram', lock_type: 'timer', daily_limit_minutes: 30 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 for invalid lock rule data', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules', {
        method: 'POST',
        body: JSON.stringify({ app_name: '', lock_type: 'invalid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create timer lock rule with valid data', async () => {
      const mockRule = {
        id: 'rule-1',
        user_id: 'user-1',
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockRule, error: null }),
            }),
          }),
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules', {
        method: 'POST',
        body: JSON.stringify({ 
          app_name: 'Instagram', 
          lock_type: 'timer', 
          daily_limit_minutes: 30 
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.rule).toEqual(mockRule);
    });

    it('should reject timer lock without daily_limit_minutes', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules', {
        method: 'POST',
        body: JSON.stringify({ 
          app_name: 'Instagram', 
          lock_type: 'timer'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/rules/[id]', () => {
    it('should return 404 if rule does not exist', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
              }),
            }),
          }),
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'PUT',
        body: JSON.stringify({ is_active: false }),
      });

      const response = await PUT(request, { params: { id: 'rule-1' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should update lock rule with valid data', async () => {
      const existingRule = {
        id: 'rule-1',
        user_id: 'user-1',
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
        is_active: true,
      };

      const updatedRule = { ...existingRule, is_active: false };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'lock_rules') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: existingRule, error: null }),
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: updatedRule, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'PUT',
        body: JSON.stringify({ is_active: false }),
      });

      const response = await PUT(request, { params: { id: 'rule-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rule.is_active).toBe(false);
    });
  });

  describe('DELETE /api/rules/[id]', () => {
    it('should return 404 if rule does not exist', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
              }),
            }),
          }),
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'rule-1' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should delete lock rule successfully', async () => {
      const existingRule = {
        id: 'rule-1',
        user_id: 'user-1',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'user-1' } }, 
            error: null 
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'lock_rules') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: existingRule, error: null }),
                  }),
                }),
              }),
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'rule-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
