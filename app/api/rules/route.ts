// Lock Rules API Routes
// GET /api/rules - Fetch all user rules
// POST /api/rules - Create new rule with validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLockRuleSchema } from '@/lib/validations/lockRules';
import type { LockRule } from '@/types/database';

// GET /api/rules - Fetch all lock rules for authenticated user
export async function GET() {
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

    // Fetch lock rules for the user
    const { data: rules, error } = await supabase
      .from('lock_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lock rules:', error);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch lock rules', details: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/rules:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// POST /api/rules - Create new lock rule
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
    const body = await request.json();
    const validation = createLockRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid lock rule data',
            details: validation.error.flatten()
          } 
        },
        { status: 400 }
      );
    }

    const ruleData = validation.data;

    // Create lock rule
    const { data: rule, error } = await supabase
      .from('lock_rules')
      .insert({
        user_id: user.id,
        app_name: ruleData.app_name,
        app_icon_url: ruleData.app_icon_url || null,
        app_scheme: ruleData.app_scheme || null,
        lock_type: ruleData.lock_type,
        daily_limit_minutes: ruleData.daily_limit_minutes || null,
        schedule_start: ruleData.schedule_start || null,
        schedule_end: ruleData.schedule_end || null,
        schedule_days: ruleData.schedule_days || null,
        unlock_date: ruleData.unlock_date || null,
        hide_from_home: ruleData.hide_from_home ?? true,
        hide_from_search: ruleData.hide_from_search ?? true,
        strict_mode: ruleData.strict_mode ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lock rule:', error);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create lock rule', details: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/rules:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
