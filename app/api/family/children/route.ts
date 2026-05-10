// Family Mode API - List Children
// GET /api/family/children - List all child accounts linked to parent

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Response interface
interface ChildInfo {
  id: string;
  child_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
  linked_at: string;
}

interface ChildrenResponse {
  children: ChildInfo[];
}

// GET /api/family/children - List all child accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Fetch child profiles linked to this parent
    const { data: childProfiles, error: childError } = await supabase
      .from('child_profiles')
      .select(`
        id,
        child_user_id,
        created_at,
        profiles!child_profiles_child_user_id_fkey (
          id,
          full_name,
          avatar_url,
          timezone,
          created_at
        )
      `)
      .eq('parent_user_id', user.id)
      .order('created_at', { ascending: false });

    if (childError) {
      console.error('Error fetching child profiles:', childError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch child accounts', 
            details: childError.message 
          } 
        },
        { status: 500 }
      );
    }

    // Transform the data to flatten the nested profile structure
    const children: ChildInfo[] = (childProfiles || []).map((cp: any) => {
      const profile = cp.profiles;
      return {
        id: cp.id,
        child_user_id: cp.child_user_id,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        timezone: profile?.timezone || 'Asia/Kolkata',
        created_at: profile?.created_at || cp.created_at,
        linked_at: cp.created_at,
      };
    });

    // Return success response
    const response: ChildrenResponse = {
      children,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/family/children:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
