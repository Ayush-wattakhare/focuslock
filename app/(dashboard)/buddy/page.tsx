// Buddy Page
// /buddy - Display buddy system with notifications and watched rules

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BuddyClient from './BuddyClient';

export default async function BuddyPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for buddy system
  if (!user) {
    redirect('/login');
  }

  // Fetch buddy relationships
  const { data: buddies } = await supabase
    .from('buddies')
    .select('*')
    .eq('user_id', user.id)
    .order('invited_at', { ascending: false });

  // Fetch user's lock rules
  const { data: lockRules } = await supabase
    .from('lock_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('app_name', { ascending: true });

  // Fetch buddy notifications
  const { data: notifications } = await supabase
    .from('buddy_notifications')
    .select(`
      *,
      from_user:profiles!buddy_notifications_from_user_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <BuddyClient
      user={user}
      buddies={buddies || []}
      lockRules={lockRules || []}
      notifications={notifications || []}
    />
  );
}
