// AI Coach Page
// /ai-coach - Display AI coaching insights with mood patterns

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AICoachClient from './AICoachClient';

export default async function AICoachPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for AI coaching
  if (!user) {
    redirect('/login');
  }

  return <AICoachClient user={user} />;
}
