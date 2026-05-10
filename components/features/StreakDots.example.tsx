/**
 * StreakDots Component Examples
 * 
 * This file demonstrates various usage scenarios for the StreakDots component.
 */

import StreakDots from './StreakDots';

export default function StreakDotsExamples() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5' }}>
      <h1 style={{ marginBottom: '40px', color: '#333' }}>StreakDots Component Examples</h1>

      {/* Example 1: New User (Zero Streak) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>1. New User (Zero Streak)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User just started, no streak yet. All dots are empty.
        </p>
        <StreakDots currentStreak={0} longestStreak={0} />
      </section>

      {/* Example 2: Building Streak (3 Days) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>2. Building Streak (3 Days)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User has maintained compliance for 3 consecutive days. Last 3 dots are filled.
        </p>
        <StreakDots currentStreak={3} longestStreak={5} />
      </section>

      {/* Example 3: Perfect Week (7 Days) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>3. Perfect Week (7 Days)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User has completed a full week without overrides. All 7 dots are filled.
        </p>
        <StreakDots currentStreak={7} longestStreak={7} />
      </section>

      {/* Example 4: Extended Streak (15 Days) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>4. Extended Streak (15 Days)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User has maintained a 15-day streak. All 7 dots are filled (showing last 7 days).
        </p>
        <StreakDots currentStreak={15} longestStreak={15} />
      </section>

      {/* Example 5: Long-term User (Current < Longest) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>5. Long-term User (Current 25, Longest 30)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User has a 25-day current streak but previously achieved 30 days. All dots filled.
        </p>
        <StreakDots currentStreak={25} longestStreak={30} />
      </section>

      {/* Example 6: After Breaking Streak */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>6. After Breaking Streak</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User broke their 30-day streak. Current is reset to 0, but longest is preserved.
        </p>
        <StreakDots currentStreak={0} longestStreak={30} />
      </section>

      {/* Example 7: Rebuilding After Break */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>7. Rebuilding After Break (2 Days)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User is rebuilding their streak after a break. 2 days compliant, longest still 30.
        </p>
        <StreakDots currentStreak={2} longestStreak={30} />
      </section>

      {/* Example 8: Impressive Achievement (100+ Days) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>8. Impressive Achievement (100+ Days)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User has achieved an impressive 100-day streak. All dots filled, large numbers displayed.
        </p>
        <StreakDots currentStreak={100} longestStreak={100} />
      </section>

      {/* Example 9: Single Day Streak */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>9. Single Day Streak</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User completed their first compliant day. Only the last dot is filled.
        </p>
        <StreakDots currentStreak={1} longestStreak={1} />
      </section>

      {/* Example 10: Almost Perfect Week (6 Days) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>10. Almost Perfect Week (6 Days)</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          User is one day away from completing a full week. 6 dots filled.
        </p>
        <StreakDots currentStreak={6} longestStreak={10} />
      </section>

      {/* Responsive Demo */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>11. Responsive Demo</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          Resize your browser window to see how the component adapts to different screen sizes.
        </p>
        <div style={{ maxWidth: '400px' }}>
          <StreakDots currentStreak={5} longestStreak={12} />
        </div>
      </section>

      {/* Side-by-Side Comparison */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px', color: '#666' }}>12. Side-by-Side Comparison</h2>
        <p style={{ marginBottom: '16px', color: '#888' }}>
          Compare different streak states side by side.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <StreakDots currentStreak={0} longestStreak={0} />
          <StreakDots currentStreak={3} longestStreak={5} />
          <StreakDots currentStreak={7} longestStreak={7} />
        </div>
      </section>
    </div>
  );
}
