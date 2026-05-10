/**
 * Example usage of CountdownRing component
 * 
 * This file demonstrates how to use the CountdownRing component
 * in different scenarios.
 */

import CountdownRing from './CountdownRing';

// Example 1: Timer lock - unlocks at midnight
export function TimerLockExample() {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  return (
    <div>
      <h2>Timer Lock Example</h2>
      <p>Daily limit reached. Unlocks at midnight.</p>
      <CountdownRing unlocksAt={midnight} lockType="timer" />
    </div>
  );
}

// Example 2: Schedule lock - unlocks at 6 PM
export function ScheduleLockExample() {
  const sixPM = new Date();
  sixPM.setHours(18, 0, 0, 0);

  return (
    <div>
      <h2>Schedule Lock Example</h2>
      <p>Locked during work hours. Unlocks at 6:00 PM.</p>
      <CountdownRing unlocksAt={sixPM} lockType="schedule" />
    </div>
  );
}

// Example 3: Until date lock - unlocks on specific date
export function UntilDateLockExample() {
  const unlockDate = new Date('2024-02-01T00:00:00');

  return (
    <div>
      <h2>Until Date Lock Example</h2>
      <p>Locked until February 1st, 2024.</p>
      <CountdownRing unlocksAt={unlockDate} lockType="until_date" />
    </div>
  );
}

// Example 4: Nuclear lock - no unlock time
export function NuclearLockExample() {
  const farFuture = new Date('2025-01-01T00:00:00');

  return (
    <div>
      <h2>Nuclear Lock Example</h2>
      <p>Permanently locked. No override possible.</p>
      <CountdownRing unlocksAt={farFuture} lockType="nuclear" />
    </div>
  );
}

// Example 5: Integration with lock screen
export function LockScreenExample() {
  const unlocksAt = new Date();
  unlocksAt.setHours(unlocksAt.getHours() + 2); // Unlocks in 2 hours

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1>Instagram is Locked</h1>
      <CountdownRing unlocksAt={unlocksAt} lockType="timer" />
      <p style={{ marginTop: '20px', fontSize: '18px' }}>
        Take a break and come back later!
      </p>
      <button style={{
        marginTop: '30px',
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.2)',
        border: '2px solid white',
        borderRadius: '8px',
        color: 'white',
        fontSize: '16px',
        cursor: 'pointer'
      }}>
        Emergency Override
      </button>
    </div>
  );
}

// Example 6: Multiple countdowns in a grid
export function MultipleCountdownsExample() {
  const apps = [
    { name: 'Instagram', unlocksAt: new Date(Date.now() + 3600000), lockType: 'timer' as const },
    { name: 'YouTube', unlocksAt: new Date(Date.now() + 7200000), lockType: 'schedule' as const },
    { name: 'TikTok', unlocksAt: new Date(Date.now() + 86400000), lockType: 'until_date' as const },
    { name: 'Twitter', unlocksAt: new Date(Date.now() + 31536000000), lockType: 'nuclear' as const },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h2>All Locked Apps</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        {apps.map(app => (
          <div key={app.name} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>{app.name}</h3>
            <CountdownRing unlocksAt={app.unlocksAt} lockType={app.lockType} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 7: Responsive countdown with custom styling
export function ResponsiveCountdownExample() {
  const unlocksAt = new Date();
  unlocksAt.setMinutes(unlocksAt.getMinutes() + 45);

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff5f5',
        border: '2px solid #ef5350',
        borderRadius: '16px',
        padding: '30px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#d32f2f', marginBottom: '10px' }}>
          Focus Time Active
        </h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Stay focused! Your apps will unlock soon.
        </p>
        <CountdownRing unlocksAt={unlocksAt} lockType="timer" />
        <p style={{ 
          marginTop: '20px', 
          fontSize: '14px', 
          color: '#999' 
        }}>
          Tip: Use this time to work on your goals!
        </p>
      </div>
    </div>
  );
}
