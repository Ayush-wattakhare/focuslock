// Bedtime Mode Page
// /bedtime - Configure bedtime mode settings

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BedtimeClient from './BedtimeClient';

export default async function BedtimePage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for bedtime page
  if (!user) {
    redirect('/login');
  }

  // Fetch bedtime settings
  const { data: settings } = await supabase
    .from('bedtime_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Default settings if none exist
  const bedtimeSettings = settings || {
    user_id: user.id,
    is_enabled: false,
    weekday_bedtime: '22:00:00',
    weekday_waketime: '07:00:00',
    weekend_bedtime: '23:00:00',
    weekend_waketime: '08:00:00',
    compliance_streak: 0,
    last_compliance_date: null,
  };

  return <BedtimeClient user={user} initialSettings={bedtimeSettings} />;
}
