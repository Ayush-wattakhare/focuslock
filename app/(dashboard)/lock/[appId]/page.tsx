import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LockScreenClient from './LockScreenClient';

/**
 * Lock Screen Page
 * 
 * Server component that fetches lock rule data and renders the lock screen
 * Displays countdown, lock reason, and override options
 * 
 * Requirements: 3.1-3.8, 4.1-4.6, 13.1-13.6
 * - 3.1-3.8: Display lock status with countdown
 * - 4.1-4.6: Emergency override with mood tracking
 * - 13.1-13.6: Nuclear mode handling (no override)
 */

interface LockPageProps {
  params: {
    appId: string;
  };
}

export default async function LockPage({ params }: LockPageProps) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user profile for timezone
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch the lock rule by ID
  const { data: rule, error: ruleError } = await supabase
    .from('lock_rules')
    .select('*')
    .eq('id', params.appId)
    .eq('user_id', user.id)
    .single();

  if (ruleError || !rule) {
    redirect('/dashboard');
  }

  // Fetch today's usage for this app
  const today = new Date().toISOString().split('T')[0];
  const { data: usageData } = await supabase
    .from('usage_sessions')
    .select('minutes_used')
    .eq('user_id', user.id)
    .eq('app_name', rule.app_name)
    .eq('date', today);

  const todayUsageMinutes = usageData?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;

  return (
    <LockScreenClient
      rule={rule}
      todayUsageMinutes={todayUsageMinutes}
      userTimezone={profile?.timezone || 'Asia/Kolkata'}
    />
  );
}
