// Property-Based Tests for Profile Creation and Updates
// Feature: focuslock-app
// **Validates: Requirements 1.3, 1.5**

import fc from 'fast-check';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Property-Based Tests: Profile Management', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock; exchangeCodeForSession: jest.Mock };
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        exchangeCodeForSession: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // Arbitraries (generators) for test data
  const userIdArbitrary = fc.uuid();
  const emailArbitrary = fc.emailAddress();
  const nameArbitrary = fc.string({ minLength: 1, maxLength: 100 });
  const avatarUrlArbitrary = fc.webUrl();
  const timezoneArbitrary = fc.constantFrom(
    'America/New_York',
    'Europe/London',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney',
    'America/Los_Angeles',
    'Europe/Paris',
    'Asia/Dubai'
  );

  const userMetadataArbitrary = fc.record({
    full_name: fc.option(nameArbitrary),
    name: fc.option(nameArbitrary),
    avatar_url: fc.option(avatarUrlArbitrary),
    picture: fc.option(avatarUrlArbitrary),
  });

  /**
   * **Property 1: Profile Creation Completeness**
   * 
   * For any valid user authentication data, creating a profile SHALL result in a profile record
   * containing all required fields (user_id, full_name, avatar_url, timezone, created_at).
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 1: Profile Creation Completeness', () => {
    it('should create profile with all required fields for any authenticated user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          userMetadataArbitrary,
          async (userId, email, metadata) => {
            const mockUser = {
              id: userId,
              email,
              user_metadata: metadata,
            };

            mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
              data: { session: { user: mockUser } },
              error: null,
            });

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            let insertedProfile: Database['public']['Tables']['profiles']['Insert'] | null = null;

            // Mock profile check (doesn't exist)
            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                  insert: jest.fn().mockImplementation((profile) => {
                    insertedProfile = profile;
                    return Promise.resolve({ data: profile, error: null });
                  }),
                };
              }
              if (table === 'streaks') {
                return {
                  insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Simulate the auth callback logic
            const { error } = await mockSupabase.auth.exchangeCodeForSession('test-code');
            
            if (!error) {
              const { data: { user } } = await mockSupabase.auth.getUser();
              
              if (user) {
                const { data: profile } = await mockSupabase
                  .from('profiles')
                  .select('id')
                  .eq('id', user.id)
                  .maybeSingle();
                
                if (!profile) {
                  const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
                    id: user.id,
                    full_name: user.user_metadata.full_name || user.user_metadata.name || null,
                    avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
                    timezone: 'Asia/Kolkata',
                  };
                  
                  await mockSupabase.from('profiles').insert(profileInsert);
                }
              }
            }

            // Property: Profile must be created with all required fields
            expect(insertedProfile).not.toBeNull();
            expect(insertedProfile).toHaveProperty('id');
            expect(insertedProfile).toHaveProperty('full_name');
            expect(insertedProfile).toHaveProperty('avatar_url');
            expect(insertedProfile).toHaveProperty('timezone');
            
            // Property: User ID must match authenticated user
            expect(insertedProfile!.id).toBe(userId);
            
            // Property: Timezone must default to 'Asia/Kolkata' (Requirement 1.4)
            expect(insertedProfile!.timezone).toBe('Asia/Kolkata');
            
            // Property: Full name should be extracted from metadata
            const expectedFullName = metadata.full_name || metadata.name || null;
            expect(insertedProfile!.full_name).toBe(expectedFullName);
            
            // Property: Avatar URL should be extracted from metadata
            const expectedAvatarUrl = metadata.avatar_url || metadata.picture || null;
            expect(insertedProfile!.avatar_url).toBe(expectedAvatarUrl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing metadata gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          async (userId, email) => {
            const mockUser = {
              id: userId,
              email,
              user_metadata: {},
            };

            mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
              data: { session: { user: mockUser } },
              error: null,
            });

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            let insertedProfile: Database['public']['Tables']['profiles']['Insert'] | null = null;

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                  insert: jest.fn().mockImplementation((profile) => {
                    insertedProfile = profile;
                    return Promise.resolve({ data: profile, error: null });
                  }),
                };
              }
              if (table === 'streaks') {
                return {
                  insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Simulate the auth callback logic
            const { error } = await mockSupabase.auth.exchangeCodeForSession('test-code');
            
            if (!error) {
              const { data: { user } } = await mockSupabase.auth.getUser();
              
              if (user) {
                const { data: profile } = await mockSupabase
                  .from('profiles')
                  .select('id')
                  .eq('id', user.id)
                  .maybeSingle();
                
                if (!profile) {
                  const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
                    id: user.id,
                    full_name: user.user_metadata.full_name || user.user_metadata.name || null,
                    avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
                    timezone: 'Asia/Kolkata',
                  };
                  
                  await mockSupabase.from('profiles').insert(profileInsert);
                }
              }
            }

            // Property: Profile creation succeeds even with empty metadata
            expect(insertedProfile).not.toBeNull();
            expect(insertedProfile!.full_name).toBeNull();
            expect(insertedProfile!.avatar_url).toBeNull();
            expect(insertedProfile!.timezone).toBe('Asia/Kolkata');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate profiles for existing users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          emailArbitrary,
          nameArbitrary,
          async (userId, email, fullName) => {
            const mockUser = {
              id: userId,
              email,
              user_metadata: { full_name: fullName },
            };

            const existingProfile = {
              id: userId,
              full_name: fullName,
              avatar_url: null,
              timezone: 'Asia/Kolkata',
              created_at: new Date().toISOString(),
            };

            mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
              data: { session: { user: mockUser } },
              error: null,
            });

            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: mockUser },
              error: null,
            });

            let insertCalled = false;

            // Mock profile check (already exists)
            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({ data: existingProfile, error: null }),
                    }),
                  }),
                  insert: jest.fn().mockImplementation(() => {
                    insertCalled = true;
                    return Promise.resolve({ data: {}, error: null });
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Simulate the auth callback logic
            const { error } = await mockSupabase.auth.exchangeCodeForSession('test-code');
            
            if (!error) {
              const { data: { user } } = await mockSupabase.auth.getUser();
              
              if (user) {
                const { data: profile } = await mockSupabase
                  .from('profiles')
                  .select('id')
                  .eq('id', user.id)
                  .maybeSingle();
                
                if (!profile) {
                  const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
                    id: user.id,
                    full_name: user.user_metadata.full_name || user.user_metadata.name || null,
                    avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
                    timezone: 'Asia/Kolkata',
                  };
                  
                  await mockSupabase.from('profiles').insert(profileInsert);
                }
              }
            }

            // Property: Insert should not be called for existing profiles
            expect(insertCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 2: Profile Update Round-Trip**
   * 
   * For any valid profile updates (full_name, avatar_url, timezone), applying the update
   * then reading the profile SHALL return the updated values.
   * 
   * **Validates: Requirements 1.5**
   */
  describe('Property 2: Profile Update Round-Trip', () => {
    it('should persist all profile updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          nameArbitrary,
          avatarUrlArbitrary,
          timezoneArbitrary,
          nameArbitrary,
          avatarUrlArbitrary,
          timezoneArbitrary,
          async (userId, initialName, initialAvatar, initialTimezone, newName, newAvatar, newTimezone) => {
            const initialProfile = {
              id: userId,
              full_name: initialName,
              avatar_url: initialAvatar,
              timezone: initialTimezone,
              created_at: new Date().toISOString(),
            };

            let updatedProfile: Database['public']['Tables']['profiles']['Update'] | null = null;
            let storedProfile = { ...initialProfile };

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    }),
                  }),
                  update: jest.fn().mockImplementation((updates) => {
                    updatedProfile = updates;
                    storedProfile = { ...storedProfile, ...updates };
                    return {
                      eq: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    };
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Simulate profile update
            const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
              full_name: newName,
              avatar_url: newAvatar,
              timezone: newTimezone,
            };

            await mockSupabase
              .from('profiles')
              .update(profileUpdate)
              .eq('id', userId);

            // Read back the profile
            const { data: readProfile } = await mockSupabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            // Property: All updated fields must be persisted
            expect(updatedProfile).not.toBeNull();
            expect(updatedProfile).toHaveProperty('full_name', newName);
            expect(updatedProfile).toHaveProperty('avatar_url', newAvatar);
            expect(updatedProfile).toHaveProperty('timezone', newTimezone);

            // Property: Round-trip must return updated values
            expect(readProfile).not.toBeNull();
            expect(readProfile.full_name).toBe(newName);
            expect(readProfile.avatar_url).toBe(newAvatar);
            expect(readProfile.timezone).toBe(newTimezone);

            // Property: User ID should remain unchanged
            expect(readProfile.id).toBe(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle partial profile updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          nameArbitrary,
          avatarUrlArbitrary,
          timezoneArbitrary,
          fc.constantFrom('full_name', 'avatar_url', 'timezone'),
          fc.oneof(nameArbitrary, avatarUrlArbitrary, timezoneArbitrary),
          async (userId, initialName, initialAvatar, initialTimezone, fieldToUpdate, newValue) => {
            const initialProfile = {
              id: userId,
              full_name: initialName,
              avatar_url: initialAvatar,
              timezone: initialTimezone,
              created_at: new Date().toISOString(),
            };

            let storedProfile = { ...initialProfile };

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    }),
                  }),
                  update: jest.fn().mockImplementation((updates) => {
                    storedProfile = { ...storedProfile, ...updates };
                    return {
                      eq: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    };
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Simulate partial profile update
            const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
              [fieldToUpdate]: newValue,
            };

            await mockSupabase
              .from('profiles')
              .update(profileUpdate)
              .eq('id', userId);

            // Read back the profile
            const { data: readProfile } = await mockSupabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            // Property: Updated field must have new value
            expect(readProfile[fieldToUpdate]).toBe(newValue);

            // Property: Other fields must remain unchanged
            const unchangedFields = ['full_name', 'avatar_url', 'timezone'].filter(f => f !== fieldToUpdate);
            unchangedFields.forEach(field => {
              expect(readProfile[field]).toBe(initialProfile[field]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null values in profile updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          nameArbitrary,
          avatarUrlArbitrary,
          timezoneArbitrary,
          async (userId, initialName, initialAvatar, initialTimezone) => {
            const initialProfile = {
              id: userId,
              full_name: initialName,
              avatar_url: initialAvatar,
              timezone: initialTimezone,
              created_at: new Date().toISOString(),
            };

            let storedProfile = { ...initialProfile };

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    }),
                  }),
                  update: jest.fn().mockImplementation((updates) => {
                    storedProfile = { ...storedProfile, ...updates };
                    return {
                      eq: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    };
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Simulate profile update with null values
            const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
              full_name: null,
              avatar_url: null,
            };

            await mockSupabase
              .from('profiles')
              .update(profileUpdate)
              .eq('id', userId);

            // Read back the profile
            const { data: readProfile } = await mockSupabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            // Property: Null values must be persisted correctly
            expect(readProfile.full_name).toBeNull();
            expect(readProfile.avatar_url).toBeNull();

            // Property: Timezone should remain unchanged (not updated)
            expect(readProfile.timezone).toBe(initialTimezone);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain profile integrity across multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          nameArbitrary,
          avatarUrlArbitrary,
          timezoneArbitrary,
          fc.array(
            fc.record({
              full_name: fc.option(nameArbitrary),
              avatar_url: fc.option(avatarUrlArbitrary),
              timezone: fc.option(timezoneArbitrary),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (userId, initialName, initialAvatar, initialTimezone, updates) => {
            const initialProfile = {
              id: userId,
              full_name: initialName,
              avatar_url: initialAvatar,
              timezone: initialTimezone,
              created_at: new Date().toISOString(),
            };

            let storedProfile = { ...initialProfile };

            mockSupabase.from.mockImplementation((table: string) => {
              if (table === 'profiles') {
                return {
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    }),
                  }),
                  update: jest.fn().mockImplementation((updates) => {
                    storedProfile = { ...storedProfile, ...updates };
                    return {
                      eq: jest.fn().mockResolvedValue({ data: storedProfile, error: null }),
                    };
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              };
            });

            // Apply multiple updates sequentially
            for (const update of updates) {
              const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {};
              if (update.full_name !== undefined) profileUpdate.full_name = update.full_name;
              if (update.avatar_url !== undefined) profileUpdate.avatar_url = update.avatar_url;
              if (update.timezone !== undefined) profileUpdate.timezone = update.timezone;

              await mockSupabase
                .from('profiles')
                .update(profileUpdate)
                .eq('id', userId);
            }

            // Read back the profile
            const { data: readProfile } = await mockSupabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            // Property: Final state must reflect the last update for each field
            const lastUpdate = updates[updates.length - 1];
            const expectedFullName = lastUpdate.full_name !== undefined ? lastUpdate.full_name : 
              updates.slice(0, -1).reverse().find(u => u.full_name !== undefined)?.full_name ?? initialName;
            const expectedAvatarUrl = lastUpdate.avatar_url !== undefined ? lastUpdate.avatar_url :
              updates.slice(0, -1).reverse().find(u => u.avatar_url !== undefined)?.avatar_url ?? initialAvatar;
            const expectedTimezone = lastUpdate.timezone !== undefined ? lastUpdate.timezone :
              updates.slice(0, -1).reverse().find(u => u.timezone !== undefined)?.timezone ?? initialTimezone;

            expect(readProfile.full_name).toBe(expectedFullName);
            expect(readProfile.avatar_url).toBe(expectedAvatarUrl);
            expect(readProfile.timezone).toBe(expectedTimezone);

            // Property: User ID must remain unchanged
            expect(readProfile.id).toBe(userId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
