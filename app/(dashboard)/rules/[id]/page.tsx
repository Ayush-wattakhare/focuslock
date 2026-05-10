// Edit Lock Rule Page
// Edit existing lock rule with RuleBuilder component (protected route)
// Requirements: 2.1-2.12

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditRuleClient from './EditRuleClient'

export default async function EditRulePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch the existing lock rule
  const { data: rule, error } = await supabase
    .from('lock_rules')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  // Redirect to dashboard if rule not found or unauthorized
  if (error || !rule) {
    redirect('/dashboard')
  }
  
  return <EditRuleClient initialRule={rule} />
}
