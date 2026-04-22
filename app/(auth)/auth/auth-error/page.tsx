// Auth Error Page
// Displayed when authentication fails

export default function AuthErrorPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1>Authentication Error</h1>
      <p>Sorry, we couldn&apos;t authenticate you. Please try again.</p>
      <a href="/" style={{ marginTop: '20px', color: '#0070f3' }}>
        Return to Home
      </a>
    </div>
  )
}
