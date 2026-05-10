// Pomodoro Focus Page
// /focus - Start and manage Pomodoro sessions

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FocusClient from './FocusClient';

export default async function FocusPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for Pomodoro sessions
  if (!user) {
    redirect('/login');
  }

  // Check if there's an active Pomodoro session
  const { data: activeSession } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <FocusClient 
      user={user} 
      initialSession={activeSession}
    />
  );
}
