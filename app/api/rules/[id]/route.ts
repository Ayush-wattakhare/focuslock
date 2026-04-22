// Lock Rules API Routes - Individual Rule Operations
// PUT /api/rules/[id] - Update rule
// DELETE /api/rules/[id] - Delete rule with cascade

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateLockRuleSchema } from '@/lib/validations/lockRules';

// PUT /api/rules/[id] - Update lock rule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ruleId = params.id;

    // Verify rule exists and belongs to user
    const { data: existingRule, error: fetchError } = await supabase
      .from('lock_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingRule) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Lock rule not found' } },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateLockRuleSchema.safeParse(body);

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

    const updateData = validation.data;

    // Update lock rule
    const { data: updatedRule, error: updateError } = await supabase
      .from('lock_rules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lock rule:', updateError);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to update lock rule', details: updateError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ rule: updatedRule });
  } catch (error) {
    console.error('Unexpected error in PUT /api/rules/[id]:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// DELETE /api/rules/[id] - Delete lock rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ruleId = params.id;

    // Verify rule exists and belongs to user
    const { data: existingRule, error: fetchError } = await supabase
      .from('lock_rules')
      .select('id')
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingRule) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Lock rule not found' } },
        { status: 404 }
      );
    }

    // Delete lock rule (cascade will set override_logs.lock_rule_id to NULL)
    const { error: deleteError } = await supabase
      .from('lock_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting lock rule:', deleteError);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to delete lock rule', details: deleteError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/rules/[id]:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
