// Family Mode Page
// Parent dashboard for managing child accounts

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FamilyClient from './FamilyClient'

export default async function FamilyPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Require authentication
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Fetch child accounts
  const { data: children } = await supabase
    .from('child_profiles')
    .select(`
      id,
      child_user_id,
      created_at,
      profiles!child_profiles_child_user_id_fkey (
        id,
        full_name,
        avatar_url,
        timezone,
        created_at
      )
    `)
    .eq('parent_user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <FamilyClient 
      user={user} 
      profile={profile} 
      initialChildren={children || []} 
    />
  )
}
