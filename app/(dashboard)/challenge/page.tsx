// Challenge Page
// /challenge - Display active weekly challenge progress

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChallengeClient from './ChallengeClient';

export default async function ChallengePage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Require authentication for challenge page
  if (!user) {
    redirect('/login');
  }

  // Fetch active challenge data from API
  // We'll use the API endpoint to get consistent data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/challenge/current`, {
      headers: {
        'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch challenge data');
    }

    const data = await response.json();

    return (
      <ChallengeClient
        user={user}
        challenge={data.challenge}
        progress={data.progress}
      />
    );
  } catch (error) {
    console.error('Error fetching challenge:', error);
    
    // Fallback: fetch directly from database
    const { data: challenge } = await supabase
      .from('weekly_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (
      <ChallengeClient
        user={user}
        challenge={challenge}
        progress={null}
      />
    );
  }
}
