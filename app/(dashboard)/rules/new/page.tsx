// Add Lock Rule Page
// Create new lock rule with RuleBuilder component (protected route)
// Requirements: 2.1-2.12

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddRuleClient from './AddRuleClient'

export default async function AddRulePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return <AddRuleClient />
}
