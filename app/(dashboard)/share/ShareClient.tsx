'use client';

/**
 * ShareClient Component
 * 
 * Client-side component for the share page.
 * Fetches weekly stats from API and renders ShareCard component.
 * 
 * Requirements: 14.1-14.4
 * - 14.1: Generate shareable stats card with time saved and compliance %
 * - 14.2: Include current streak in share card
 * - 14.3: Add FocusLock watermark to share card
 * - 14.4: Support export to WhatsApp, Instagram, PNG download
 */

import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import ShareCard from '@/components/features/ShareCard';

interface ShareClientProps {
  user: User; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface ShareCardStats {
  timeSaved: number;
  compliancePercentage: number;
  currentStreak: number;
  watermark: string;
}

export default function ShareClient({ user }: ShareClientProps) {
  const [stats, setStats] = useState<ShareCardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/share-card');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching share card stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-container">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading your progress...</p>
          </div>
        </div>

        <style jsx>{`
          .share-page {
            min-height: 100vh;
            background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
            padding: 20px;
          }

          .share-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .loading-state p {
            color: #6b7280;
            font-size: 16px;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-page">
        <div className="share-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Unable to Load Stats</h2>
            <p>{error}</p>
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>

        <style jsx>{`
          .share-page {
            min-height: 100vh;
            background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
            padding: 20px;
          }

          .share-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
          }

          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .error-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }

          .error-state h2 {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin: 0 0 12px 0;
          }

          .error-state p {
            color: #6b7280;
            font-size: 16px;
            margin: 0 0 24px 0;
            max-width: 400px;
          }

          .retry-button {
            padding: 12px 24px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }

          .retry-button:hover {
            background: #5568d3;
          }

          .retry-button:active {
            transform: scale(0.98);
          }
        `}</style>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="share-page">
      <div className="share-container">
        <div className="page-header">
          <h1 className="page-title">Share Your Progress</h1>
          <p className="page-subtitle">
            Show off your achievements and inspire others to stay focused!
          </p>
        </div>

        <ShareCard stats={stats} />
      </div>

      <style jsx>{`
        .share-page {
          min-height: 100vh;
          background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
          padding: 20px;
        }

        .share-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-title {
          font-size: 36px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 12px 0;
        }

        .page-subtitle {
          font-size: 18px;
          color: #6b7280;
          margin: 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 640px) {
          .share-container {
            padding: 24px 16px;
          }

          .page-header {
            margin-bottom: 32px;
          }

          .page-title {
            font-size: 28px;
          }

          .page-subtitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
