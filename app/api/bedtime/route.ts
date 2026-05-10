// Bedtime Settings API
// GET /api/bedtime - Fetch user's bedtime settings
// POST /api/bedtime - Create or update bedtime settings

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch bedtime settings
    const { data: settings, error } = await supabase
      .from('bedtime_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching bedtime settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bedtime settings' },
        { status: 500 }
      );
    }

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        settings: {
          user_id: user.id,
          is_enabled: false,
          weekday_bedtime: '22:00:00',
          weekday_waketime: '07:00:00',
          weekend_bedtime: '23:00:00',
          weekend_waketime: '08:00:00',
          compliance_streak: 0,
          last_compliance_date: null,
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Unexpected error in GET /api/bedtime:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const {
      is_enabled,
      weekday_bedtime,
      weekday_waketime,
      weekend_bedtime,
      weekend_waketime,
    } = body;

    if (
      typeof is_enabled !== 'boolean' ||
      !weekday_bedtime ||
      !weekday_waketime ||
      !weekend_bedtime ||
      !weekend_waketime
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert bedtime settings
    const { data: settings, error } = await supabase
      .from('bedtime_settings')
      .upsert({
        user_id: user.id,
        is_enabled,
        weekday_bedtime,
        weekday_waketime,
        weekend_bedtime,
        weekend_waketime,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting bedtime settings:', error);
      return NextResponse.json(
        { error: 'Failed to save bedtime settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Unexpected error in POST /api/bedtime:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
