/**
 * AIInsightCard Component Examples
 * 
 * This file demonstrates various usage scenarios for the AIInsightCard component.
 */

import AIInsightCard from './AIInsightCard';

// Example 1: Full insights with mood data
export function FullInsightsExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 1: Full Insights with Mood Data</h2>
      <AIInsightCard
        insight="You tend to override locks most often in the evening, especially around 8-9 PM. This pattern suggests you're using apps as a wind-down activity."
        suggestion="Try scheduling a 10-minute walk or reading session at 8 PM instead of reaching for your phone."
        topMood="stressed"
        moodBreakdown={[
          { mood: 'stressed', count: 12 },
          { mood: 'bored', count: 8 },
          { mood: 'tired', count: 5 },
          { mood: 'news', count: 3 }
        ]}
        onActionClick={() => alert('Navigating to create new rule...')}
      />
    </div>
  );
}

// Example 2: No overrides (success case)
export function NoOverridesExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 2: No Overrides (Success Case)</h2>
      <AIInsightCard
        insight="Great job! You haven't overridden any locks this week."
        suggestion="Keep up the momentum by setting a new challenge for next week."
        topMood={null}
        moodBreakdown={[]}
        onActionClick={() => alert('Navigating to challenges...')}
      />
    </div>
  );
}

// Example 3: Single mood trigger
export function SingleMoodExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 3: Single Mood Trigger</h2>
      <AIInsightCard
        insight="Boredom seems to be your primary trigger for overriding locks. You've consistently reached for apps when feeling understimulated."
        suggestion="Create a 'boredom buster' list with 5 offline activities you enjoy, and try one before unlocking an app."
        topMood="bored"
        moodBreakdown={[
          { mood: 'bored', count: 15 }
        ]}
      />
    </div>
  );
}

// Example 4: Stress-focused insight
export function StressFocusedExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 4: Stress-Focused Insight</h2>
      <AIInsightCard
        insight="Stress is your main trigger, with most overrides happening during work hours. You're using social media as a coping mechanism."
        suggestion="Try the 5-4-3-2-1 grounding technique when stressed: identify 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste."
        topMood="stressed"
        moodBreakdown={[
          { mood: 'stressed', count: 18 },
          { mood: 'tired', count: 4 },
          { mood: 'other', count: 2 }
        ]}
        onActionClick={() => alert('Opening stress management resources...')}
      />
    </div>
  );
}

// Example 5: Evening pattern
export function EveningPatternExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 5: Evening Pattern</h2>
      <AIInsightCard
        insight="Your overrides cluster between 9 PM and midnight, often when you're tired. Late-night scrolling is disrupting your sleep schedule."
        suggestion="Set a bedtime mode for 9 PM and replace phone time with a 15-minute wind-down routine like journaling or stretching."
        topMood="tired"
        moodBreakdown={[
          { mood: 'tired', count: 14 },
          { mood: 'bored', count: 6 },
          { mood: 'stressed', count: 3 }
        ]}
        onActionClick={() => alert('Setting up bedtime mode...')}
      />
    </div>
  );
}

// Example 6: News addiction pattern
export function NewsAddictionExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 6: News Addiction Pattern</h2>
      <AIInsightCard
        insight="You're frequently checking news apps throughout the day, creating an anxiety loop. This constant information seeking is affecting your focus."
        suggestion="Limit news consumption to two specific times per day (morning and evening) and use a dedicated news app with a timer."
        topMood="news"
        moodBreakdown={[
          { mood: 'news', count: 20 },
          { mood: 'stressed', count: 5 },
          { mood: 'other', count: 2 }
        ]}
      />
    </div>
  );
}

// Example 7: Balanced mood distribution
export function BalancedMoodExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 7: Balanced Mood Distribution</h2>
      <AIInsightCard
        insight="Your override triggers are varied, suggesting situational rather than habitual usage. You're making conscious decisions about when to unlock apps."
        suggestion="Continue this mindful approach and consider journaling about what makes certain overrides feel necessary versus impulsive."
        topMood="bored"
        moodBreakdown={[
          { mood: 'bored', count: 6 },
          { mood: 'stressed', count: 5 },
          { mood: 'tired', count: 5 },
          { mood: 'news', count: 4 },
          { mood: 'other', count: 3 }
        ]}
        onActionClick={() => alert('Opening journaling feature...')}
      />
    </div>
  );
}

