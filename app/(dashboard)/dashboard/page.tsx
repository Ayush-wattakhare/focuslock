// Dashboard Page
// Main application dashboard (works with or without login)

import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // If user is logged in, fetch their data from Supabase
  if (user) {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // Fetch lock rules for the user
    const { data: rules } = await supabase
      .from('lock_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return (
      <DashboardClient 
        user={user} 
        profile={profile} 
        initialRules={rules || []} 
      />
    )
  }
  
  // Guest mode - data will be loaded from localStorage on client side
  return (
    <DashboardClient 
      user={null} 
      profile={null} 
      initialRules={[]} 
    />
  )
}
