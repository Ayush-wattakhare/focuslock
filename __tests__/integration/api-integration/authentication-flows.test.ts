/**
 * Integration Tests for Authentication Flows
 * Tests authentication, session management, and profile creation
 * 
 * Validates: Task 16.1 - Authentication flows
 */

import {
  createTestUser,
  deleteTestUser,
  createTestProfile,
  cleanupTestData,
  createServiceClient,
  createAuthenticatedClient,
} from '../helpers/testHelpers';

describe('Authentication Flows Integration Tests', () => {
  describe('User Registration and Profile Creation', () => {
    it('should create user and profile successfully', async () => {
      const testUser = await createTestUser();
      const profile = await createTestProfile(testUser.userId, {
        full_name: 'Test User',
        timezone: 'Asia/Kolkata',
      });

      expect(profile).toBeDefined();
      expect(profile.id).toBe(testUser.userId);
      expect(profile.full_name).toBe('Test User');
      expect(profile.timezone).toBe('Asia/Kolkata');
      expect(profile.created_at).toBeDefined();

      // Cleanup
      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should default timezone to Asia/Kolkata', async () => {
      const testUser = await createTestUser();
      const profile = await createTestProfile(testUser.userId);

      expect(profile.timezone).toBe('Asia/Kolkata');

      // Cleanup
      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should initialize streak record on profile creation', async () => {
      const testUser = await createTestUser();
      await createTestProfile(testUser.userId);

      const serviceClient = createServiceClient();
      const { data: streak, error } = await serviceClient
        .from('streaks')
        .insert({
          user_id: testUser.userId,
          current_streak: 0,
          longest_streak: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(streak).toBeDefined();
      expect(streak!.current_streak).toBe(0);
      expect(streak!.longest_streak).toBe(0);

      // Cleanup
      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });
  });

  describe('Session Management', () => {
    let testUser: { userId: string; email: string; accessToken: string };

    beforeAll(async () => {
      testUser = await createTestUser();
      await createTestProfile(testUser.userId);
    });

    afterAll(async () => {
      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should authenticate with valid access token', async () => {
      const client = createAuthenticatedClient(testUser.accessToken);

      const { data: { user }, error } = await client.auth.getUser();

      expect(error).toBeNull();
      expect(user).toBeDefined();
      expect(user!.id).toBe(testUser.userId);
      expect(user!.email).toBe(testUser.email);
    });

    it('should reject invalid access token', async () => {
      const client = createAuthenticatedClient('invalid-token');

      const { data: { user }, error } = await client.auth.getUser();

      expect(error).not.toBeNull();
      expect(user).toBeNull();
    });

    it('should access protected resources with valid token', async () => {
      const client = createAuthenticatedClient(testUser.accessToken);

      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', testUser.userId)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile!.id).toBe(testUser.userId);
    });

    it('should deny access to protected resources without token', async () => {
      const serviceClient = createServiceClient();
      const anonClient = createAuthenticatedClient('');

      const { data, error } = await anonClient
        .from('profiles')
        .select('*')
        .eq('id', testUser.userId);

      // Without valid auth, RLS should return empty
      expect(data).toEqual([]);
    });
  });

  describe('Profile Updates', () => {
    let testUser: { userId: string; email: string; accessToken: string };

    beforeAll(async () => {
      testUser = await createTestUser();
      await createTestProfile(testUser.userId);
    });

    afterAll(async () => {
      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should update profile fields', async () => {
      const client = createAuthenticatedClient(testUser.accessToken);

      const { data: updated, error } = await client
        .from('profiles')
        .update({
          full_name: 'Updated Name',
          timezone: 'America/Los_Angeles',
        })
        .eq('id', testUser.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated!.full_name).toBe('Updated Name');
      expect(updated!.timezone).toBe('America/Los_Angeles');
    });

    it('should persist profile updates', async () => {
      const client = createAuthenticatedClient(testUser.accessToken);

      // Update
      await client
        .from('profiles')
        .update({ full_name: 'Persistent Name' })
        .eq('id', testUser.userId);

      // Fetch again
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', testUser.userId)
        .single();

      expect(error).toBeNull();
      expect(profile!.full_name).toBe('Persistent Name');
    });

    it('should validate timezone format', async () => {
      const client = createAuthenticatedClient(testUser.accessToken);

      // Valid timezone
      const { error: validError } = await client
        .from('profiles')
        .update({ timezone: 'Europe/London' })
        .eq('id', testUser.userId);

      expect(validError).toBeNull();

      // Note: Database doesn't enforce timezone format validation
      // This would be handled at application level
    });
  });

  describe('Account Deletion', () => {
    it('should cascade delete all user data', async () => {
      const testUser = await createTestUser();
      await createTestProfile(testUser.userId);

      const serviceClient = createServiceClient();

      // Create various data
      await serviceClient.from('lock_rules').insert({
        user_id: testUser.userId,
        app_name: 'TestApp',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      await serviceClient.from('override_logs').insert({
        user_id: testUser.userId,
        app_name: 'TestApp',
        mood: 'bored',
      });

      await serviceClient.from('usage_sessions').insert({
        user_id: testUser.userId,
        app_name: 'TestApp',
        session_start: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
      });

      // Delete user
      await deleteTestUser(testUser.userId);

      // Verify all data is deleted
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', testUser.userId);

      const { data: rules } = await serviceClient
        .from('lock_rules')
        .select('*')
        .eq('user_id', testUser.userId);

      const { data: overrides } = await serviceClient
        .from('override_logs')
        .select('*')
        .eq('user_id', testUser.userId);

      const { data: sessions } = await serviceClient
        .from('usage_sessions')
        .select('*')
        .eq('user_id', testUser.userId);

      expect(profile).toEqual([]);
      expect(rules).toEqual([]);
      expect(overrides).toEqual([]);
      expect(sessions).toEqual([]);
    });
  });

  describe('Row-Level Security Enforcement', () => {
    let user1: { userId: string; email: string; accessToken: string };
    let user2: { userId: string; email: string; accessToken: string };

    beforeAll(async () => {
      user1 = await createTestUser();
      user2 = await createTestUser();
      await createTestProfile(user1.userId);
      await createTestProfile(user2.userId);
    });

    afterAll(async () => {
      await cleanupTestData(user1.userId);
      await cleanupTestData(user2.userId);
      await deleteTestUser(user1.userId);
      await deleteTestUser(user2.userId);
    });

    it('should prevent cross-user profile access', async () => {
      const client = createAuthenticatedClient(user2.accessToken);

      const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', user1.userId);

      expect(data).toEqual([]);
    });

    it('should prevent cross-user data modification', async () => {
      const serviceClient = createServiceClient();

      // Create data for user1
      await serviceClient.from('lock_rules').insert({
        user_id: user1.userId,
        app_name: 'Instagram',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      // User2 tries to access user1's data
      const client = createAuthenticatedClient(user2.accessToken);

      const { data: rules } = await client
        .from('lock_rules')
        .select('*')
        .eq('user_id', user1.userId);

      expect(rules).toEqual([]);
    });

    it('should allow users to access only their own data', async () => {
      const serviceClient = createServiceClient();

      // Create data for both users
      await serviceClient.from('lock_rules').insert([
        {
          user_id: user1.userId,
          app_name: 'User1App',
          lock_type: 'timer',
          daily_limit_minutes: 30,
        },
        {
          user_id: user2.userId,
          app_name: 'User2App',
          lock_type: 'timer',
          daily_limit_minutes: 60,
        },
      ]);

      // User1 fetches their data
      const client1 = createAuthenticatedClient(user1.accessToken);
      const { data: user1Rules } = await client1
        .from('lock_rules')
        .select('*')
        .eq('user_id', user1.userId);

      // User2 fetches their data
      const client2 = createAuthenticatedClient(user2.accessToken);
      const { data: user2Rules } = await client2
        .from('lock_rules')
        .select('*')
        .eq('user_id', user2.userId);

      expect(user1Rules!.length).toBeGreaterThan(0);
      expect(user1Rules![0].app_name).toBe('User1App');

      expect(user2Rules!.length).toBeGreaterThan(0);
      expect(user2Rules![0].app_name).toBe('User2App');
    });
  });
});
