// Statistics Dashboard Page
// /stats - Display weekly usage statistics and analytics

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StatsClient from './StatsClient';

export default async function StatsPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for statistics
  if (!user) {
    redirect('/login');
  }

  return <StatsClient user={user} />;
}