// Example 8: Without action button
export function WithoutActionButtonExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 8: Without Action Button</h2>
      <AIInsightCard
        insight="You've made significant progress this week, reducing overrides by 40% compared to last week."
        suggestion="Maintain this momentum by reviewing your lock rules and adjusting them based on what's working."
        topMood="stressed"
        moodBreakdown={[
          { mood: 'stressed', count: 8 },
          { mood: 'bored', count: 4 }
        ]}
      />
    </div>
  );
}

// Example 9: Mobile view simulation
export function MobileViewExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5', maxWidth: '375px' }}>
      <h2>Example 9: Mobile View</h2>
      <AIInsightCard
        insight="Weekend overrides are 3x higher than weekdays. You're maintaining discipline during the work week but struggling on Saturdays and Sundays."
        suggestion="Create weekend-specific rules with more flexible schedules that account for leisure time while still maintaining boundaries."
        topMood="bored"
        moodBreakdown={[
          { mood: 'bored', count: 10 },
          { mood: 'tired', count: 5 }
        ]}
        onActionClick={() => alert('Creating weekend rules...')}
      />
    </div>
  );
}

// Example 10: All moods represented
export function AllMoodsExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 10: All Moods Represented</h2>
      <AIInsightCard
        insight="Your override patterns show diverse emotional triggers across all mood categories. This suggests you're using apps to regulate various emotional states."
        suggestion="Develop mood-specific coping strategies: exercise for stress, creative hobbies for boredom, and relaxation techniques for tiredness."
        topMood="stressed"
        moodBreakdown={[
          { mood: 'stressed', count: 15 },
          { mood: 'bored', count: 12 },
          { mood: 'tired', count: 10 },
          { mood: 'news', count: 8 },
          { mood: 'other', count: 5 }
        ]}
        onActionClick={() => alert('Opening mood management guide...')}
      />
    </div>
  );
}

// Example 11: Minimal overrides
export function MinimalOverridesExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 11: Minimal Overrides</h2>
      <AIInsightCard
        insight="You've only overridden locks twice this week, both times due to stress. You're demonstrating excellent self-control."
        suggestion="Consider sharing your success strategy with an accountability buddy to help them achieve similar results."
        topMood="stressed"
        moodBreakdown={[
          { mood: 'stressed', count: 2 }
        ]}
        onActionClick={() => alert('Inviting accountability buddy...')}
      />
    </div>
  );
}

// Example 12: Long insight text
export function LongInsightExample() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Example 12: Long Insight Text</h2>
      <AIInsightCard
        insight="Your override patterns reveal a strong correlation between work stress and social media usage, particularly during afternoon hours when energy levels naturally dip. This suggests you're using apps as a mental break rather than for entertainment."
        suggestion="Instead of reaching for your phone during afternoon slumps, try a 5-minute desk stretch routine or a quick walk around the block to reset your focus without the dopamine spike from social media."
        topMood="stressed"
        moodBreakdown={[
          { mood: 'stressed', count: 16 },
          { mood: 'tired', count: 7 },
          { mood: 'bored', count: 3 }
        ]}
        onActionClick={() => alert('Setting up afternoon break reminders...')}
      />
    </div>
  );
}

// Demo page showing all examples
export default function AIInsightCardExamples() {
  return (
    <div style={{ padding: '40px', background: '#e5e7eb' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>
        AIInsightCard Component Examples
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <FullInsightsExample />
        <NoOverridesExample />
        <SingleMoodExample />
        <StressFocusedExample />
        <EveningPatternExample />
        <NewsAddictionExample />
        <BalancedMoodExample />
        <WithoutActionButtonExample />
        <MobileViewExample />
        <AllMoodsExample />
        <MinimalOverridesExample />
        <LongInsightExample />
      </div>
    </div>
  );
}
