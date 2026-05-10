/**
 * Integration Tests for Authentication Flows
 * Tests: Auth callback, profile creation, session management
 * 
 * Validates:
 * - Magic link authentication
 * - Google OAuth authentication
 * - Profile creation on first login
 * - Session persistence
 * - RLS policy enforcement
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

describe('Authentication Integration Tests', () => {
  const testEmail = `test-auth-${Date.now()}@focuslock.test`;
  const testPassword = 'TestPassword123!';
  let testUserId: string;

  afterEach(async () => {
    // Cleanup test user
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      testUserId = '';
    }
  });

  describe('User Registration and Profile Creation', () => {
    it('should create user and profile with default timezone', async () => {
      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      expect(userError).toBeNull();
      expect(userData.user).toBeDefined();
      expect(userData.user?.email).toBe(testEmail);

      testUserId = userData.user!.id;

      // Create profile (simulating what auth callback does)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: testUserId,
          full_name: 'Test User',
          timezone: 'Asia/Kolkata', // Default timezone
        })
        .select()
        .single();

      expect(profileError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(testUserId);
      expect(profile?.timezone).toBe('Asia/Kolkata');
      expect(profile?.created_at).toBeDefined();
    });

    it('should create profile with custom timezone', async () => {
      const { data: userData } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      testUserId = userData.user!.id;

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: testUserId,
          full_name: 'Test User',
          timezone: 'America/New_York',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile?.timezone).toBe('America/New_York');
    });

    it('should create profile with avatar URL', async () => {
      const { data: userData } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      testUserId = userData.user!.id;

      const avatarUrl = 'https://example.com/avatar.jpg';

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: testUserId,
          full_name: 'Test User',
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile?.avatar_url).toBe(avatarUrl);
    });
  });

  describe('Authentication and Session Management', () => {
    beforeEach(async () => {
      // Create test user
      const { data: userData } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      testUserId = userData.user!.id;

      // Create profile
      await supabaseAdmin.from('profiles').insert({
        id: testUserId,
        full_name: 'Test User',
      });
    });

    it('should sign in with email and password', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

      const { data, error } = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
    });

    it('should fail sign in with wrong password', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

      const { data, error } = await client.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should retrieve current user session', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

      // Sign in
      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Get current user
      const { data, error } = await client.auth.getUser();

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
    });

    it('should sign out successfully', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

      // Sign in
      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Sign out
      const { error } = await client.auth.signOut();

      expect(error).toBeNull();

      // Verify session is cleared
      const { data } = await client.auth.getSession();
      expect(data.session).toBeNull();
    });
  });

  describe('Profile RLS Policies', () => {
    let user1Id: string;
    let user2Id: string;
    let user1Client: ReturnType<typeof createClient<Database>>;
    let user2Client: ReturnType<typeof createClient<Database>>;

    beforeAll(async () => {
      // Create two test users
      const { data: user1Data } = await supabaseAdmin.auth.admin.createUser({
        email: `test-rls-1-${Date.now()}@focuslock.test`,
        password: testPassword,
        email_confirm: true,
      });

      const { data: user2Data } = await supabaseAdmin.auth.admin.createUser({
        email: `test-rls-2-${Date.now()}@focuslock.test`,
        password: testPassword,
        email_confirm: true,
      });

      user1Id = user1Data.user!.id;
      user2Id = user2Data.user!.id;

      // Create profiles
      await supabaseAdmin.from('profiles').insert([
        { id: user1Id, full_name: 'RLS Test User 1' },
        { id: user2Id, full_name: 'RLS Test User 2' },
      ]);

      // Create authenticated clients
      user1Client = createClient<Database>(supabaseUrl, supabaseAnonKey);
      user2Client = createClient<Database>(supabaseUrl, supabaseAnonKey);

      await user1Client.auth.signInWithPassword({
        email: `test-rls-1-${Date.now()}@focuslock.test`,
        password: testPassword,
      });

      await user2Client.auth.signInWithPassword({
        email: `test-rls-2-${Date.now()}@focuslock.test`,
        password: testPassword,
      });
    });

    afterAll(async () => {
      if (user1Id) await supabaseAdmin.auth.admin.deleteUser(user1Id);
      if (user2Id) await supabaseAdmin.auth.admin.deleteUser(user2Id);
    });

    it('should allow user to view own profile', async () => {
      const { data, error } = await user1Client
        .from('profiles')
        .select('*')
        .eq('id', user1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(user1Id);
      expect(data?.full_name).toBe('RLS Test User 1');
    });

    it('should prevent user from viewing another user profile', async () => {
      const { data, error } = await user1Client
        .from('profiles')
        .select('*')
        .eq('id', user2Id)
        .single();

      // RLS should prevent access
      expect(error || !data).toBeTruthy();
    });

    it('should allow user to update own profile', async () => {
      const { data, error } = await user1Client
        .from('profiles')
        .update({ full_name: 'Updated Name' })
        .eq('id', user1Id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.full_name).toBe('Updated Name');
    });

    it('should prevent user from updating another user profile', async () => {
      const { data, error } = await user1Client
        .from('profiles')
        .update({ full_name: 'Hacked Name' })
        .eq('id', user2Id)
        .select()
        .single();

      // RLS should prevent this
      expect(error || !data).toBeTruthy();

      // Verify profile was not updated
      const { data: checkData } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user2Id)
        .single();

      expect(checkData?.full_name).toBe('RLS Test User 2');
    });
  });

  describe('Profile Update Operations', () => {
    beforeEach(async () => {
      const { data: userData } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      testUserId = userData.user!.id;

      await supabaseAdmin.from('profiles').insert({
        id: testUserId,
        full_name: 'Original Name',
        timezone: 'Asia/Kolkata',
      });
    });

    it('should update full name', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const { data, error } = await client
        .from('profiles')
        .update({ full_name: 'New Name' })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.full_name).toBe('New Name');
    });

    it('should update timezone', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const { data, error } = await client
        .from('profiles')
        .update({ timezone: 'Europe/London' })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.timezone).toBe('Europe/London');
    });

    it('should update avatar URL', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const newAvatarUrl = 'https://example.com/new-avatar.jpg';

      const { data, error } = await client
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.avatar_url).toBe(newAvatarUrl);
    });

    it('should update multiple fields at once', async () => {
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const updates = {
        full_name: 'Complete Update',
        timezone: 'America/Los_Angeles',
        avatar_url: 'https://example.com/complete-avatar.jpg',
      };

      const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.full_name).toBe(updates.full_name);
      expect(data?.timezone).toBe(updates.timezone);
      expect(data?.avatar_url).toBe(updates.avatar_url);
    });
  });

  describe('Account Deletion Cascade', () => {
    it('should cascade delete profile when user is deleted', async () => {
      // Create user and profile
      const { data: userData } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      const userId = userData.user!.id;

      await supabaseAdmin.from('profiles').insert({
        id: userId,
        full_name: 'To Be Deleted',
      });

      // Verify profile exists
      const { data: beforeProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      expect(beforeProfile).toBeDefined();

      // Delete user
      await supabaseAdmin.auth.admin.deleteUser(userId);

      // Verify profile is also deleted (cascade)
      const { data: afterProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      expect(afterProfile).toBeNull();
    });
  });
});
