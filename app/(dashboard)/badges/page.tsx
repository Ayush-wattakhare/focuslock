// Badges Page
// /badges - Display user's earned and locked badges with streak visualization

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BadgesClient from './BadgesClient';

export default async function BadgesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for badges
  if (!user) {
    redirect('/login');
  }

  // Fetch streak data
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fetch all badge definitions
  const { data: badgeDefinitions } = await supabase
    .from('badge_definitions')
    .select('*')
    .order('id', { ascending: true });

  // Fetch user's earned badges
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id);

  return (
    <BadgesClient
      user={user}
      streak={streak}
      badgeDefinitions={badgeDefinitions || []}
      userBadges={userBadges || []}
    />
  );
}
