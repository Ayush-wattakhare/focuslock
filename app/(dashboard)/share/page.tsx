// Share Progress Page
// /share - Display shareable progress card with weekly stats

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ShareClient from './ShareClient';

export default async function SharePage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for share page
  if (!user) {
    redirect('/login');
  }

  return <ShareClient user={user} />;
}
