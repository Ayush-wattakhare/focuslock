'use client';

/**
 * AIInsightCard Component
 * 
 * Displays Claude-generated AI coaching insights with mood pattern visualization.
 * 
 * Features:
 * - Displays key insight (2 sentences max)
 * - Shows actionable suggestion with CTA button
 * - Mood pattern visualization (bar chart)
 * - Responsive design
 * - Accessible keyboard navigation
 * 
 * Requirements: 10.1-10.8
 * - 10.1: Display Claude-generated insights
 * - 10.2: Show one key insight (2 sentences max)
 * - 10.3: Show one specific actionable suggestion
 * - 10.4: Display most common mood trigger
 * - 10.5: Mood pattern visualization
 * - 10.6: Warm, non-judgmental tone
 * - 10.7: CTA button for actionable suggestion
 * - 10.8: Accessible and responsive design
 */

interface MoodBreakdown {
  mood: string;
  count: number;
}

interface AIInsightCardProps {
  insight: string;
  suggestion: string;
  topMood: string | null;
  moodBreakdown: MoodBreakdown[];
  onActionClick?: () => void;
}

// Mood emoji mapping for visual representation
const MOOD_EMOJIS: Record<string, string> = {
  bored: '😐',
  stressed: '😰',
  tired: '😴',
  news: '📰',
  other: '🤔'
};

// Mood color mapping for chart
const MOOD_COLORS: Record<string, string> = {
  bored: '#94a3b8',
  stressed: '#ef4444',
  tired: '#8b5cf6',
  news: '#3b82f6',
  other: '#6b7280'
};

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function AIInsightCard({
  insight,
  suggestion,
  topMood,
  moodBreakdown,
  onActionClick
}: AIInsightCardProps) {
  // Calculate max count for chart scaling
  const maxCount = Math.max(...moodBreakdown.map(m => m.count), 1);

  return (
    <div className="ai-insight-card" role="article" aria-label="AI Coaching Insights">
      {/* Header */}
      <div className="card-header">
        <div className="header-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="card-title">AI Coach Insights</h2>
      </div>

      {/* Key Insight - Requirement 10.2 */}
      <div className="insight-section">
        <h3 className="section-label">Key Insight</h3>
        <p className="insight-text">{insight}</p>
      </div>

      {/* Mood Pattern Visualization - Requirements 10.4, 10.5 */}
      {moodBreakdown.length > 0 && (
        <div className="mood-section">
          <h3 className="section-label">
            Mood Patterns
            {topMood && (
              <span className="top-mood-badge">
                <span className="mood-emoji" aria-hidden="true">
                  {MOOD_EMOJIS[topMood] || '🤔'}
                </span>
                <span className="mood-label">
                  Most common: {capitalize(topMood)}
                </span>
              </span>
            )}
          </h3>
          
          <div className="mood-chart" role="img" aria-label="Mood pattern bar chart">
            {moodBreakdown.map((mood) => {
              const percentage = (mood.count / maxCount) * 100;
              const color = MOOD_COLORS[mood.mood] || MOOD_COLORS.other;
              
              return (
                <div key={mood.mood} className="mood-bar-container">
                  <div className="mood-bar-label">
                    <span className="mood-emoji" aria-hidden="true">
                      {MOOD_EMOJIS[mood.mood] || '🤔'}
                    </span>
                    <span className="mood-name">{capitalize(mood.mood)}</span>
                  </div>
                  <div className="mood-bar-wrapper">
                    <div
                      className="mood-bar"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color
                      }}
                      role="progressbar"
                      aria-valuenow={mood.count}
                      aria-valuemin={0}
                      aria-valuemax={maxCount}
                      aria-label={`${capitalize(mood.mood)}: ${mood.count} times`}
                    >
                      <span className="mood-count">{mood.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actionable Suggestion - Requirements 10.3, 10.7 */}
      <div className="suggestion-section">
        <h3 className="section-label">Suggested Action</h3>
        <p className="suggestion-text">{suggestion}</p>
        
        {onActionClick && (
          <button
            className="action-button"
            onClick={onActionClick}
            aria-label="Take action on suggestion"
          >
            <span>Take Action</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        .ai-insight-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
          max-width: 600px;
          margin: 0 auto;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .card-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          color: white;
        }

        .insight-section,
        .mood-section,
        .suggestion-section {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .suggestion-section {
          margin-bottom: 0;
        }

        .section-label {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .insight-text,
        .suggestion-text {
          font-size: 16px;
          line-height: 1.6;
          margin: 0;
          color: white;
        }

        .top-mood-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: none;
          letter-spacing: normal;
        }

        .mood-emoji {
          font-size: 16px;
          line-height: 1;
        }

        .mood-label {
          color: white;
        }

        .mood-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mood-bar-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mood-bar-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: white;
        }

        .mood-name {
          min-width: 80px;
        }

        .mood-bar-wrapper {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          height: 32px;
          overflow: hidden;
        }

        .mood-bar {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          border-radius: 8px;
          transition: width 0.6s ease;
          min-width: 40px;
        }

        .mood-count {
          font-size: 13px;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .action-button {
          margin-top: 16px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .action-button:hover {
          background: #f8f9ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .action-button:active {
          transform: translateY(0);
        }

        .action-button:focus {
          outline: 2px solid white;
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .ai-insight-card {
            padding: 20px;
            border-radius: 12px;
          }

          .card-title {
            font-size: 20px;
          }

          .header-icon {
            width: 36px;
            height: 36px;
          }

          .insight-section,
          .mood-section,
          .suggestion-section {
            padding: 16px;
          }

          .insight-text,
          .suggestion-text {
            font-size: 15px;
          }

          .section-label {
            font-size: 13px;
          }

          .top-mood-badge {
            font-size: 11px;
            padding: 3px 10px;
          }

          .mood-bar-wrapper {
            height: 28px;
          }

          .mood-count {
            font-size: 12px;
          }

          .action-button {
            width: 100%;
            justify-content: center;
            padding: 14px 24px;
          }
        }

        @media (max-width: 480px) {
          .ai-insight-card {
            padding: 16px;
          }

          .card-title {
            font-size: 18px;
          }

          .insight-text,
          .suggestion-text {
            font-size: 14px;
          }

          .mood-bar-label {
            font-size: 13px;
          }

          .mood-name {
            min-width: 70px;
          }
        }
      `}</style>
    </div>
  );
}
