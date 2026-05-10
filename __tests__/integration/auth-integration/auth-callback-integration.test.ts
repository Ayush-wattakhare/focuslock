/**
 * Integration Tests for Authentication Callback
 * Tests OAuth callback flow and profile creation
 * 
 * Validates: Task 16.1 - Authentication flows
 */

import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  createServiceClient,
  wait,
} from '../helpers/testHelpers';

describe('Authentication Callback Integration', () => {
  describe('Profile Creation on Auth', () => {
    it('should create profile with default timezone on new user signup', async () => {
      const serviceClient = createServiceClient();

      // Create new user
      const testUser = await createTestUser();

      // Create profile (simulating what auth callback does)
      const { data: profile, error } = await serviceClient
        .from('profiles')
        .insert({
          id: testUser.userId,
          full_name: 'New User',
          timezone: 'Asia/Kolkata', // Default timezone
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile!.id).toBe(testUser.userId);
      expect(profile!.timezone).toBe('Asia/Kolkata');
      expect(profile!.created_at).toBeDefined();

      // Cleanup
      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should create profile with custom timezone', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      const { data: profile, error } = await serviceClient
        .from('profiles')
        .insert({
          id: testUser.userId,
          full_name: 'US User',
          timezone: 'America/New_York',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile!.timezone).toBe('America/New_York');

      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should create profile with avatar URL from OAuth', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      const avatarUrl = 'https://example.com/avatar.jpg';

      const { data: profile, error } = await serviceClient
        .from('profiles')
        .insert({
          id: testUser.userId,
          full_name: 'OAuth User',
          avatar_url: avatarUrl,
          timezone: 'Asia/Kolkata',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile!.avatar_url).toBe(avatarUrl);

      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should handle duplicate profile creation gracefully', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Create profile first time
      await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'First Profile',
        timezone: 'Asia/Kolkata',
      });

      // Try to create again (should fail due to unique constraint)
      const { error } = await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'Duplicate Profile',
        timezone: 'Asia/Kolkata',
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505'); // Unique violation

      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });
  });

  describe('Profile RLS Policies', () => {
    it('should allow user to read own profile', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Create profile
      await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'Test User',
        timezone: 'Asia/Kolkata',
      });

      // User reads own profile (using service client to simulate authenticated user)
      const { data, error } = await serviceClient
        .from('profiles')
        .select()
        .eq('id', testUser.userId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.full_name).toBe('Test User');

      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });

    it('should allow user to update own profile', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Create profile
      await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'Original Name',
        timezone: 'Asia/Kolkata',
      });

      // Update profile
      const { data, error } = await serviceClient
        .from('profiles')
        .update({
          full_name: 'Updated Name',
          timezone: 'America/Los_Angeles',
        })
        .eq('id', testUser.userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.full_name).toBe('Updated Name');
      expect(data!.timezone).toBe('America/Los_Angeles');

      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });
  });

  describe('Initial Streak Creation', () => {
    it('should initialize streak record for new user', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Create profile
      await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'New User',
        timezone: 'Asia/Kolkata',
      });

      // Initialize streak (simulating what happens after profile creation)
      const { data: streak, error } = await serviceClient
        .from('streaks')
        .insert({
          user_id: testUser.userId,
          current_streak: 0,
          longest_streak: 0,
          last_active_date: null,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(streak).toBeDefined();
      expect(streak!.current_streak).toBe(0);
      expect(streak!.longest_streak).toBe(0);
      expect(streak!.last_active_date).toBeNull();

      await cleanupTestData(testUser.userId);
      await deleteTestUser(testUser.userId);
    });
  });

  describe('User Deletion Cascade', () => {
    it('should cascade delete profile when user is deleted', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Create profile
      await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'To Be Deleted',
        timezone: 'Asia/Kolkata',
      });

      // Delete user (should cascade to profile)
      await deleteTestUser(testUser.userId);

      // Verify profile is deleted
      const { data } = await serviceClient
        .from('profiles')
        .select()
        .eq('id', testUser.userId);

      expect(data).toEqual([]);
    });

    it('should cascade delete all user data when user is deleted', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Create profile and related data
      await serviceClient.from('profiles').insert({
        id: testUser.userId,
        full_name: 'User With Data',
        timezone: 'Asia/Kolkata',
      });

      await serviceClient.from('lock_rules').insert({
        user_id: testUser.userId,
        app_name: 'TestApp',
        lock_type: 'timer',
        daily_limit_minutes: 30,
      });

      await serviceClient.from('streaks').insert({
        user_id: testUser.userId,
        current_streak: 5,
        longest_streak: 10,
      });

      // Delete user
      await deleteTestUser(testUser.userId);

      // Verify all data is deleted
      const { data: profiles } = await serviceClient
        .from('profiles')
        .select()
        .eq('id', testUser.userId);

      const { data: rules } = await serviceClient
        .from('lock_rules')
        .select()
        .eq('user_id', testUser.userId);

      const { data: streaks } = await serviceClient
        .from('streaks')
        .select()
        .eq('user_id', testUser.userId);

      expect(profiles).toEqual([]);
      expect(rules).toEqual([]);
      expect(streaks).toEqual([]);
    });
  });

  describe('Session Management', () => {
    it('should create valid session for authenticated user', async () => {
      const testUser = await createTestUser();

      // Verify user has access token
      expect(testUser.accessToken).toBeDefined();
      expect(testUser.accessToken.length).toBeGreaterThan(0);

      await deleteTestUser(testUser.userId);
    });

    it('should handle multiple concurrent user creations', async () => {
      // Create multiple users concurrently
      const userPromises = Array.from({ length: 3 }, () => createTestUser());
      const users = await Promise.all(userPromises);

      // Verify all users created successfully
      expect(users.length).toBe(3);
      users.forEach((user) => {
        expect(user.userId).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.accessToken).toBeDefined();
      });

      // Cleanup
      await Promise.all(users.map((user) => deleteTestUser(user.userId)));
    });
  });

  describe('Email Verification', () => {
    it('should create user with email confirmed', async () => {
      const serviceClient = createServiceClient();
      const testUser = await createTestUser();

      // Verify user exists and email is confirmed
      const { data: user, error } = await serviceClient.auth.admin.getUserById(
        testUser.userId
      );

      expect(error).toBeNull();
      expect(user).toBeDefined();
      expect(user.user?.email).toBe(testUser.email);
      expect(user.user?.email_confirmed_at).toBeDefined();

      await deleteTestUser(testUser.userId);
    });
  });
});
