// Dashboard Page
// Main application dashboard (protected route)

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div style={{ padding: '40px' }}>
      <h1>Dashboard</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <p>Welcome, {(profile as any)?.full_name || user.email}!</p>
      <p>This is a protected route. You are authenticated.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>User Info:</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {JSON.stringify({ 
            id: user.id, 
            email: user.email,
            profile 
          }, null, 2)}
        </pre>
      </div>
      
      <form action="/auth/signout" method="post" style={{ marginTop: '20px' }}>
        <button 
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </form>
    </div>
  )
}
