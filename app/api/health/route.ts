// Health Check API Route
// This endpoint verifies that all required environment variables are configured

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      supabase: false,
      anthropic: false,
      appUrl: false,
    },
    errors: [] as string[],
  };

  // Check Supabase configuration
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      checks.errors.push('NEXT_PUBLIC_SUPABASE_URL is not set');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      checks.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      checks.errors.push('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    if (checks.errors.length === 0) {
      // Try to connect to Supabase
      const supabase = await createClient();
      const { error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        checks.errors.push(`Supabase connection error: ${error.message}`);
      } else {
        checks.checks.supabase = true;
      }
    }
  } catch (error) {
    checks.errors.push(`Supabase check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check Anthropic API configuration
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      checks.errors.push('ANTHROPIC_API_KEY is not set');
    } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      checks.errors.push('ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)');
    } else {
      checks.checks.anthropic = true;
    }
  } catch (error) {
    checks.errors.push(`Anthropic check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check App URL configuration
  try {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      checks.errors.push('NEXT_PUBLIC_APP_URL is not set');
    } else {
      checks.checks.appUrl = true;
    }
  } catch (error) {
    checks.errors.push(`App URL check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Determine overall status
  if (checks.errors.length > 0) {
    checks.status = 'error';
  } else if (Object.values(checks.checks).every(check => check === true)) {
    checks.status = 'ok';
  } else {
    checks.status = 'warning';
  }

  const statusCode = checks.status === 'ok' ? 200 : checks.status === 'warning' ? 200 : 500;

  return NextResponse.json(checks, { status: statusCode });
}
