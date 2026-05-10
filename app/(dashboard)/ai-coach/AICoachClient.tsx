'use client';

/**
 * AI Coach Client Component
 * 
 * Displays AI coaching insights with mood pattern visualization.
 * 
 * Features:
 * - Fetches insights from POST /api/ai-coach endpoint
 * - Displays AIInsightCard component with mood patterns
 * - Shows actionable suggestions
 * - "Generate New Insights" button with rate limiting (1 request/hour)
 * - Loading and error states
 * 
 * Requirements: 10.1-10.8
 */

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import AIInsightCard from '@/components/features/AIInsightCard';

interface MoodBreakdown {
  mood: string;
  count: number;
}

interface AIInsights {
  insight: string;
  suggestion: string;
  topMood: string | null;
  moodBreakdown: MoodBreakdown[];
}

interface AICoachClientProps {
  user: User;
}

export default function AICoachClient({ }: AICoachClientProps) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function generateInsights() {
    try {
      setLoading(true);
      setError(null);
      setRateLimitMessage(null);

      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 })
      });

      if (response.status === 429) {
        // Rate limit exceeded
        const errorData = await response.json();
        setRateLimitMessage(errorData.error?.message || 'Rate limit exceeded. Please try again later.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate insights');
      }

      const data = await response.json();
      setInsights(data);
      setHasGenerated(true);
    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleActionClick() {
    // Navigate to rules page to create a new rule based on suggestion
    window.location.href = '/rules/new';
  }

  return (
    <div className="ai-coach-page">
      <div className="page-header">
        <h1>AI Coach</h1>
        <p>Get personalized insights based on your app usage patterns</p>
      </div>

      {/* Generate Insights Button */}
      {!hasGenerated && !loading && (
        <div className="welcome-section">
          <div className="welcome-icon">🤖</div>
          <h2>Welcome to AI Coach</h2>
          <p>
            Get personalized insights about your app usage patterns, mood triggers, 
            and actionable suggestions to improve your focus.
          </p>
          <button 
            onClick={generateInsights} 
            className="generate-button"
            disabled={loading}
          >
            Generate New Insights
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing your patterns...</p>
          <p className="loading-subtext">This may take a few moments</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Failed to Generate Insights</h2>
          <p>{error}</p>
          <button onClick={generateInsights} className="retry-button">
            Try Again
          </button>
        </div>
      )}

      {/* Rate Limit Message */}
      {rateLimitMessage && !loading && (
        <div className="rate-limit-state">
          <div className="rate-limit-icon">⏱️</div>
          <h2>Rate Limit Reached</h2>
          <p>{rateLimitMessage}</p>
          <p className="rate-limit-info">
            You can generate new insights once per hour to ensure quality analysis.
          </p>
        </div>
      )}

      {/* Insights Display */}
      {insights && !loading && (
        <div className="insights-container">
          <AIInsightCard
            insight={insights.insight}
            suggestion={insights.suggestion}
            topMood={insights.topMood}
            moodBreakdown={insights.moodBreakdown}
            onActionClick={handleActionClick}
          />

          {/* Regenerate Button */}
          <div className="regenerate-section">
            <button 
              onClick={generateInsights} 
              className="regenerate-button"
              disabled={loading}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M1 4V10H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 20V14H17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.49 9C19.9828 7.56678 19.1209 6.28536 17.9845 5.27542C16.8482 4.26548 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7147 4.01717 16.4332 3.51 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate New Insights
            </button>
            <p className="regenerate-info">
              Limited to 1 request per hour for quality analysis
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .ai-coach-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .page-header h1 {
          font-size: 36px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .page-header p {
          font-size: 16px;
          color: #6b7280;
          margin: 0;
        }

        .welcome-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 48px 32px;
          text-align: center;
        }

        .welcome-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .welcome-section h2 {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 12px 0;
        }

        .welcome-section p {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 32px 0;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .generate-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 32px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .generate-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .generate-button:active {
          transform: translateY(0);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 15px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p {
          font-size: 16px;
          color: #374151;
          font-weight: 500;
          margin: 0;
        }

        .loading-subtext {
          font-size: 14px !important;
          color: #6b7280 !important;
          font-weight: 400 !important;
        }

        .error-state,
        .rate-limit-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 15px;
          text-align: center;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .error-icon,
        .rate-limit-icon {
          font-size: 48px;
        }

        .error-state h2,
        .rate-limit-state h2 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .error-state p,
        .rate-limit-state p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          max-width: 400px;
        }

        .rate-limit-info {
          font-size: 13px !important;
          color: #9ca3af !important;
          font-style: italic;
        }

        .retry-button {
          margin-top: 10px;
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .retry-button:hover {
          background: #2563eb;
        }

        .insights-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .regenerate-section {
          text-align: center;
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .regenerate-button {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .regenerate-button:hover {
          background: #f8f9ff;
          transform: translateY(-1px);
        }

        .regenerate-button:active {
          transform: translateY(0);
        }

        .regenerate-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .regenerate-info {
          margin-top: 12px;
          font-size: 13px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .ai-coach-page {
            padding: 15px;
          }

          .page-header h1 {
            font-size: 28px;
          }

          .page-header p {
            font-size: 14px;
          }

          .welcome-section {
            padding: 36px 24px;
          }

          .welcome-icon {
            font-size: 48px;
          }

          .welcome-section h2 {
            font-size: 20px;
          }

          .welcome-section p {
            font-size: 14px;
          }

          .generate-button {
            padding: 12px 28px;
            font-size: 15px;
          }

          .loading-state {
            padding: 60px 20px;
          }

          .spinner {
            width: 40px;
            height: 40px;
          }

          .regenerate-section {
            padding: 20px;
          }

          .regenerate-button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .page-header h1 {
            font-size: 24px;
          }

          .welcome-section {
            padding: 28px 20px;
          }

          .welcome-section h2 {
            font-size: 18px;
          }

          .welcome-section p {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
