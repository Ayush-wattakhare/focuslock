// Family Mode API - Add Child
// POST /api/family/add-child - Link child account to parent

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Request body interface
interface AddChildRequest {
  child_email: string;
}

// Response interface
interface AddChildResponse {
  child_profile: {
    id: string;
    parent_user_id: string;
    child_user_id: string;
    created_at: string;
  };
  child_info: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// POST /api/family/add-child - Link child account to parent
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body: AddChildRequest = await request.json();

    // Validate required fields
    if (!body.child_email) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required field: child_email' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.child_email)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid email format' 
          } 
        },
        { status: 400 }
      );
    }

    // Find child user by email
    const { data: childProfile, error: childError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', await getUserIdByEmail(supabase, body.child_email))
      .single();

    if (childError || !childProfile) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Child account not found. The user must have a FocusLock account.' 
          } 
        },
        { status: 404 }
      );
    }

    // Prevent linking to self
    if (childProfile.id === user.id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Cannot link your own account as a child' 
          } 
        },
        { status: 400 }
      );
    }

    // Check if child is already linked to another parent
    const { data: existingLink, error: linkCheckError } = await supabase
      .from('child_profiles')
      .select('parent_user_id')
      .eq('child_user_id', childProfile.id)
      .maybeSingle();

    if (linkCheckError) {
      console.error('Error checking existing child link:', linkCheckError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to check child account status', 
            details: linkCheckError.message 
          } 
        },
        { status: 500 }
      );
    }

    if (existingLink) {
      if (existingLink.parent_user_id === user.id) {
        return NextResponse.json(
          { 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: 'This child account is already linked to your account' 
            } 
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { 
            error: { 
              code: 'FORBIDDEN', 
              message: 'This child account is already linked to another parent' 
            } 
          },
          { status: 403 }
        );
      }
    }

    // Create child profile link
    const { data: childProfileLink, error: createError } = await supabase
      .from('child_profiles')
      .insert({
        parent_user_id: user.id,
        child_user_id: childProfile.id,
      })
      .select()
      .single();

    if (createError || !childProfileLink) {
      console.error('Error creating child profile link:', createError);
      return NextResponse.json(
        { 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to link child account', 
            details: createError?.message 
          } 
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: AddChildResponse = {
      child_profile: childProfileLink,
      child_info: {
        id: childProfile.id,
        full_name: childProfile.full_name,
        avatar_url: childProfile.avatar_url,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/family/add-child:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// Helper function to get user ID by email
async function getUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  // Query auth.users table using admin client
  // Note: This requires service role key for admin operations
  // For now, we'll use a workaround by querying profiles with a join
  
  // Since we can't directly query auth.users from client,
  // we need to use Supabase admin API or RPC function
  // For this implementation, we'll create an RPC function in the database
  
  const { data, error } = await supabase.rpc('get_user_id_by_email', {
    p_email: email
  });

  if (error) {
    console.error('Error getting user ID by email:', error);
    return null;
  }

  return data;
}
